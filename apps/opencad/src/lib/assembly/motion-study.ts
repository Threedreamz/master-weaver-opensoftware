/**
 * Motion Study — Fusion-style keyframed timeline for opencad assemblies.
 *
 * A MotionStudy drives mate values over time so an assembly animates through
 * a range of poses. Pure JS, deterministic, no side-effects.
 */

export type InterpolationKind = 'linear' | 'ease-in-out' | 'step'

/**
 * One keyframe: at time t (seconds), override the `value` field of specified mates.
 * E.g. sweep a hinge-angle mate from 0 to 90 over 2 seconds.
 */
export interface Keyframe {
  /** seconds */
  t: number
  /** mateId -> value (mm for distance, degrees for angle) */
  mateValueOverrides: Record<string, number>
}

export interface MotionStudy {
  id: string
  name: string
  durationSec: number
  /** Must include t=0 and t=durationSec. */
  keyframes: Keyframe[]
  /** Default 'linear'. */
  interpolation?: InterpolationKind
  /** Default false. */
  loop?: boolean
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function collectAllMateIds(keyframes: Keyframe[]): string[] {
  const ids = new Set<string>()
  for (const kf of keyframes) {
    for (const id of Object.keys(kf.mateValueOverrides)) ids.add(id)
  }
  return Array.from(ids)
}

/**
 * For a given mateId and time t, find the bracketing keyframes (a, b) such
 * that a.t <= t <= b.t AND both keyframes explicitly define this mate.
 * If the mate isn't defined by any keyframe <= t, returns null for `a`.
 * If the mate isn't defined by any keyframe >= t, returns null for `b`.
 *
 * This implements "hold-last" semantics: missing mates in a keyframe carry
 * their previous value forward.
 */
function bracketForMate(
  sortedKeyframes: Keyframe[],
  mateId: string,
  t: number,
): { a: Keyframe | null; b: Keyframe | null } {
  let a: Keyframe | null = null
  let b: Keyframe | null = null

  for (const kf of sortedKeyframes) {
    if (!(mateId in kf.mateValueOverrides)) continue
    if (kf.t <= t) {
      a = kf
    } else {
      b = kf
      break
    }
  }

  return { a, b }
}

function interpolateValue(
  kind: InterpolationKind,
  a: number,
  b: number,
  u: number,
): number {
  switch (kind) {
    case 'step':
      return u >= 1 ? b : a
    case 'ease-in-out': {
      const s = u * u * (3 - 2 * u)
      return a + (b - a) * s
    }
    case 'linear':
    default:
      return a + (b - a) * u
  }
}

function normalizeTime(study: MotionStudy, t: number): number {
  const duration = study.durationSec
  if (study.loop) {
    if (duration <= 0) return 0
    // modulo wrap — handle negatives too
    let wrapped = t % duration
    if (wrapped < 0) wrapped += duration
    return wrapped
  }
  // clamp
  if (t < 0) return 0
  if (t > duration) return duration
  return t
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Interpolate mate values at time t. For t outside [0, duration]:
 *   loop=false: clamp to [0, duration].
 *   loop=true:  modulo wrap.
 */
export function sampleMotionStudy(
  study: MotionStudy,
  t: number,
): Record<string, number> {
  const kind = study.interpolation ?? 'linear'
  const sortedKeyframes = [...study.keyframes].sort((x, y) => x.t - y.t)
  const effectiveT = normalizeTime(study, t)
  const mateIds = collectAllMateIds(sortedKeyframes)

  const out: Record<string, number> = {}

  for (const mateId of mateIds) {
    const { a, b } = bracketForMate(sortedKeyframes, mateId, effectiveT)

    if (a && b) {
      if (b.t === a.t) {
        out[mateId] = b.mateValueOverrides[mateId]
      } else {
        const u = (effectiveT - a.t) / (b.t - a.t)
        out[mateId] = interpolateValue(
          kind,
          a.mateValueOverrides[mateId],
          b.mateValueOverrides[mateId],
          u,
        )
      }
    } else if (a) {
      // past the last keyframe that defines this mate — hold last
      out[mateId] = a.mateValueOverrides[mateId]
    } else if (b) {
      // before the first keyframe that defines this mate — hold next (its first known value)
      out[mateId] = b.mateValueOverrides[mateId]
    }
    // if neither, the mate was never defined — skip (shouldn't happen since we gathered from keyframes)
  }

  return out
}

/**
 * Convert a MotionStudy into N equally-spaced mate-value snapshots
 * (for preview scrubbing).
 */
export function snapshotStudy(
  study: MotionStudy,
  samples: number,
): Array<{ t: number; values: Record<string, number> }> {
  const out: Array<{ t: number; values: Record<string, number> }> = []
  if (samples <= 0) return out
  if (samples === 1) {
    return [{ t: 0, values: sampleMotionStudy(study, 0) }]
  }

  const duration = study.durationSec
  const step = duration / (samples - 1)
  for (let i = 0; i < samples; i++) {
    const t = i * step
    out.push({ t, values: sampleMotionStudy(study, t) })
  }
  return out
}

/**
 * Validate the shape of a MotionStudy.
 *   - durationSec > 0
 *   - every keyframe.t is in [0, durationSec]
 *   - keyframes are sorted by t (non-decreasing)
 *   - must include at least one keyframe at t=0 and one at t=durationSec
 */
export function validateStudy(study: MotionStudy): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!(study.durationSec > 0)) {
    errors.push(`durationSec must be > 0 (got ${study.durationSec})`)
  }

  if (!Array.isArray(study.keyframes) || study.keyframes.length === 0) {
    errors.push('keyframes must be a non-empty array')
    return { valid: false, errors }
  }

  for (let i = 0; i < study.keyframes.length; i++) {
    const kf = study.keyframes[i]
    if (typeof kf.t !== 'number' || Number.isNaN(kf.t)) {
      errors.push(`keyframe[${i}].t must be a finite number`)
      continue
    }
    if (kf.t < 0 || kf.t > study.durationSec) {
      errors.push(
        `keyframe[${i}].t (${kf.t}) must be in [0, ${study.durationSec}]`,
      )
    }
  }

  for (let i = 1; i < study.keyframes.length; i++) {
    if (study.keyframes[i].t < study.keyframes[i - 1].t) {
      errors.push(
        `keyframes must be sorted by t (keyframe[${i}].t=${study.keyframes[i].t} < keyframe[${i - 1}].t=${study.keyframes[i - 1].t})`,
      )
      break
    }
  }

  const hasStart = study.keyframes.some((k) => k.t === 0)
  const hasEnd = study.keyframes.some((k) => k.t === study.durationSec)
  if (!hasStart) errors.push('missing keyframe at t=0')
  if (!hasEnd) errors.push(`missing keyframe at t=${study.durationSec}`)

  return { valid: errors.length === 0, errors }
}

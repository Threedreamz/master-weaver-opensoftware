// Dimension annotations for 2D engineering drawings (SVG / PDF sheets).
// Pure 2D, framework-free. Linear / radial / diameter / angular.

export interface Point2 {
  x: number
  y: number
}

export type DimensionKind = 'linear' | 'radial' | 'diameter' | 'angular'

export interface Dimension {
  id: string
  kind: DimensionKind
  extensionLines: { p0: Point2; p1: Point2 }[]
  dimLine: { p0: Point2; p1: Point2 }
  arrows: { position: Point2; direction: Point2 /* unit vec */ }[]
  label: { position: Point2; text: string; anchor: 'start' | 'middle' | 'end' }
}

// ---------- internal helpers ----------

let __dimCounter = 0
function nextId(kind: DimensionKind): string {
  __dimCounter += 1
  return `dim-${kind}-${__dimCounter}`
}

function sub(a: Point2, b: Point2): Point2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

function add(a: Point2, b: Point2): Point2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

function scale(a: Point2, k: number): Point2 {
  return { x: a.x * k, y: a.y * k }
}

function length(a: Point2): number {
  return Math.hypot(a.x, a.y)
}

function normalize(a: Point2): Point2 {
  const L = length(a)
  if (L === 0) return { x: 0, y: 0 }
  return { x: a.x / L, y: a.y / L }
}

function perpCCW(u: Point2): Point2 {
  // 90deg CCW rotation of a unit vector: (x, y) -> (-y, x)
  return { x: -u.y, y: u.x }
}

function midpoint(a: Point2, b: Point2): Point2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function formatValue(value: number, precision = 2, unit = 'mm'): string {
  return `${value.toFixed(precision)} ${unit}`
}

// ---------- public API ----------

/**
 * Linear distance between two points.
 * `offset` = perpendicular distance from the anchor line (a–b) to the dim line.
 */
export function createLinearDim(
  a: Point2,
  b: Point2,
  offset: number,
  options?: { precision?: number; unit?: string },
): Dimension {
  const precision = options?.precision ?? 2
  const unit = options?.unit ?? 'mm'

  const ab = sub(b, a)
  const dist = length(ab)
  const u = dist === 0 ? { x: 1, y: 0 } : normalize(ab)
  const n = perpCCW(u) // perpendicular unit vector

  const off = scale(n, offset)

  // Dim line is anchor line shifted by `offset` along the perpendicular.
  const dimA = add(a, off)
  const dimB = add(b, off)

  // Extension lines go from anchor points outward to dim line.
  const extensionLines = [
    { p0: a, p1: dimA },
    { p0: b, p1: dimB },
  ]

  // Arrows at each end of the dim line, pointing inward (toward the other end).
  const arrows = [
    { position: dimA, direction: u },
    { position: dimB, direction: scale(u, -1) },
  ]

  const labelPos = midpoint(dimA, dimB)

  return {
    id: nextId('linear'),
    kind: 'linear',
    extensionLines,
    dimLine: { p0: dimA, p1: dimB },
    arrows,
    label: {
      position: labelPos,
      text: formatValue(dist, precision, unit),
      anchor: 'middle',
    },
  }
}

/**
 * Radial dim (R<value>) for an arc.
 * `anchor` is a point on the arc; `center` is the arc center; radius = |anchor - center|.
 */
export function createRadialDim(
  center: Point2,
  anchor: Point2,
  options?: { precision?: number; unit?: string },
): Dimension {
  const precision = options?.precision ?? 2
  const unit = options?.unit ?? 'mm'

  const v = sub(anchor, center)
  const radius = length(v)
  const u = radius === 0 ? { x: 1, y: 0 } : normalize(v)

  // Dim line runs from center to anchor along u.
  const dimLine = { p0: center, p1: anchor }

  // Arrow at the anchor pointing outward (away from center).
  const arrows = [{ position: anchor, direction: u }]

  // Label slightly beyond the anchor along u.
  const labelOffset = 2 // small nudge past the arrow tip
  const labelPos = add(anchor, scale(u, labelOffset))

  return {
    id: nextId('radial'),
    kind: 'radial',
    extensionLines: [],
    dimLine,
    arrows,
    label: {
      position: labelPos,
      text: `R${formatValue(radius, precision, unit)}`,
      anchor: 'start',
    },
  }
}

/**
 * Diameter dim (Ø<value>) across a full circle.
 * `directionDeg` = angle (in degrees, measured CCW from +x axis) of the dim line.
 */
export function createDiameterDim(
  center: Point2,
  radius: number,
  directionDeg: number,
  options?: { precision?: number; unit?: string },
): Dimension {
  const precision = options?.precision ?? 2
  const unit = options?.unit ?? 'mm'

  const theta = (directionDeg * Math.PI) / 180
  const u: Point2 = { x: Math.cos(theta), y: Math.sin(theta) }

  const p0 = add(center, scale(u, -radius))
  const p1 = add(center, scale(u, radius))

  // Arrows pointing OUTWARD from center at each end.
  const arrows = [
    { position: p0, direction: scale(u, -1) },
    { position: p1, direction: u },
  ]

  const labelPos = center

  return {
    id: nextId('diameter'),
    kind: 'diameter',
    extensionLines: [],
    dimLine: { p0, p1 },
    arrows,
    label: {
      position: labelPos,
      text: `Ø${formatValue(radius * 2, precision, unit)}`,
      anchor: 'middle',
    },
  }
}

/**
 * Angular dim between two lines sharing a vertex.
 * Lines are defined by directions (a - vertex) and (b - vertex).
 * Returns an arc (approximated as a single segment dim line chord) with tangent arrows
 * and a label "<value>°" near the arc midpoint.
 */
export function createAngularDim(
  vertex: Point2,
  a: Point2,
  b: Point2,
  radius: number,
  options?: { precision?: number },
): Dimension {
  const precision = options?.precision ?? 2

  const ua = normalize(sub(a, vertex))
  const ub = normalize(sub(b, vertex))

  // Angle between the two directions. Dot-product gives the unsigned angle in [0, π].
  const dot = Math.max(-1, Math.min(1, ua.x * ub.x + ua.y * ub.y))
  const angleRad = Math.acos(dot)
  const angleDeg = (angleRad * 180) / Math.PI

  // Endpoints on the arc at the given radius.
  const pA = add(vertex, scale(ua, radius))
  const pB = add(vertex, scale(ub, radius))

  // Tangent direction at pA: rotate ua 90deg in the direction toward ub.
  // Cross product z-component ua × ub tells us the turn direction.
  const cross = ua.x * ub.y - ua.y * ub.x
  const turn = cross >= 0 ? 1 : -1 // +1 = CCW from a to b

  // Tangent at pA (perpendicular to radial ua, pointing toward b along the arc).
  const tangentA: Point2 = { x: -ua.y * turn, y: ua.x * turn }
  // Tangent at pB points back toward a along the arc.
  const tangentB: Point2 = { x: ub.y * turn, y: -ub.x * turn }

  // Arc midpoint direction = average of ua, ub then renormalize.
  // When the two vectors are antiparallel this collapses to (0,0); fall back to perp(ua).
  let midDir = normalize(add(ua, ub))
  if (length(midDir) === 0) {
    midDir = perpCCW(ua)
  }
  const arcMid = add(vertex, scale(midDir, radius))

  // Label sits slightly beyond the arc midpoint along midDir.
  const labelPos = add(vertex, scale(midDir, radius + 2))

  return {
    id: nextId('angular'),
    kind: 'angular',
    extensionLines: [
      { p0: vertex, p1: pA },
      { p0: vertex, p1: pB },
    ],
    dimLine: { p0: pA, p1: pB }, // chord; renderer can upgrade to an SVG arc path
    arrows: [
      { position: pA, direction: tangentA },
      { position: pB, direction: tangentB },
    ],
    label: {
      position: labelPos,
      text: `${angleDeg.toFixed(precision)}°`,
      anchor: 'middle',
    },
  }
}

// Also export the helper so renderers / tests can reuse it if they wish.
// (Not part of the public spec but useful for SVG path generation around the arc.)
export const __internals = {
  arcMidDirection: (vertex: Point2, a: Point2, b: Point2): Point2 => {
    const ua = normalize(sub(a, vertex))
    const ub = normalize(sub(b, vertex))
    let m = normalize(add(ua, ub))
    if (length(m) === 0) m = perpCCW(ua)
    return m
  },
}

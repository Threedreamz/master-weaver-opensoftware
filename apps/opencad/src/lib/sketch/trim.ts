/**
 * 2D line trim/extend geometry primitives.
 *
 * Pure functions — no DOM, no framework deps. Used by the opencad sketch
 * tooling for trim/extend operations against a cutter line.
 */

export interface Point2 {
  x: number;
  y: number;
}

export interface Line2 {
  p0: Point2;
  p1: Point2;
}

const EPSILON = 1e-10;

/**
 * Returns the intersection point of two line segments treated as INFINITE lines,
 * along with the parametric positions t (on a) and u (on b).
 *
 * - t ∈ [0,1] means the intersection lies within segment a.
 * - u ∈ [0,1] means the intersection lies within segment b.
 *
 * Returns null when the lines are parallel (or coincident).
 *
 * Derivation: given a(t) = a.p0 + t·(a.p1 − a.p0) and b(u) = b.p0 + u·(b.p1 − b.p0),
 * solve a(t) = b(u). Using 2D cross product d1 × d2 as denominator:
 *   denom = (a.p1.x − a.p0.x)·(b.p1.y − b.p0.y) − (a.p1.y − a.p0.y)·(b.p1.x − b.p0.x)
 * If |denom| < ε → parallel.
 */
export function lineLineIntersection(
  a: Line2,
  b: Line2,
): { point: Point2; t: number; u: number } | null {
  const d1x = a.p1.x - a.p0.x;
  const d1y = a.p1.y - a.p0.y;
  const d2x = b.p1.x - b.p0.x;
  const d2y = b.p1.y - b.p0.y;

  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < EPSILON) {
    return null; // parallel or coincident
  }

  const dx = b.p0.x - a.p0.x;
  const dy = b.p0.y - a.p0.y;

  const t = (dx * d2y - dy * d2x) / denom;
  const u = (dx * d1y - dy * d1x) / denom;

  const point: Point2 = {
    x: a.p0.x + t * d1x,
    y: a.p0.y + t * d1y,
  };

  return { point, t, u };
}

/**
 * Trim `target` at its intersection with `cutter`, keeping the half indicated
 * by `pickSide`:
 *   - 'keep-p0' → returns { p0: target.p0, p1: intersection }
 *   - 'keep-p1' → returns { p0: intersection, p1: target.p1 }
 *
 * Returns null when the lines are parallel (nothing to trim against).
 *
 * Note: we intentionally do NOT require t ∈ [0,1] — the cutter line is treated
 * as infinite, which matches typical CAD "trim to line" behavior.
 */
export function trimLineAt(
  target: Line2,
  cutter: Line2,
  pickSide: 'keep-p0' | 'keep-p1',
): Line2 | null {
  const hit = lineLineIntersection(target, cutter);
  if (!hit) return null;

  if (pickSide === 'keep-p0') {
    return { p0: { ...target.p0 }, p1: hit.point };
  }
  return { p0: hit.point, p1: { ...target.p1 } };
}

/**
 * Extend `target` so that one of its endpoints moves onto the cutter line.
 *   - 'from-p0' → keep p1 fixed, move p0 onto cutter (extending "from the p0 end").
 *   - 'from-p1' → keep p0 fixed, move p1 onto cutter (extending "from the p1 end").
 *
 * Returns null when the lines are parallel (no intersection to reach).
 *
 * Like `trimLineAt`, the cutter is treated as an infinite line.
 */
export function extendLineTo(
  target: Line2,
  cutter: Line2,
  extendSide: 'from-p0' | 'from-p1',
): Line2 | null {
  const hit = lineLineIntersection(target, cutter);
  if (!hit) return null;

  if (extendSide === 'from-p0') {
    return { p0: hit.point, p1: { ...target.p1 } };
  }
  return { p0: { ...target.p0 }, p1: hit.point };
}

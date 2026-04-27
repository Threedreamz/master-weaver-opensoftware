/**
 * opencad — sketch-constraints.ts
 *
 * Pure residual (squared-error) functions for 2D sketch constraints.
 * Each function returns a non-negative number — the solver minimises the
 * sum of these across all active constraints.
 *
 * Zero dependencies, deterministic, Vitest-friendly.
 *
 * Coordinate system: 2D, y-up. Points are { x, y }. Lines are a pair of
 * points (p0, p1). Circles have { cx, cy, r }. Arcs share the circle
 * center/radius representation for constraint purposes (radius is derived
 * from |center - start|).
 */

export interface Point {
  x: number;
  y: number;
}

export interface Line {
  p0: Point;
  p1: Point;
}

export interface Circle {
  center: Point;
  radius: number;
}

/* ------------------------------------------------------------------ helpers */

function dx(l: Line): number {
  return l.p1.x - l.p0.x;
}
function dy(l: Line): number {
  return l.p1.y - l.p0.y;
}
function lenSq(l: Line): number {
  const a = dx(l);
  const b = dy(l);
  return a * a + b * b;
}
function len(l: Line): number {
  return Math.sqrt(lenSq(l));
}

/* ------------------------------------------------------------- residuals */

/** coincident: two points should occupy the same coordinate. Residual = |a-b|². */
export function coincidentResidual(a: Point, b: Point): number {
  const rx = a.x - b.x;
  const ry = a.y - b.y;
  return rx * rx + ry * ry;
}

/** horizontal: line must be horizontal → dy = 0. */
export function horizontalResidual(line: Line): number {
  const d = dy(line);
  return d * d;
}

/** vertical: line must be vertical → dx = 0. */
export function verticalResidual(line: Line): number {
  const d = dx(line);
  return d * d;
}

/**
 * parallel: two lines parallel ⇒ cross product of direction vectors = 0.
 * Normalised → sin²(θ) between the two directions.
 */
export function parallelResidual(a: Line, b: Line): number {
  const ax = dx(a);
  const ay = dy(a);
  const bx = dx(b);
  const by = dy(b);
  const la = Math.sqrt(ax * ax + ay * ay);
  const lb = Math.sqrt(bx * bx + by * by);
  if (la < 1e-12 || lb < 1e-12) return 0;
  const sin = (ax * by - ay * bx) / (la * lb);
  return sin * sin;
}

/**
 * perpendicular: dot product of direction vectors = 0.
 * Normalised → cos²(θ).
 */
export function perpendicularResidual(a: Line, b: Line): number {
  const ax = dx(a);
  const ay = dy(a);
  const bx = dx(b);
  const by = dy(b);
  const la = Math.sqrt(ax * ax + ay * ay);
  const lb = Math.sqrt(bx * bx + by * by);
  if (la < 1e-12 || lb < 1e-12) return 0;
  const cos = (ax * bx + ay * by) / (la * lb);
  return cos * cos;
}

/** distance: |a - b| must equal v → (|ab| - v)². */
export function distanceResidual(a: Point, b: Point, v: number): number {
  const rx = a.x - b.x;
  const ry = a.y - b.y;
  const d = Math.sqrt(rx * rx + ry * ry);
  const e = d - v;
  return e * e;
}

/**
 * angle: angle between two lines (in degrees) must match target.
 * Residual = (actualDeg - targetDeg)², wrapped to (-180, 180].
 */
export function angleResidual(a: Line, b: Line, targetDeg: number): number {
  const ax = dx(a);
  const ay = dy(a);
  const bx = dx(b);
  const by = dy(b);
  const la = Math.sqrt(ax * ax + ay * ay);
  const lb = Math.sqrt(bx * bx + by * by);
  if (la < 1e-12 || lb < 1e-12) return 0;
  // Signed angle between directions via atan2 of cross/dot — range (-π, π].
  const cross = ax * by - ay * bx;
  const dot = ax * bx + ay * by;
  const actualRad = Math.atan2(cross, dot);
  const actualDeg = (actualRad * 180) / Math.PI;
  let diff = actualDeg - targetDeg;
  // Wrap into (-180, 180] for shortest angular distance.
  while (diff > 180) diff -= 360;
  while (diff <= -180) diff += 360;
  return diff * diff;
}

/** radius: circle radius must equal v → (r - v)². */
export function radiusResidual(circle: Circle, v: number): number {
  const e = circle.radius - v;
  return e * e;
}

/** equal (lines): |a| = |b| → (|a| - |b|)². */
export function equalLineLengthResidual(a: Line, b: Line): number {
  const e = len(a) - len(b);
  return e * e;
}

/** equal (circles): ra = rb → (ra - rb)². */
export function equalRadiusResidual(a: Circle, b: Circle): number {
  const e = a.radius - b.radius;
  return e * e;
}

/** Convenience accessors exported for the solver. */
export const _geom = { dx, dy, len, lenSq };

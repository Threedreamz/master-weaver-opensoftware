/**
 * opencad — sketch/ellipse.ts
 *
 * Ellipse entity plus a squared algebraic residual (matches the convention
 * in `sketch-constraints.ts` — non-negative, zero on the locus) and a
 * boundary sampler used for preview rendering and extrude-profile input.
 *
 * Coordinate system: 2D, y-up. Angles in degrees, rotation 0 = major axis
 * along +x.
 *
 * Zero dependencies, deterministic, Vitest-friendly.
 */

export interface Point2 {
  x: number;
  y: number;
}

export interface Ellipse {
  center: Point2;
  /** semi axis length along the +rotationDeg direction */
  semiMajor: number;
  /** semi axis length perpendicular to rotationDeg */
  semiMinor: number;
  /** rotation of major axis, in degrees. 0 = +x. */
  rotationDeg: number;
}

/* ------------------------------------------------------------- constructor */

/**
 * Create an ellipse. Validates that `semiMajor >= semiMinor > 0`.
 *
 * @throws Error when the axis ordering or magnitudes are invalid.
 */
export function createEllipse(
  center: Point2,
  semiMajor: number,
  semiMinor: number,
  rotationDeg: number = 0,
): Ellipse {
  if (!(semiMajor > 0) || !(semiMinor > 0)) {
    throw new Error(
      `createEllipse: semi axes must be positive (got semiMajor=${semiMajor}, semiMinor=${semiMinor})`,
    );
  }
  if (semiMinor > semiMajor) {
    throw new Error(
      `createEllipse: semiMajor must be >= semiMinor (got semiMajor=${semiMajor}, semiMinor=${semiMinor})`,
    );
  }
  return {
    center: { x: center.x, y: center.y },
    semiMajor,
    semiMinor,
    rotationDeg,
  };
}

/* ---------------------------------------------------------------- residual */

/**
 * Squared algebraic error for a point lying on the ellipse boundary.
 *
 * For point (x,y) and ellipse centered at (h,k) with semi axes a,b and
 * rotation θ:
 *   u = (x-h)cosθ + (y-k)sinθ
 *   v = -(x-h)sinθ + (y-k)cosθ
 *   residual = (u²/a² + v²/b² - 1)²
 *
 * Zero when the point lies exactly on the boundary. 1 at the center.
 */
export function ellipsePointResidual(point: Point2, ellipse: Ellipse): number {
  const { center, semiMajor: a, semiMinor: b, rotationDeg } = ellipse;
  const theta = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const u = dx * cos + dy * sin;
  const v = -dx * sin + dy * cos;
  const term = (u * u) / (a * a) + (v * v) / (b * b) - 1;
  return term * term;
}

/* ----------------------------------------------------------------- sampler */

/**
 * Sample `samples` evenly-spaced points on the ellipse boundary (by angle
 * parameter t ∈ [0, 2π)). The first point is on the +major axis (t=0).
 *
 * Points are returned in world coordinates (rotation + translation applied).
 *
 * @throws Error when `samples < 1`.
 */
export function sampleEllipse(ellipse: Ellipse, samples: number): Point2[] {
  if (!Number.isFinite(samples) || samples < 1) {
    throw new Error(`sampleEllipse: samples must be >= 1 (got ${samples})`);
  }
  const n = Math.floor(samples);
  const { center, semiMajor: a, semiMinor: b, rotationDeg } = ellipse;
  const theta = (rotationDeg * Math.PI) / 180;
  const cosR = Math.cos(theta);
  const sinR = Math.sin(theta);
  const out: Point2[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const u = a * Math.cos(t);
    const v = b * Math.sin(t);
    out[i] = {
      x: center.x + u * cosR - v * sinR,
      y: center.y + u * sinR + v * cosR,
    };
  }
  return out;
}

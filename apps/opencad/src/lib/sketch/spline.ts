/**
 * opencad — sketch/spline.ts
 *
 * Bezier + B-spline 2D sketch entities. Pure JS, zero deps, deterministic.
 * Residual convention matches sketch-constraints.ts: non-negative, 0 = satisfied.
 */

export interface Point2 {
  x: number;
  y: number;
}

/** Cubic Bezier segment with 4 control points. */
export interface BezierCubic {
  kind: 'bezier-cubic';
  p0: Point2;
  p1: Point2;
  p2: Point2;
  p3: Point2;
}

/** Open uniform B-spline of order k (k=degree+1) over N control points. */
export interface BSpline {
  kind: 'bspline';
  degree: number;
  controlPoints: Point2[];
}

/* ---------------------------------------------------------- Bezier cubic */

/** B(t) = (1-t)³·p0 + 3(1-t)²t·p1 + 3(1-t)t²·p2 + t³·p3 */
function evalBezier(curve: BezierCubic, t: number): Point2 {
  const u = 1 - t;
  const b0 = u * u * u;
  const b1 = 3 * u * u * t;
  const b2 = 3 * u * t * t;
  const b3 = t * t * t;
  return {
    x: b0 * curve.p0.x + b1 * curve.p1.x + b2 * curve.p2.x + b3 * curve.p3.x,
    y: b0 * curve.p0.y + b1 * curve.p1.y + b2 * curve.p2.y + b3 * curve.p3.y,
  };
}

export function sampleBezier(curve: BezierCubic, samples: number): Point2[] {
  if (samples < 2) samples = 2;
  const out: Point2[] = new Array(samples);
  const last = samples - 1;
  for (let i = 0; i < samples; i++) {
    const t = i / last;
    out[i] = evalBezier(curve, t);
  }
  return out;
}

/* --------------------------------------------------------------- B-spline */

/**
 * Build an open uniform knot vector for N control points and degree p.
 * Length = N + p + 1. Clamps first p+1 knots to 0 and last p+1 knots to 1,
 * with the interior knots uniformly spaced.
 */
function openUniformKnots(n: number, p: number): number[] {
  const m = n + p + 1; // knot count
  const knots: number[] = new Array(m);
  for (let i = 0; i < m; i++) {
    if (i <= p) knots[i] = 0;
    else if (i >= n) knots[i] = 1;
    else knots[i] = (i - p) / (n - p);
  }
  return knots;
}

/**
 * Cox-de-Boor basis function N_{i,p}(t).
 * Computed iteratively for numerical stability.
 */
function coxDeBoor(i: number, p: number, t: number, knots: number[]): number {
  // Base case: degree 0 — step function.
  // Handle the special-case at t=1: the last span should include t=1.
  const lastKnot = knots[knots.length - 1];
  const N: number[] = new Array(p + 1);
  for (let j = 0; j <= p; j++) {
    const k0 = knots[i + j];
    const k1 = knots[i + j + 1];
    let val = 0;
    if (k0 <= t && t < k1) val = 1;
    else if (t === lastKnot && k1 === lastKnot && k0 < k1) val = 1;
    N[j] = val;
  }
  // Iterate up to degree p.
  for (let k = 1; k <= p; k++) {
    for (let j = 0; j <= p - k; j++) {
      const d1 = knots[i + j + k] - knots[i + j];
      const d2 = knots[i + j + k + 1] - knots[i + j + 1];
      const a = d1 > 0 ? ((t - knots[i + j]) / d1) * N[j] : 0;
      const b = d2 > 0 ? ((knots[i + j + k + 1] - t) / d2) * N[j + 1] : 0;
      N[j] = a + b;
    }
  }
  return N[0];
}

function evalBSpline(curve: BSpline, t: number): Point2 {
  const n = curve.controlPoints.length;
  const p = curve.degree;
  const knots = openUniformKnots(n, p);
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    const w = coxDeBoor(i, p, t, knots);
    x += w * curve.controlPoints[i].x;
    y += w * curve.controlPoints[i].y;
  }
  return { x, y };
}

export function sampleBSpline(curve: BSpline, samples: number): Point2[] {
  if (samples < 2) samples = 2;
  const out: Point2[] = new Array(samples);
  const last = samples - 1;
  for (let i = 0; i < samples; i++) {
    const t = i / last;
    out[i] = evalBSpline(curve, t);
  }
  return out;
}

/* ------------------------------------------------------- point residuals */

function dist2(a: Point2, b: Point2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Adaptive nearest-sample search — returns squared distance from point to curve.
 * Start with 16 coarse samples, find nearest, refine 3× locally around it.
 */
function adaptiveResidual(
  point: Point2,
  evalAt: (t: number) => Point2,
): number {
  let tLo = 0;
  let tHi = 1;
  let best = Infinity;

  // Initial coarse pass: 16 samples across [0,1].
  const coarseN = 16;
  let bestT = 0;
  for (let i = 0; i <= coarseN; i++) {
    const t = i / coarseN;
    const p = evalAt(t);
    const d = dist2(point, p);
    if (d < best) {
      best = d;
      bestT = t;
    }
  }

  // 3 rounds of local refinement — halve window each round, 8 samples.
  const refineN = 8;
  for (let round = 0; round < 3; round++) {
    const span = (tHi - tLo) / 4; // shrinking window
    const lo = Math.max(0, bestT - span);
    const hi = Math.min(1, bestT + span);
    for (let i = 0; i <= refineN; i++) {
      const t = lo + (i / refineN) * (hi - lo);
      const p = evalAt(t);
      const d = dist2(point, p);
      if (d < best) {
        best = d;
        bestT = t;
      }
    }
    tLo = lo;
    tHi = hi;
  }

  return best;
}

export function bezierPointResidual(point: Point2, curve: BezierCubic): number {
  return adaptiveResidual(point, (t) => evalBezier(curve, t));
}

export function bsplinePointResidual(point: Point2, curve: BSpline): number {
  return adaptiveResidual(point, (t) => evalBSpline(curve, t));
}

/* ------------------------------------------------------------- lengths */

function sampleLength(samples: Point2[]): number {
  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    const dx = samples[i].x - samples[i - 1].x;
    const dy = samples[i].y - samples[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

export function bezierLength(curve: BezierCubic, samples: number = 64): number {
  return sampleLength(sampleBezier(curve, samples));
}

export function bsplineLength(curve: BSpline, samples: number = 64): number {
  return sampleLength(sampleBSpline(curve, samples));
}

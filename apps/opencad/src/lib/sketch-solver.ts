/**
 * opencad — sketch-solver.ts
 *
 * Pure-JS 2D sketch constraint solver for M1. Takes a `SketchSolveBody`
 * (entities + constraints) and returns a `SketchSolveResponse` with
 * updated point coordinates and circle radii.
 *
 * Algorithm: Levenberg–Marquardt-lite.
 *   1. Pack free DOFs into a state vector x ∈ R^n (skipping fixed points).
 *      Circle radii (kind="circle") are also free DOFs unless the circle
 *      has only a radius constraint that pins it.
 *   2. Evaluate per-constraint squared residuals r_i(x). Total F = Σ r_i.
 *   3. Build a numeric Jacobian J of r_i w.r.t. x via forward differences.
 *   4. Damped Gauss–Newton step: solve (JᵀJ + λI) Δ = -Jᵀ r.
 *      λ adapts: success halves λ (toward zero), failure multiplies by 10.
 *   5. Step size is clamped to ‖Δ‖ ≤ MAX_STEP to avoid wild jumps.
 *   6. Terminate when total F < tolerance, or max iterations reached.
 *
 * DOF accounting:
 *   raw_dof = 2 * (non-fixed points) + (free circle radii)
 *   effective = constraints contributing independent equations
 *   dof = raw_dof - effective
 *
 * Status:
 *   - F < tol and dof > 0   → "under-constrained" (still reported but solved geometry returned)
 *   - F < tol and dof <= 0  → "solved"
 *   - F >= tol and dof < 0  → "over-constrained" (conflicts populated)
 *   - otherwise              → "failed"
 *
 * Zero external deps. Deterministic. O(constraints × iterations × dofs).
 */

import type { z } from "zod";
import { SketchSolveBody as SketchSolveBodySchema, SketchSolveResponse as SketchSolveResponseSchema } from "./api-contracts";
import {
  coincidentResidual,
  horizontalResidual,
  verticalResidual,
  parallelResidual,
  perpendicularResidual,
  distanceResidual,
  angleResidual,
  radiusResidual,
  equalLineLengthResidual,
  equalRadiusResidual,
  type Point,
  type Line,
  type Circle,
} from "./sketch-constraints";

export type SketchSolveBody = z.infer<typeof SketchSolveBodySchema>;
export type SketchSolveResponse = z.infer<typeof SketchSolveResponseSchema>;

/* ------------------------------------------------------------------ tuning */

const MAX_ENTITIES = 5000;
const FD_EPS = 1e-7;                 // finite-difference step
const MAX_STEP = 50;                 // clamp per-iteration update magnitude
const INIT_LAMBDA = 1e-3;
const LAMBDA_UP = 10;
const LAMBDA_DOWN = 0.5;
const CONFLICT_RESIDUAL_MULT = 10;   // per-constraint residual above tol*mult → conflict

/* ----------------------------------------------------------------- typing */

type Ent = SketchSolveBody["entities"][number];
type Con = SketchSolveBody["constraints"][number];

interface State {
  points: Map<string, { x: number; y: number; fixed: boolean; idxX: number; idxY: number }>;
  lines: Map<string, { p0: string; p1: string }>;
  arcs: Map<string, { center: string; start: string; end: string }>;
  circles: Map<string, { center: string; radius: number; idxR: number }>;
  // free DOF vector indices
  dofCount: number;
}

/* ---------------------------------------------------------------- packer */

function buildState(entities: Ent[]): State {
  const s: State = {
    points: new Map(),
    lines: new Map(),
    arcs: new Map(),
    circles: new Map(),
    dofCount: 0,
  };

  // Pass 1: points get DOF slots (two per non-fixed).
  for (const e of entities) {
    if (e.kind !== "point") continue;
    const idxX = e.fixed ? -1 : s.dofCount++;
    const idxY = e.fixed ? -1 : s.dofCount++;
    s.points.set(e.id, { x: e.x, y: e.y, fixed: e.fixed, idxX, idxY });
  }

  // Pass 2: remaining entities.
  for (const e of entities) {
    if (e.kind === "line") s.lines.set(e.id, { p0: e.p0, p1: e.p1 });
    else if (e.kind === "arc") s.arcs.set(e.id, { center: e.center, start: e.start, end: e.end });
    else if (e.kind === "circle") {
      const idxR = s.dofCount++;
      s.circles.set(e.id, { center: e.center, radius: e.radius, idxR });
    }
  }

  return s;
}

function packX(s: State): Float64Array {
  const x = new Float64Array(s.dofCount);
  for (const p of s.points.values()) {
    if (!p.fixed) {
      x[p.idxX] = p.x;
      x[p.idxY] = p.y;
    }
  }
  for (const c of s.circles.values()) x[c.idxR] = c.radius;
  return x;
}

function unpackX(s: State, x: Float64Array): void {
  for (const p of s.points.values()) {
    if (!p.fixed) {
      p.x = x[p.idxX];
      p.y = x[p.idxY];
    }
  }
  for (const c of s.circles.values()) c.radius = x[c.idxR];
}

/* -------------------------------------------------------- residual dispatch */

function pointOf(s: State, id: string): Point {
  const p = s.points.get(id);
  if (!p) return { x: 0, y: 0 };
  return { x: p.x, y: p.y };
}

function lineOf(s: State, id: string): Line | null {
  const l = s.lines.get(id);
  if (!l) return null;
  return { p0: pointOf(s, l.p0), p1: pointOf(s, l.p1) };
}

function circleOf(s: State, id: string): Circle | null {
  const c = s.circles.get(id);
  if (!c) return null;
  return { center: pointOf(s, c.center), radius: c.radius };
}

function residualFor(s: State, c: Con): number {
  switch (c.kind) {
    case "coincident":
      return coincidentResidual(pointOf(s, c.a), pointOf(s, c.b));
    case "horizontal": {
      const l = lineOf(s, c.entity);
      return l ? horizontalResidual(l) : 0;
    }
    case "vertical": {
      const l = lineOf(s, c.entity);
      return l ? verticalResidual(l) : 0;
    }
    case "parallel": {
      const a = lineOf(s, c.a);
      const b = lineOf(s, c.b);
      return a && b ? parallelResidual(a, b) : 0;
    }
    case "perpendicular": {
      const a = lineOf(s, c.a);
      const b = lineOf(s, c.b);
      return a && b ? perpendicularResidual(a, b) : 0;
    }
    case "distance":
      return distanceResidual(pointOf(s, c.a), pointOf(s, c.b), c.value);
    case "angle": {
      const a = lineOf(s, c.a);
      const b = lineOf(s, c.b);
      return a && b ? angleResidual(a, b, c.degrees) : 0;
    }
    case "radius": {
      const circ = circleOf(s, c.entity);
      return circ ? radiusResidual(circ, c.value) : 0;
    }
    case "equal": {
      // lines if both are lines, circles if both are circles, else 0.
      const la = s.lines.get(c.a);
      const lb = s.lines.get(c.b);
      if (la && lb) {
        const a = lineOf(s, c.a)!;
        const b = lineOf(s, c.b)!;
        return equalLineLengthResidual(a, b);
      }
      const ca = s.circles.get(c.a);
      const cb = s.circles.get(c.b);
      if (ca && cb) {
        const a = circleOf(s, c.a)!;
        const b = circleOf(s, c.b)!;
        return equalRadiusResidual(a, b);
      }
      return 0;
    }
    default:
      return 0;
  }
}

function allResiduals(s: State, cs: Con[]): Float64Array {
  // Residuals are squared errors (non-negative). The solver treats each
  // as a scalar term to minimise; Jacobian is computed directly against F.
  const r = new Float64Array(cs.length);
  for (let i = 0; i < cs.length; i++) r[i] = residualFor(s, cs[i]);
  return r;
}

function totalError(r: Float64Array): number {
  let s = 0;
  for (let i = 0; i < r.length; i++) s += r[i];
  return s;
}

/* ------------------------------------------------------------- linear algebra */

/**
 * Solve (A + λI) x = b via Gauss-Jordan (small n expected; opencad sketches
 * are typically <100 DOFs). Returns null if singular.
 */
function solveLinear(A: number[][], b: number[], lambda: number): number[] | null {
  const n = A.length;
  // augmented matrix M | b
  const M: number[][] = new Array(n);
  for (let i = 0; i < n; i++) {
    M[i] = new Array(n + 1);
    for (let j = 0; j < n; j++) M[i][j] = A[i][j] + (i === j ? lambda : 0);
    M[i][n] = b[i];
  }
  for (let k = 0; k < n; k++) {
    // partial pivot
    let piv = k;
    let max = Math.abs(M[k][k]);
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(M[i][k]);
      if (v > max) {
        max = v;
        piv = i;
      }
    }
    if (max < 1e-14) return null;
    if (piv !== k) {
      const tmp = M[k];
      M[k] = M[piv];
      M[piv] = tmp;
    }
    const inv = 1 / M[k][k];
    for (let j = k; j <= n; j++) M[k][j] *= inv;
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const f = M[i][k];
      if (f === 0) continue;
      for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j];
    }
  }
  const x = new Array(n);
  for (let i = 0; i < n; i++) x[i] = M[i][n];
  return x;
}

/* ---------------------------------------------------------------- solver */

export function solveSketch(body: SketchSolveBody): SketchSolveResponse {
  if (body.entities.length > MAX_ENTITIES) {
    return {
      status: "failed",
      entities: [],
      dof: 0,
      residual: Number.POSITIVE_INFINITY,
      iterations: 0,
      conflicts: [{ constraintId: "_global", reason: `entity count exceeds ${MAX_ENTITIES}` }],
    };
  }

  const state = buildState(body.entities);
  const cs = body.constraints;
  const tol = body.tolerance;
  const maxIter = body.maxIterations;

  // DOF accounting.
  const nonFixedPoints = Array.from(state.points.values()).filter((p) => !p.fixed).length;
  const freeCircles = state.circles.size;
  const rawDof = 2 * nonFixedPoints + freeCircles;
  const dof = rawDof - cs.length;

  let x = packX(state);
  let lambda = INIT_LAMBDA;
  let iterations = 0;
  let residual = totalError(allResiduals(state, cs));

  // Trivial case: no free DOFs → just report residual.
  if (state.dofCount === 0) {
    return packResponse(state, cs, residual, dof, 0, tol);
  }

  for (let it = 0; it < maxIter; it++) {
    iterations = it + 1;
    if (residual < tol) break;

    // Jacobian J ∈ R^{m × n}, where m = #constraints, n = dofCount.
    const m = cs.length;
    const n = state.dofCount;
    const J: number[][] = new Array(m);
    const baseR = allResiduals(state, cs);
    for (let i = 0; i < m; i++) J[i] = new Array(n).fill(0);

    for (let j = 0; j < n; j++) {
      const orig = x[j];
      const step = Math.max(Math.abs(orig), 1) * FD_EPS;
      x[j] = orig + step;
      unpackX(state, x);
      const rPlus = allResiduals(state, cs);
      x[j] = orig;
      unpackX(state, x);
      for (let i = 0; i < m; i++) J[i][j] = (rPlus[i] - baseR[i]) / step;
    }

    // Normal equations: A = JᵀJ, g = Jᵀr.
    const A: number[][] = new Array(n);
    const g: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) A[i] = new Array(n).fill(0);
    for (let k = 0; k < m; k++) {
      const row = J[k];
      const rk = baseR[k];
      for (let i = 0; i < n; i++) {
        const ri = row[i];
        if (ri === 0) continue;
        g[i] += ri * rk;
        for (let jj = i; jj < n; jj++) A[i][jj] += ri * row[jj];
      }
    }
    for (let i = 0; i < n; i++) for (let jj = 0; jj < i; jj++) A[i][jj] = A[jj][i];

    const neg = g.map((v) => -v);
    const delta = solveLinear(A, neg, lambda);
    if (!delta) {
      // Singular — bump damping and retry next iteration.
      lambda *= LAMBDA_UP;
      if (lambda > 1e12) break;
      continue;
    }

    // Clamp step magnitude.
    let norm = 0;
    for (let i = 0; i < n; i++) norm += delta[i] * delta[i];
    norm = Math.sqrt(norm);
    if (norm > MAX_STEP) {
      const scale = MAX_STEP / norm;
      for (let i = 0; i < n; i++) delta[i] *= scale;
    }

    // Trial step.
    const xTrial = new Float64Array(n);
    for (let i = 0; i < n; i++) xTrial[i] = x[i] + delta[i];
    unpackX(state, xTrial);
    const trialRes = totalError(allResiduals(state, cs));

    if (trialRes < residual) {
      // Accept.
      x = xTrial;
      residual = trialRes;
      lambda = Math.max(1e-12, lambda * LAMBDA_DOWN);
    } else {
      // Reject — restore and increase damping.
      unpackX(state, x);
      lambda *= LAMBDA_UP;
      if (lambda > 1e12) break;
    }
  }

  return packResponse(state, cs, residual, dof, iterations, tol);
}

/* ----------------------------------------------------------------- packer */

function packResponse(
  state: State,
  cs: Con[],
  residual: number,
  dof: number,
  iterations: number,
  tol: number
): SketchSolveResponse {
  const entities: SketchSolveResponse["entities"] = [];
  for (const [id, p] of state.points.entries()) entities.push({ id, x: p.x, y: p.y });
  for (const [id, c] of state.circles.entries()) entities.push({ id, radius: c.radius });
  // Lines and arcs are fully determined by their referenced points — we still
  // surface them with no coords so callers can confirm they were seen.
  for (const id of state.lines.keys()) entities.push({ id });
  for (const id of state.arcs.keys()) entities.push({ id });

  const conflictThreshold = tol * CONFLICT_RESIDUAL_MULT;
  const conflicts: NonNullable<SketchSolveResponse["conflicts"]> = [];
  for (let i = 0; i < cs.length; i++) {
    const r = residualFor(state, cs[i]);
    if (r > conflictThreshold) {
      const c = cs[i];
      const id = constraintIdFor(c, i);
      conflicts.push({ constraintId: id, reason: `residual ${r.toExponential(3)} > ${conflictThreshold.toExponential(3)}` });
    }
  }

  let status: SketchSolveResponse["status"];
  if (residual < tol && dof > 0) status = "under-constrained";
  else if (residual < tol) status = "solved";
  else if (dof < 0) status = "over-constrained";
  else status = "failed";

  return {
    status,
    entities,
    dof,
    residual,
    iterations,
    ...(conflicts.length > 0 ? { conflicts } : {}),
  };
}

function constraintIdFor(c: Con, idx: number): string {
  // Constraints don't carry ids in the contract — synthesise a stable one.
  switch (c.kind) {
    case "coincident":
    case "parallel":
    case "perpendicular":
    case "equal":
      return `${c.kind}:${c.a}:${c.b}:#${idx}`;
    case "horizontal":
    case "vertical":
      return `${c.kind}:${c.entity}:#${idx}`;
    case "distance":
      return `distance:${c.a}:${c.b}=${c.value}:#${idx}`;
    case "angle":
      return `angle:${c.a}:${c.b}=${c.degrees}:#${idx}`;
    case "radius":
      return `radius:${c.entity}=${c.value}:#${idx}`;
    default:
      return `#${idx}`;
  }
}

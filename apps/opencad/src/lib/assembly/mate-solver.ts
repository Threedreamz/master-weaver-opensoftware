/**
 * opencad — mate-solver.ts
 *
 * Pure-JS 3D assembly mate solver for M2. Takes N parts (each with a 6-DoF
 * pose: tx,ty,tz + rx,ry,rz Euler ZYX degrees) and M geometric mates, then
 * iteratively adjusts non-fixed part poses until all mates are satisfied.
 *
 * Algorithm mirrors `sketch-solver.ts`:
 *   1. Pack free DoFs — 6 per non-fixed part (tx,ty,tz,rx,ry,rz).
 *   2. Evaluate per-mate squared residuals r_i(x).
 *   3. Build numeric Jacobian J via forward finite differences.
 *   4. Damped Gauss-Newton: solve (JᵀJ + λI) Δ = -Jᵀ r.
 *      λ halves on success, grows 10× on rejection.
 *   5. Clamp ‖Δ‖ ≤ MAX_STEP to avoid wild jumps.
 *   6. Terminate when Σr < tolerance or max iterations reached.
 *
 * World transform for a part: T · Rz · Ry · Rx (ZYX Euler).
 * A local point p is mapped to world via: p_world = T · Rz · Ry · Rx · p_local
 * A local direction d is mapped via: d_world = Rz · Ry · Rx · d_local (no T).
 *
 * Zero external deps. Deterministic.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PartPose {
  id: string;
  fixed?: boolean;
  translation: Vec3;
  rotationDeg: Vec3; // ZYX Euler, degrees
}

export type MateKind =
  | "fix"
  | "coincident"
  | "concentric"
  | "parallel"
  | "distance"
  | "angle";

export interface MateAnchor {
  partId: string;
  kind: "point" | "axis";
  position: Vec3;
  direction?: Vec3;
}

export interface Mate {
  id: string;
  kind: MateKind;
  a: MateAnchor;
  b: MateAnchor;
  value?: number;
}

export interface AssemblySolveInput {
  parts: PartPose[];
  mates: Mate[];
  tolerance?: number;
  maxIterations?: number;
}

export interface AssemblySolveResult {
  status: "solved" | "under-constrained" | "over-constrained" | "failed";
  poses: PartPose[];
  dof: number;
  residual: number;
  iterations: number;
  conflicts?: { mateId: string; reason: string }[];
}

/* ------------------------------------------------------------------ tuning */

const DEFAULT_TOL = 1e-5;
const DEFAULT_MAX_ITER = 200;
const FD_EPS = 1e-6;
const MAX_STEP = 50;
const INIT_LAMBDA = 1e-3;
const LAMBDA_UP = 10;
const LAMBDA_DOWN = 0.5;
const CONFLICT_RESIDUAL_MULT = 10;
const DEG = Math.PI / 180;

/* ---------------------------------------------------------------- state */

interface PartState {
  id: string;
  fixed: boolean;
  tx: number;
  ty: number;
  tz: number;
  rx: number; // radians
  ry: number;
  rz: number;
  // -1 if fixed, else index into DoF vector.
  idxTx: number;
  idxTy: number;
  idxTz: number;
  idxRx: number;
  idxRy: number;
  idxRz: number;
}

interface State {
  parts: Map<string, PartState>;
  order: string[]; // preserve input order for output
  dofCount: number;
}

/* ---------------------------------------------------------------- packer */

function buildState(parts: PartPose[]): State {
  const s: State = { parts: new Map(), order: [], dofCount: 0 };
  for (const p of parts) {
    const fixed = !!p.fixed;
    const ps: PartState = {
      id: p.id,
      fixed,
      tx: p.translation.x,
      ty: p.translation.y,
      tz: p.translation.z,
      rx: p.rotationDeg.x * DEG,
      ry: p.rotationDeg.y * DEG,
      rz: p.rotationDeg.z * DEG,
      idxTx: -1,
      idxTy: -1,
      idxTz: -1,
      idxRx: -1,
      idxRy: -1,
      idxRz: -1,
    };
    if (!fixed) {
      ps.idxTx = s.dofCount++;
      ps.idxTy = s.dofCount++;
      ps.idxTz = s.dofCount++;
      ps.idxRx = s.dofCount++;
      ps.idxRy = s.dofCount++;
      ps.idxRz = s.dofCount++;
    }
    s.parts.set(p.id, ps);
    s.order.push(p.id);
  }
  return s;
}

function packX(s: State): Float64Array {
  const x = new Float64Array(s.dofCount);
  for (const p of s.parts.values()) {
    if (p.fixed) continue;
    x[p.idxTx] = p.tx;
    x[p.idxTy] = p.ty;
    x[p.idxTz] = p.tz;
    x[p.idxRx] = p.rx;
    x[p.idxRy] = p.ry;
    x[p.idxRz] = p.rz;
  }
  return x;
}

function unpackX(s: State, x: Float64Array): void {
  for (const p of s.parts.values()) {
    if (p.fixed) continue;
    p.tx = x[p.idxTx];
    p.ty = x[p.idxTy];
    p.tz = x[p.idxTz];
    p.rx = x[p.idxRx];
    p.ry = x[p.idxRy];
    p.rz = x[p.idxRz];
  }
}

/* ------------------------------------------------------------- transforms */

/**
 * Apply Rz·Ry·Rx to a local vector. ZYX extrinsic Euler.
 * Returns the rotated vector (no translation).
 */
function rotate(v: Vec3, rx: number, ry: number, rz: number): Vec3 {
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  // Rx
  let x = v.x;
  let y = v.y * cx - v.z * sx;
  let z = v.y * sx + v.z * cx;
  // Ry
  const x1 = x * cy + z * sy;
  const y1 = y;
  const z1 = -x * sy + z * cy;
  x = x1; y = y1; z = z1;
  // Rz
  const x2 = x * cz - y * sz;
  const y2 = x * sz + y * cz;
  const z2 = z;
  return { x: x2, y: y2, z: z2 };
}

function worldPoint(p: PartState, local: Vec3): Vec3 {
  const r = rotate(local, p.rx, p.ry, p.rz);
  return { x: r.x + p.tx, y: r.y + p.ty, z: r.z + p.tz };
}

function worldDir(p: PartState, local: Vec3): Vec3 {
  return rotate(local, p.rx, p.ry, p.rz);
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normSq(v: Vec3): number {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

function normalize(v: Vec3): Vec3 {
  const n = Math.sqrt(normSq(v));
  if (n < 1e-15) return { x: 0, y: 0, z: 0 };
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}

/* -------------------------------------------------------- residuals */

function partOf(s: State, id: string): PartState | null {
  return s.parts.get(id) ?? null;
}

function residualFor(s: State, m: Mate): number {
  const pa = partOf(s, m.a.partId);
  const pb = partOf(s, m.b.partId);
  if (!pa || !pb) return 0;

  switch (m.kind) {
    case "fix": {
      // Anchor a's part pose must equal identity (zero translation + zero rotation).
      // Sum of squares of translation and rotation (radians).
      const p = pa;
      return (
        p.tx * p.tx + p.ty * p.ty + p.tz * p.tz +
        p.rx * p.rx + p.ry * p.ry + p.rz * p.rz
      );
    }
    case "coincident": {
      const wa = worldPoint(pa, m.a.position);
      const wb = worldPoint(pb, m.b.position);
      return normSq(sub(wa, wb));
    }
    case "concentric": {
      const da = m.a.direction ?? { x: 0, y: 0, z: 1 };
      const db = m.b.direction ?? { x: 0, y: 0, z: 1 };
      const wda = normalize(worldDir(pa, da));
      const wdb = normalize(worldDir(pb, db));
      const c = cross(wda, wdb);
      const axisMisalign = normSq(c);
      // Perpendicular distance from point_b to axis line(point_a, wda).
      const wa = worldPoint(pa, m.a.position);
      const wb = worldPoint(pb, m.b.position);
      const diff = sub(wb, wa);
      const proj = dot(diff, wda);
      const perp = {
        x: diff.x - proj * wda.x,
        y: diff.y - proj * wda.y,
        z: diff.z - proj * wda.z,
      };
      return axisMisalign + normSq(perp);
    }
    case "parallel": {
      const da = m.a.direction ?? { x: 0, y: 0, z: 1 };
      const db = m.b.direction ?? { x: 0, y: 0, z: 1 };
      const wda = normalize(worldDir(pa, da));
      const wdb = normalize(worldDir(pb, db));
      return normSq(cross(wda, wdb));
    }
    case "distance": {
      const wa = worldPoint(pa, m.a.position);
      const wb = worldPoint(pb, m.b.position);
      const d = Math.sqrt(normSq(sub(wa, wb)));
      const target = m.value ?? 0;
      const e = d - target;
      return e * e;
    }
    case "angle": {
      const da = m.a.direction ?? { x: 0, y: 0, z: 1 };
      const db = m.b.direction ?? { x: 0, y: 0, z: 1 };
      const wda = normalize(worldDir(pa, da));
      const wdb = normalize(worldDir(pb, db));
      let c = dot(wda, wdb);
      if (c > 1) c = 1;
      if (c < -1) c = -1;
      const ang = Math.acos(c);
      const target = (m.value ?? 0) * DEG;
      const e = ang - target;
      return e * e;
    }
    default:
      return 0;
  }
}

function allResiduals(s: State, ms: Mate[]): Float64Array {
  const r = new Float64Array(ms.length);
  for (let i = 0; i < ms.length; i++) r[i] = residualFor(s, ms[i]);
  return r;
}

function totalError(r: Float64Array): number {
  let s = 0;
  for (let i = 0; i < r.length; i++) s += r[i];
  return s;
}

/* ------------------------------------------------------------- linear algebra */

function solveLinear(A: number[][], b: number[], lambda: number): number[] | null {
  const n = A.length;
  const M: number[][] = new Array(n);
  for (let i = 0; i < n; i++) {
    M[i] = new Array(n + 1);
    for (let j = 0; j < n; j++) M[i][j] = A[i][j] + (i === j ? lambda : 0);
    M[i][n] = b[i];
  }
  for (let k = 0; k < n; k++) {
    let piv = k;
    let max = Math.abs(M[k][k]);
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(M[i][k]);
      if (v > max) { max = v; piv = i; }
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

export function solveAssembly(input: AssemblySolveInput): AssemblySolveResult {
  const tol = input.tolerance ?? DEFAULT_TOL;
  const maxIter = input.maxIterations ?? DEFAULT_MAX_ITER;

  const state = buildState(input.parts);
  const mates = input.mates;

  const nonFixed = Array.from(state.parts.values()).filter((p) => !p.fixed).length;
  const rawDof = 6 * nonFixed;
  const dof = rawDof - mates.length;

  let residual = totalError(allResiduals(state, mates));
  let iterations = 0;

  // Trivial case: nothing to solve.
  if (state.dofCount === 0) {
    return packResult(state, mates, residual, dof, 0, tol);
  }

  let x = packX(state);
  let lambda = INIT_LAMBDA;

  for (let it = 0; it < maxIter; it++) {
    iterations = it + 1;
    if (residual < tol) break;

    const m = mates.length;
    const n = state.dofCount;
    const baseR = allResiduals(state, mates);
    const J: number[][] = new Array(m);
    for (let i = 0; i < m; i++) J[i] = new Array(n).fill(0);

    for (let j = 0; j < n; j++) {
      const orig = x[j];
      const step = Math.max(Math.abs(orig), 1) * FD_EPS;
      x[j] = orig + step;
      unpackX(state, x);
      const rPlus = allResiduals(state, mates);
      x[j] = orig;
      unpackX(state, x);
      for (let i = 0; i < m; i++) J[i][j] = (rPlus[i] - baseR[i]) / step;
    }

    // Normal equations A=JᵀJ, g=Jᵀr.
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
      lambda *= LAMBDA_UP;
      if (lambda > 1e12) break;
      continue;
    }

    let norm = 0;
    for (let i = 0; i < n; i++) norm += delta[i] * delta[i];
    norm = Math.sqrt(norm);
    if (norm > MAX_STEP) {
      const scale = MAX_STEP / norm;
      for (let i = 0; i < n; i++) delta[i] *= scale;
    }

    const xTrial = new Float64Array(n);
    for (let i = 0; i < n; i++) xTrial[i] = x[i] + delta[i];
    unpackX(state, xTrial);
    const trialRes = totalError(allResiduals(state, mates));

    if (trialRes < residual) {
      x = xTrial;
      residual = trialRes;
      lambda = Math.max(1e-12, lambda * LAMBDA_DOWN);
    } else {
      unpackX(state, x);
      lambda *= LAMBDA_UP;
      if (lambda > 1e12) break;
    }
  }

  return packResult(state, mates, residual, dof, iterations, tol);
}

/* --------------------------------------------------------------- result packer */

function packResult(
  state: State,
  mates: Mate[],
  residual: number,
  dof: number,
  iterations: number,
  tol: number
): AssemblySolveResult {
  const poses: PartPose[] = [];
  for (const id of state.order) {
    const p = state.parts.get(id)!;
    poses.push({
      id,
      fixed: p.fixed,
      translation: { x: p.tx, y: p.ty, z: p.tz },
      rotationDeg: {
        x: p.rx / DEG,
        y: p.ry / DEG,
        z: p.rz / DEG,
      },
    });
  }

  const conflictThreshold = tol * CONFLICT_RESIDUAL_MULT;
  const conflicts: { mateId: string; reason: string }[] = [];
  for (let i = 0; i < mates.length; i++) {
    const r = residualFor(state, mates[i]);
    if (r > conflictThreshold) {
      conflicts.push({
        mateId: mates[i].id,
        reason: `residual ${r.toExponential(3)} > ${conflictThreshold.toExponential(3)}`,
      });
    }
  }

  let status: AssemblySolveResult["status"];
  if (residual < tol && dof > 0) status = "under-constrained";
  else if (residual < tol) status = "solved";
  else if (dof < 0) status = "over-constrained";
  else status = "failed";

  return {
    status,
    poses,
    dof,
    residual,
    iterations,
    ...(conflicts.length > 0 ? { conflicts } : {}),
  };
}

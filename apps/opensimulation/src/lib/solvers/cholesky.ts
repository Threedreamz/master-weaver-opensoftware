/**
 * opensimulation/solvers/cholesky — sparse + dense SPD linear algebra.
 *
 * Dense Cholesky is used for small FE systems (< ~30 DOF). For larger sparse
 * assemblies we ship two iterative solvers:
 *   - solveSpdCg   : plain conjugate gradient (kept for backwards compat /
 *                    unit tests that pin against unpreconditioned behaviour).
 *   - solveSpdPcg  : Jacobi-preconditioned CG (M^-1 = diag(A)^-1). On a
 *                    well-scaled FEA stiffness matrix this typically halves
 *                    iteration count vs plain CG; the per-iteration overhead
 *                    is one extra n-length elementwise multiply, so total
 *                    wall-time drops roughly in proportion.
 *
 * Numerical equivalence: PCG converges to the same solution as CG within the
 * same residual tolerance (tol on ||r||/||b||), so callers can swap freely
 * without changing output to within ~1e-8.
 */

import { SolverError } from "../kernel-types";

/** Triplet describing a non-zero entry before CSR compression. */
export interface Triplet {
  row: number;
  col: number;
  val: number;
}

/** Sparse matrix in CSR (Compressed Sparse Row) storage. */
export interface SparseMatrix {
  n: number;
  rowPtr: Uint32Array;
  colIdx: Uint32Array;
  values: Float64Array;
}

/**
 * Build a SparseMatrix from a list of {row, col, val} triplets.
 * Duplicates are summed. Expects symmetric input but stores the full matrix
 * (both upper and lower entries must be provided by the caller).
 */
export function buildSparse(n: number, triplets: Array<Triplet>): SparseMatrix {
  const rowCounts = new Uint32Array(n);
  for (let i = 0; i < triplets.length; i++) {
    const t = triplets[i];
    if (t.row < 0 || t.row >= n || t.col < 0 || t.col >= n) {
      throw new SolverError("BAD_INPUT", `triplet out of bounds: (${t.row},${t.col})`);
    }
    rowCounts[t.row]++;
  }

  const rowStart = new Uint32Array(n + 1);
  for (let i = 0; i < n; i++) {
    rowStart[i + 1] = rowStart[i] + rowCounts[i];
  }

  const tmpCol = new Int32Array(triplets.length);
  const tmpVal = new Float64Array(triplets.length);
  const cursor = new Uint32Array(n);
  for (let i = 0; i < triplets.length; i++) {
    const t = triplets[i];
    const pos = rowStart[t.row] + cursor[t.row];
    tmpCol[pos] = t.col;
    tmpVal[pos] = t.val;
    cursor[t.row]++;
  }

  const mergedColIdx: number[] = [];
  const mergedValues: number[] = [];
  const mergedRowPtr = new Uint32Array(n + 1);

  for (let r = 0; r < n; r++) {
    mergedRowPtr[r] = mergedColIdx.length;
    const start = rowStart[r];
    const end = rowStart[r + 1];
    const rowEntries: Array<{ col: number; val: number }> = [];
    for (let k = start; k < end; k++) {
      rowEntries.push({ col: tmpCol[k], val: tmpVal[k] });
    }
    rowEntries.sort((a, b) => a.col - b.col);

    let i = 0;
    while (i < rowEntries.length) {
      let sum = rowEntries[i].val;
      const c = rowEntries[i].col;
      let j = i + 1;
      while (j < rowEntries.length && rowEntries[j].col === c) {
        sum += rowEntries[j].val;
        j++;
      }
      if (sum !== 0) {
        mergedColIdx.push(c);
        mergedValues.push(sum);
      }
      i = j;
    }
  }
  mergedRowPtr[n] = mergedColIdx.length;

  return {
    n,
    rowPtr: mergedRowPtr,
    colIdx: Uint32Array.from(mergedColIdx),
    values: Float64Array.from(mergedValues),
  };
}

/**
 * In-place dense Cholesky factorization of a flat row-major nxn SPD matrix.
 * Returns L in the lower triangle (upper triangle is left zeroed for clarity).
 * Throws SolverError("MATRIX_SINGULAR") when the matrix is not SPD. O(n^3).
 */
export function choleskyDense(matrix: Float64Array, n: number): Float64Array {
  const L = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = matrix[i * n + j];
      for (let k = 0; k < j; k++) {
        sum -= L[i * n + k] * L[j * n + k];
      }
      if (i === j) {
        if (sum <= 0) {
          throw new SolverError("MATRIX_SINGULAR", `non-SPD at pivot ${i}`);
        }
        L[i * n + j] = Math.sqrt(sum);
      } else {
        L[i * n + j] = sum / L[j * n + j];
      }
    }
  }
  return L;
}

/**
 * Solve Ax = b given the lower Cholesky factor L of A (so A = L L^T).
 * Performs forward substitution Ly = b, then backward substitution L^T x = y.
 * Returns a freshly allocated Float64Array of size n.
 */
export function solveCholeskyDense(L: Float64Array, n: number, b: Float64Array): Float64Array {
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = b[i];
    for (let k = 0; k < i; k++) {
      sum -= L[i * n + k] * y[k];
    }
    y[i] = sum / L[i * n + i];
  }

  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i];
    for (let k = i + 1; k < n; k++) {
      sum -= L[k * n + i] * x[k];
    }
    x[i] = sum / L[i * n + i];
  }
  return x;
}

/**
 * Convenience: solve Ax = b for dense SPD A (row-major flat Float64Array of
 * size n*n). Wraps choleskyDense + solveCholeskyDense.
 */
export function solveSpdDense(A: Float64Array, n: number, b: Float64Array): Float64Array {
  const L = choleskyDense(A, n);
  return solveCholeskyDense(L, n, b);
}

/** Sparse matrix-vector product: out = A * x. */
function spmv(A: SparseMatrix, x: Float64Array, out: Float64Array): void {
  const { n, rowPtr, colIdx, values } = A;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    const start = rowPtr[i];
    const end = rowPtr[i + 1];
    for (let k = start; k < end; k++) {
      sum += values[k] * x[colIdx[k]];
    }
    out[i] = sum;
  }
}

function dot(a: Float64Array, b: Float64Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * Conjugate-gradient solve for sparse SPD A. No preconditioner (M1).
 * Defaults: tol = 1e-8, maxIter = 1000. Throws SolverError("NOT_CONVERGED")
 * if residual norm does not drop below tol within maxIter iterations.
 */
export function solveSpdCg(
  A: SparseMatrix,
  b: Float64Array,
  tol = 1e-8,
  maxIter = 1000
): Float64Array {
  const n = A.n;
  if (b.length !== n) {
    throw new SolverError("BAD_INPUT", `rhs length ${b.length} != matrix dim ${n}`);
  }

  const x = new Float64Array(n);
  const r = new Float64Array(n);
  const p = new Float64Array(n);
  const Ap = new Float64Array(n);

  for (let i = 0; i < n; i++) r[i] = b[i];
  for (let i = 0; i < n; i++) p[i] = r[i];

  let rsOld = dot(r, r);
  const bNorm = Math.sqrt(dot(b, b));
  // bNorm === 0 means rhs is zero — solution is trivially the zero vector.
  const scale = bNorm > 0 ? bNorm : 1;

  if (Math.sqrt(rsOld) / scale < tol) return x;

  for (let iter = 0; iter < maxIter; iter++) {
    spmv(A, p, Ap);
    const pAp = dot(p, Ap);
    if (pAp <= 0) {
      throw new SolverError("MATRIX_SINGULAR", `non-SPD direction at iter ${iter} (pAp=${pAp})`);
    }
    const alpha = rsOld / pAp;

    for (let i = 0; i < n; i++) x[i] += alpha * p[i];
    for (let i = 0; i < n; i++) r[i] -= alpha * Ap[i];

    const rsNew = dot(r, r);
    if (Math.sqrt(rsNew) / scale < tol) return x;

    const beta = rsNew / rsOld;
    for (let i = 0; i < n; i++) p[i] = r[i] + beta * p[i];
    rsOld = rsNew;
  }

  throw new SolverError(
    "NOT_CONVERGED",
    `CG failed to converge within ${maxIter} iterations`
  );
}

/**
 * Build a Jacobi (diagonal) preconditioner for sparse SPD A:
 *   M_inv[i] = 1 / A[i][i]   (zero where the diagonal is missing or ~0).
 *
 * Walks the CSR row to find the diagonal entry; this is O(nnz) total and
 * runs once per solve. Diagonals that are exactly 0 (degenerate row) get
 * M_inv = 1, falling back to "no scaling" for that DOF rather than NaN — the
 * residual on that row stays unconditioned, which is the safest behaviour
 * for an FE assembly that has accidentally produced a zero diagonal.
 */
export function buildJacobiPreconditioner(A: SparseMatrix): Float64Array {
  const { n, rowPtr, colIdx, values } = A;
  const Minv = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const start = rowPtr[i];
    const end = rowPtr[i + 1];
    let diag = 0;
    for (let k = start; k < end; k++) {
      if (colIdx[k] === i) {
        diag = values[k];
        break;
      }
    }
    // Use Math.abs guard so PENALTY (1e30) and tiny non-zero diagonals both
    // produce a sensible reciprocal; only true zeros fall back to identity.
    Minv[i] = Math.abs(diag) > 0 ? 1 / diag : 1;
  }
  return Minv;
}

/**
 * Preconditioned conjugate gradient for sparse SPD A.
 *
 * Standard PCG (Saad, Iterative Methods for Sparse Linear Systems §9.2):
 *   r0 = b - A x0      (x0 = 0 here so r0 = b)
 *   z0 = M^-1 r0
 *   p0 = z0
 *   for k = 0, 1, ...
 *     alpha = (r_k . z_k) / (p_k . A p_k)
 *     x_{k+1} = x_k + alpha p_k
 *     r_{k+1} = r_k - alpha A p_k
 *     if ||r_{k+1}|| / ||b|| < tol: stop
 *     z_{k+1} = M^-1 r_{k+1}
 *     beta = (r_{k+1} . z_{k+1}) / (r_k . z_k)
 *     p_{k+1} = z_{k+1} + beta p_k
 *
 * Tolerance is checked on the *unpreconditioned* residual norm (||r||/||b||)
 * so callers comparing PCG vs CG output get the same accuracy guarantee.
 *
 * Defaults: tol = 1e-8, maxIter = 1000. Throws NOT_CONVERGED on failure.
 */
export function solveSpdPcg(
  A: SparseMatrix,
  b: Float64Array,
  Minv?: Float64Array,
  tol = 1e-8,
  maxIter = 1000
): Float64Array {
  const n = A.n;
  if (b.length !== n) {
    throw new SolverError("BAD_INPUT", `rhs length ${b.length} != matrix dim ${n}`);
  }

  const M = Minv ?? buildJacobiPreconditioner(A);
  if (M.length !== n) {
    throw new SolverError("BAD_INPUT", `preconditioner length ${M.length} != matrix dim ${n}`);
  }

  const x = new Float64Array(n);
  const r = new Float64Array(n);
  const z = new Float64Array(n);
  const p = new Float64Array(n);
  const Ap = new Float64Array(n);

  // r = b - A x  with x = 0  =>  r = b
  for (let i = 0; i < n; i++) r[i] = b[i];

  const bNorm = Math.sqrt(dot(b, b));
  const scale = bNorm > 0 ? bNorm : 1;
  if (Math.sqrt(dot(r, r)) / scale < tol) return x;

  // z = M^-1 r ; p = z
  for (let i = 0; i < n; i++) z[i] = M[i] * r[i];
  for (let i = 0; i < n; i++) p[i] = z[i];

  let rzOld = dot(r, z);

  for (let iter = 0; iter < maxIter; iter++) {
    spmv(A, p, Ap);
    const pAp = dot(p, Ap);
    if (pAp <= 0) {
      throw new SolverError("MATRIX_SINGULAR", `non-SPD direction at iter ${iter} (pAp=${pAp})`);
    }
    const alpha = rzOld / pAp;

    for (let i = 0; i < n; i++) x[i] += alpha * p[i];
    for (let i = 0; i < n; i++) r[i] -= alpha * Ap[i];

    const rNorm = Math.sqrt(dot(r, r));
    if (rNorm / scale < tol) return x;

    for (let i = 0; i < n; i++) z[i] = M[i] * r[i];
    const rzNew = dot(r, z);
    const beta = rzNew / rzOld;
    for (let i = 0; i < n; i++) p[i] = z[i] + beta * p[i];
    rzOld = rzNew;
  }

  throw new SolverError(
    "NOT_CONVERGED",
    `PCG failed to converge within ${maxIter} iterations`
  );
}

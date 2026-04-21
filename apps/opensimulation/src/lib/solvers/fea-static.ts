/**
 * opensimulation/solvers/fea-static — linear elastostatics on linear tet
 * elements. Assembles K, applies BCs via the penalty method, solves K u = f
 * with dense Cholesky for tiny problems or CG for larger systems.
 */

import { TetMesh, Material, BoundaryCondition, SolverError } from "../kernel-types";
import { buildSparse, solveSpdCg, solveSpdDense, Triplet } from "./cholesky";

export interface FeaResult {
  displacements: Float32Array;
  vonMises: Float32Array;
  maxDisplacementMm: number;
  maxStressMpa: number;
}

export interface FeaInput {
  mesh: TetMesh;
  material: Pick<Material, "youngModulus" | "poisson">;
  boundaryConditions: BoundaryCondition[];
}

// Penalty chosen safely above any realistic stiffness so Dirichlet-style
// "fix" BCs clamp displacement to ~0 without ruining the condition number
// at single-precision-ish tolerances.
const PENALTY = 1e30;

// Switch between dense Cholesky and CG — dense is O(n^3) but fine for toy FE.
const DENSE_DOF_LIMIT = 30;

/**
 * Solve linear static FEA for a TetMesh under the provided boundary
 * conditions. Returns nodal displacements (m, converted to mm for the
 * summary field) and node-averaged von Mises stress (Pa).
 */
export function solveFeaStatic(input: FeaInput): FeaResult {
  const { mesh, material, boundaryConditions } = input;
  const nVerts = mesh.vertices.length / 3;
  const nTets = mesh.tets.length / 4;
  const nDof = nVerts * 3;

  const hasFix = boundaryConditions.some((bc) => bc.kind === "fix");
  if (!hasFix) {
    throw new SolverError("BAD_INPUT", "no-BCs", { hint: "at least one 'fix' BC required to remove rigid-body modes" });
  }

  const D = buildElasticityMatrix(material.youngModulus, material.poisson);

  const triplets: Triplet[] = [];
  const elementB: Float64Array[] = new Array(nTets);
  const elementVol = new Float64Array(nTets);

  for (let t = 0; t < nTets; t++) {
    const i0 = mesh.tets[t * 4 + 0];
    const i1 = mesh.tets[t * 4 + 1];
    const i2 = mesh.tets[t * 4 + 2];
    const i3 = mesh.tets[t * 4 + 3];

    const { B, volume } = buildElementB(mesh.vertices, i0, i1, i2, i3);
    elementB[t] = B;
    elementVol[t] = volume;

    const Ke = computeKe(B, D, volume);
    const nodes = [i0, i1, i2, i3];
    for (let a = 0; a < 4; a++) {
      for (let ad = 0; ad < 3; ad++) {
        const globalRow = nodes[a] * 3 + ad;
        const localRow = a * 3 + ad;
        for (let b = 0; b < 4; b++) {
          for (let bd = 0; bd < 3; bd++) {
            const globalCol = nodes[b] * 3 + bd;
            const localCol = b * 3 + bd;
            const v = Ke[localRow * 12 + localCol];
            if (v !== 0) triplets.push({ row: globalRow, col: globalCol, val: v });
          }
        }
      }
    }
  }

  const f = new Float64Array(nDof);
  for (const bc of boundaryConditions) {
    if (bc.kind === "fix") {
      for (const nid of bc.nodeIds) {
        triplets.push({ row: nid * 3 + 0, col: nid * 3 + 0, val: PENALTY });
        triplets.push({ row: nid * 3 + 1, col: nid * 3 + 1, val: PENALTY });
        triplets.push({ row: nid * 3 + 2, col: nid * 3 + 2, val: PENALTY });
      }
    } else if (bc.kind === "load") {
      const mag = bc.magnitude;
      if (!mag || typeof mag === "number") {
        throw new SolverError("BAD_INPUT", "load BC needs Vec3 magnitude");
      }
      const perNode = 1 / Math.max(1, bc.nodeIds.length);
      for (const nid of bc.nodeIds) {
        f[nid * 3 + 0] += mag.x * perNode;
        f[nid * 3 + 1] += mag.y * perNode;
        f[nid * 3 + 2] += mag.z * perNode;
      }
    }
  }

  let u: Float64Array;
  if (nDof <= DENSE_DOF_LIMIT) {
    const dense = new Float64Array(nDof * nDof);
    for (const tr of triplets) dense[tr.row * nDof + tr.col] += tr.val;
    u = solveSpdDense(dense, nDof, f);
  } else {
    const K = buildSparse(nDof, triplets);
    u = solveSpdCg(K, f);
  }

  const displacements = new Float32Array(nDof);
  let maxDisp = 0;
  for (let i = 0; i < nVerts; i++) {
    const ux = u[i * 3 + 0];
    const uy = u[i * 3 + 1];
    const uz = u[i * 3 + 2];
    displacements[i * 3 + 0] = ux;
    displacements[i * 3 + 1] = uy;
    displacements[i * 3 + 2] = uz;
    const mag = Math.sqrt(ux * ux + uy * uy + uz * uz);
    if (mag > maxDisp) maxDisp = mag;
  }

  const nodeStressAccum = new Float64Array(nVerts);
  const nodeStressCount = new Uint32Array(nVerts);

  const ue = new Float64Array(12);
  const strain = new Float64Array(6);
  const stress = new Float64Array(6);
  for (let t = 0; t < nTets; t++) {
    const nodes = [
      mesh.tets[t * 4 + 0],
      mesh.tets[t * 4 + 1],
      mesh.tets[t * 4 + 2],
      mesh.tets[t * 4 + 3],
    ];
    for (let a = 0; a < 4; a++) {
      ue[a * 3 + 0] = u[nodes[a] * 3 + 0];
      ue[a * 3 + 1] = u[nodes[a] * 3 + 1];
      ue[a * 3 + 2] = u[nodes[a] * 3 + 2];
    }

    const B = elementB[t];
    for (let i = 0; i < 6; i++) {
      let s = 0;
      for (let j = 0; j < 12; j++) s += B[i * 12 + j] * ue[j];
      strain[i] = s;
    }
    for (let i = 0; i < 6; i++) {
      let s = 0;
      for (let j = 0; j < 6; j++) s += D[i * 6 + j] * strain[j];
      stress[i] = s;
    }

    const vm = vonMisesFromStress(stress);
    for (let a = 0; a < 4; a++) {
      nodeStressAccum[nodes[a]] += vm;
      nodeStressCount[nodes[a]]++;
    }
  }

  const vonMises = new Float32Array(nVerts);
  let maxStress = 0;
  for (let i = 0; i < nVerts; i++) {
    const v = nodeStressCount[i] > 0 ? nodeStressAccum[i] / nodeStressCount[i] : 0;
    vonMises[i] = v;
    if (v > maxStress) maxStress = v;
  }

  return {
    displacements,
    vonMises,
    maxDisplacementMm: maxDisp * 1000,
    maxStressMpa: maxStress / 1e6,
  };
}

function buildElasticityMatrix(E: number, nu: number): Float64Array {
  const D = new Float64Array(36);
  const c = E / ((1 + nu) * (1 - 2 * nu));
  const lam = c * nu;
  const mu2 = c * (1 - 2 * nu);
  const diag = c * (1 - nu);

  D[0 * 6 + 0] = diag;
  D[1 * 6 + 1] = diag;
  D[2 * 6 + 2] = diag;
  D[0 * 6 + 1] = lam;
  D[0 * 6 + 2] = lam;
  D[1 * 6 + 0] = lam;
  D[1 * 6 + 2] = lam;
  D[2 * 6 + 0] = lam;
  D[2 * 6 + 1] = lam;
  D[3 * 6 + 3] = mu2 / 2;
  D[4 * 6 + 4] = mu2 / 2;
  D[5 * 6 + 5] = mu2 / 2;
  return D;
}

function buildElementB(
  verts: Float32Array,
  i0: number,
  i1: number,
  i2: number,
  i3: number
): { B: Float64Array; volume: number } {
  const x0 = verts[i0 * 3 + 0], y0 = verts[i0 * 3 + 1], z0 = verts[i0 * 3 + 2];
  const x1 = verts[i1 * 3 + 0], y1 = verts[i1 * 3 + 1], z1 = verts[i1 * 3 + 2];
  const x2 = verts[i2 * 3 + 0], y2 = verts[i2 * 3 + 1], z2 = verts[i2 * 3 + 2];
  const x3 = verts[i3 * 3 + 0], y3 = verts[i3 * 3 + 1], z3 = verts[i3 * 3 + 2];

  const m = [
    [1, x0, y0, z0],
    [1, x1, y1, z1],
    [1, x2, y2, z2],
    [1, x3, y3, z3],
  ];
  const det6V = det4(m);
  const volume = Math.abs(det6V) / 6;
  if (volume < 1e-18) {
    throw new SolverError("BAD_INPUT", "degenerate tetrahedron (zero volume)");
  }
  const inv6V = 1 / det6V;

  const bs = [0, 0, 0, 0];
  const cs = [0, 0, 0, 0];
  const ds = [0, 0, 0, 0];
  const xs = [x0, x1, x2, x3];
  const ys = [y0, y1, y2, y3];
  const zs = [z0, z1, z2, z3];

  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const k = (i + 2) % 4;
    const l = (i + 3) % 4;
    const sign = i % 2 === 0 ? -1 : 1;
    bs[i] = sign * det3([
      [1, ys[j], zs[j]],
      [1, ys[k], zs[k]],
      [1, ys[l], zs[l]],
    ]) * inv6V;
    cs[i] = -sign * det3([
      [1, xs[j], zs[j]],
      [1, xs[k], zs[k]],
      [1, xs[l], zs[l]],
    ]) * inv6V;
    ds[i] = sign * det3([
      [1, xs[j], ys[j]],
      [1, xs[k], ys[k]],
      [1, xs[l], ys[l]],
    ]) * inv6V;
  }

  const B = new Float64Array(6 * 12);
  for (let n = 0; n < 4; n++) {
    const col = n * 3;
    B[0 * 12 + col + 0] = bs[n];
    B[1 * 12 + col + 1] = cs[n];
    B[2 * 12 + col + 2] = ds[n];
    B[3 * 12 + col + 0] = cs[n];
    B[3 * 12 + col + 1] = bs[n];
    B[4 * 12 + col + 1] = ds[n];
    B[4 * 12 + col + 2] = cs[n];
    B[5 * 12 + col + 0] = ds[n];
    B[5 * 12 + col + 2] = bs[n];
  }

  return { B, volume };
}

function computeKe(B: Float64Array, D: Float64Array, volume: number): Float64Array {
  const DB = new Float64Array(6 * 12);
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 12; j++) {
      let s = 0;
      for (let k = 0; k < 6; k++) s += D[i * 6 + k] * B[k * 12 + j];
      DB[i * 12 + j] = s;
    }
  }
  const Ke = new Float64Array(12 * 12);
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 12; j++) {
      let s = 0;
      for (let k = 0; k < 6; k++) s += B[k * 12 + i] * DB[k * 12 + j];
      Ke[i * 12 + j] = s * volume;
    }
  }
  return Ke;
}

function vonMisesFromStress(s: Float64Array): number {
  const sx = s[0], sy = s[1], sz = s[2];
  const sxy = s[3], syz = s[4], szx = s[5];
  const a = sx - sy;
  const b = sy - sz;
  const c = sz - sx;
  return Math.sqrt(0.5 * (a * a + b * b + c * c) + 3 * (sxy * sxy + syz * syz + szx * szx));
}

function det3(m: number[][]): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

function det4(m: number[][]): number {
  let d = 0;
  for (let j = 0; j < 4; j++) {
    const minor: number[][] = [];
    for (let r = 1; r < 4; r++) {
      const row: number[] = [];
      for (let c = 0; c < 4; c++) if (c !== j) row.push(m[r][c]);
      minor.push(row);
    }
    d += (j % 2 === 0 ? 1 : -1) * m[0][j] * det3(minor);
  }
  return d;
}

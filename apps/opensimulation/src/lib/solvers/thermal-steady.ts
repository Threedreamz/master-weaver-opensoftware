/**
 * opensimulation/solvers/thermal-steady — steady-state heat conduction.
 *
 * Linear tet elements, scalar temperature DOF per node. Builds the 4x4
 * element conductivity k·B^T·B·V, applies Dirichlet (temperature) BCs via
 * penalty and Neumann (heat_flux) BCs as nodal forces, then solves with CG.
 */

import { TetMesh, Material, BoundaryCondition, SolverError } from "../kernel-types";
import { buildSparse, solveSpdCg, solveSpdDense, Triplet } from "./cholesky";

export interface ThermalResult {
  temperatures: Float32Array;
  minTempC: number;
  maxTempC: number;
}

export interface ThermalInput {
  mesh: TetMesh;
  material: Pick<Material, "thermalConductivity">;
  boundaryConditions: BoundaryCondition[];
}

// Penalty for Dirichlet temperature BCs — large enough that enforced node
// temperature dominates the element contributions within reasonable precision.
const PENALTY = 1e20;
const DENSE_DOF_LIMIT = 30;

/**
 * Solve steady-state thermal conduction on a TetMesh. Returns per-node
 * temperatures (°C, same unit as the input BCs) plus min/max summaries.
 */
export function solveThermalSteady(input: ThermalInput): ThermalResult {
  const { mesh, material, boundaryConditions } = input;
  const nVerts = mesh.vertices.length / 3;
  const nTets = mesh.tets.length / 4;

  const hasTemp = boundaryConditions.some((bc) => bc.kind === "temperature");
  if (!hasTemp) {
    throw new SolverError("BAD_INPUT", "no-temperature-BCs", { hint: "at least one temperature BC required (steady-state is otherwise indeterminate)" });
  }

  const k = material.thermalConductivity;
  const triplets: Triplet[] = [];

  for (let t = 0; t < nTets; t++) {
    const i0 = mesh.tets[t * 4 + 0];
    const i1 = mesh.tets[t * 4 + 1];
    const i2 = mesh.tets[t * 4 + 2];
    const i3 = mesh.tets[t * 4 + 3];

    const { grads, volume } = buildShapeGradients(mesh.vertices, i0, i1, i2, i3);
    const nodes = [i0, i1, i2, i3];
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 4; b++) {
        const dot =
          grads[a * 3 + 0] * grads[b * 3 + 0] +
          grads[a * 3 + 1] * grads[b * 3 + 1] +
          grads[a * 3 + 2] * grads[b * 3 + 2];
        const kab = k * dot * volume;
        if (kab !== 0) {
          triplets.push({ row: nodes[a], col: nodes[b], val: kab });
        }
      }
    }
  }

  const f = new Float64Array(nVerts);
  for (const bc of boundaryConditions) {
    if (bc.kind === "temperature") {
      if (typeof bc.magnitude !== "number") {
        throw new SolverError("BAD_INPUT", "temperature BC needs scalar magnitude");
      }
      const tVal = bc.magnitude;
      for (const nid of bc.nodeIds) {
        triplets.push({ row: nid, col: nid, val: PENALTY });
        f[nid] += tVal * PENALTY;
      }
    } else if (bc.kind === "heat_flux") {
      if (typeof bc.magnitude !== "number") {
        throw new SolverError("BAD_INPUT", "heat_flux BC needs scalar magnitude");
      }
      const q = bc.magnitude;
      const perNode = 1 / Math.max(1, bc.nodeIds.length);
      for (const nid of bc.nodeIds) {
        f[nid] += q * perNode;
      }
    }
  }

  let u: Float64Array;
  if (nVerts <= DENSE_DOF_LIMIT) {
    const dense = new Float64Array(nVerts * nVerts);
    for (const tr of triplets) dense[tr.row * nVerts + tr.col] += tr.val;
    u = solveSpdDense(dense, nVerts, f);
  } else {
    const K = buildSparse(nVerts, triplets);
    u = solveSpdCg(K, f);
  }

  const temperatures = new Float32Array(nVerts);
  let minT = Infinity;
  let maxT = -Infinity;
  for (let i = 0; i < nVerts; i++) {
    const v = u[i];
    temperatures[i] = v;
    if (v < minT) minT = v;
    if (v > maxT) maxT = v;
  }

  return {
    temperatures,
    minTempC: nVerts > 0 ? minT : 0,
    maxTempC: nVerts > 0 ? maxT : 0,
  };
}

/**
 * Gradients of the 4 linear tet shape functions ∇N_a (constant per element),
 * returned as a 12-entry Float64Array [∂x0,∂y0,∂z0, ∂x1,..., ∂x3,∂y3,∂z3].
 */
function buildShapeGradients(
  verts: Float32Array,
  i0: number,
  i1: number,
  i2: number,
  i3: number
): { grads: Float64Array; volume: number } {
  const x0 = verts[i0 * 3 + 0], y0 = verts[i0 * 3 + 1], z0 = verts[i0 * 3 + 2];
  const x1 = verts[i1 * 3 + 0], y1 = verts[i1 * 3 + 1], z1 = verts[i1 * 3 + 2];
  const x2 = verts[i2 * 3 + 0], y2 = verts[i2 * 3 + 1], z2 = verts[i2 * 3 + 2];
  const x3 = verts[i3 * 3 + 0], y3 = verts[i3 * 3 + 1], z3 = verts[i3 * 3 + 2];

  const det6V = det4([
    [1, x0, y0, z0],
    [1, x1, y1, z1],
    [1, x2, y2, z2],
    [1, x3, y3, z3],
  ]);
  const volume = Math.abs(det6V) / 6;
  if (volume < 1e-18) {
    throw new SolverError("BAD_INPUT", "degenerate tetrahedron (zero volume)");
  }
  const inv6V = 1 / det6V;

  const grads = new Float64Array(12);
  const xs = [x0, x1, x2, x3];
  const ys = [y0, y1, y2, y3];
  const zs = [z0, z1, z2, z3];

  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const k = (i + 2) % 4;
    const l = (i + 3) % 4;
    const sign = i % 2 === 0 ? -1 : 1;

    const bi = sign * det3([
      [1, ys[j], zs[j]],
      [1, ys[k], zs[k]],
      [1, ys[l], zs[l]],
    ]) * inv6V;
    const ci = -sign * det3([
      [1, xs[j], zs[j]],
      [1, xs[k], zs[k]],
      [1, xs[l], zs[l]],
    ]) * inv6V;
    const di = sign * det3([
      [1, xs[j], ys[j]],
      [1, xs[k], ys[k]],
      [1, xs[l], ys[l]],
    ]) * inv6V;

    grads[i * 3 + 0] = bi;
    grads[i * 3 + 1] = ci;
    grads[i * 3 + 2] = di;
  }
  return { grads, volume };
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

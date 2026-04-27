/**
 * opensimulation/solvers/mesh-tet — trivial tetrahedralization for M1.
 *
 * Real Delaunay tet-meshing (tetgen) is an optional dep for M2. For now we
 * use a centroid-fan: split each surface triangle into a tet that closes on
 * the mesh centroid. Works for convex / star-shaped inputs only.
 */

import { TriMesh, TetMesh, BBox3, SolverError } from "../kernel-types";

/**
 * Coarse tet-mesh from a closed triangle surface mesh.
 * Strategy (M1 fallback):
 *   1. Compute centroid C of all vertex positions.
 *   2. For each surface triangle (a,b,c), emit tetrahedron (a,b,c,C).
 * O(n_tri). Non-Delaunay. Use tetgen for concave parts in M2.
 */
export function triMeshToTetMesh(tri: TriMesh): TetMesh {
  const verts = tri.vertices;
  const tris = tri.indices;
  const nVerts = verts.length / 3;
  const nTris = tris.length / 3;

  if (nVerts === 0 || nTris === 0) {
    throw new SolverError("BAD_INPUT", "triMeshToTetMesh: empty mesh");
  }

  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < verts.length; i += 3) {
    cx += verts[i];
    cy += verts[i + 1];
    cz += verts[i + 2];
  }
  cx /= nVerts;
  cy /= nVerts;
  cz /= nVerts;

  const outVerts = new Float32Array(verts.length + 3);
  outVerts.set(verts, 0);
  const centroidIdx = nVerts;
  outVerts[nVerts * 3 + 0] = cx;
  outVerts[nVerts * 3 + 1] = cy;
  outVerts[nVerts * 3 + 2] = cz;

  const outTets = new Uint32Array(nTris * 4);
  for (let t = 0; t < nTris; t++) {
    outTets[t * 4 + 0] = tris[t * 3 + 0];
    outTets[t * 4 + 1] = tris[t * 3 + 1];
    outTets[t * 4 + 2] = tris[t * 3 + 2];
    outTets[t * 4 + 3] = centroidIdx;
  }

  const bbox: BBox3 = {
    min: {
      x: Math.min(tri.bbox.min.x, cx),
      y: Math.min(tri.bbox.min.y, cy),
      z: Math.min(tri.bbox.min.z, cz),
    },
    max: {
      x: Math.max(tri.bbox.max.x, cx),
      y: Math.max(tri.bbox.max.y, cy),
      z: Math.max(tri.bbox.max.z, cz),
    },
  };

  return { vertices: outVerts, tets: outTets, bbox };
}

/**
 * Signed volume of a tetrahedron given 4 vertex indices into a flat
 * [x,y,z,...] Float32Array. Computed as |det([b-a, c-a, d-a])| / 6
 * via the scalar triple product.
 */
export function tetVolume(
  vertices: Float32Array,
  a: number,
  b: number,
  c: number,
  d: number
): number {
  const ax = vertices[a * 3 + 0];
  const ay = vertices[a * 3 + 1];
  const az = vertices[a * 3 + 2];

  const bx = vertices[b * 3 + 0] - ax;
  const by = vertices[b * 3 + 1] - ay;
  const bz = vertices[b * 3 + 2] - az;

  const cx = vertices[c * 3 + 0] - ax;
  const cy = vertices[c * 3 + 1] - ay;
  const cz = vertices[c * 3 + 2] - az;

  const dx = vertices[d * 3 + 0] - ax;
  const dy = vertices[d * 3 + 1] - ay;
  const dz = vertices[d * 3 + 2] - az;

  const crossX = cy * dz - cz * dy;
  const crossY = cz * dx - cx * dz;
  const crossZ = cx * dy - cy * dx;

  const triple = bx * crossX + by * crossY + bz * crossZ;
  return Math.abs(triple) / 6;
}

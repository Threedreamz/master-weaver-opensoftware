/**
 * opensimulation — canonical demo meshes.
 *
 * These are tiny, deterministic tet meshes used by the public landing page
 * to render a "real 3D simulator running in your browser" demo without
 * touching auth, projects, or user data. Keep them small so the dense
 * Cholesky path in the FEA solver evaluates in single-digit ms.
 */

import { bboxOfVertices, type TetMesh } from "@/lib/kernel-types";

/**
 * 2 × 1 × 1 m beam decomposed into 5 tetrahedra (canonical
 * box-to-5-tet split). 8 vertices, 5 tets, 24 DOF → solves with
 * dense Cholesky in <5 ms. Suitable for landing-page demos.
 *
 *   Layout (looking down +y):
 *     z↑
 *       4-----5
 *      /|    /|
 *     7-+---6 |
 *     | 0---|-1   →x
 *     |/    |/
 *     3-----2
 */
export function cantileverBeamMesh(): TetMesh {
  const vertices = new Float32Array([
    0, 0, 0, // 0
    2, 0, 0, // 1
    2, 1, 0, // 2
    0, 1, 0, // 3
    0, 0, 1, // 4
    2, 0, 1, // 5
    2, 1, 1, // 6
    0, 1, 1, // 7
  ]);
  // 5-tet box decomposition. v1 is the shared "core" vertex.
  const tets = new Uint32Array([
    0, 1, 3, 4,
    1, 2, 3, 6,
    1, 3, 4, 6,
    1, 4, 5, 6,
    3, 4, 6, 7,
  ]);
  return { vertices, tets, bbox: bboxOfVertices(vertices) };
}

/** Indices of the +x clamped face — fix these for a cantilever load case. */
export const BEAM_FIXED_FACE_NODES = [0, 3, 4, 7];

/** Indices of the −x free face — apply load here for a cantilever bend. */
export const BEAM_LOADED_FACE_NODES = [1, 2, 5, 6];

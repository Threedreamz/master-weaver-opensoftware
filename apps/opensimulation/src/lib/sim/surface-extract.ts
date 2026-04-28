/**
 * opensimulation — extract surface (boundary) triangles of a tet mesh.
 *
 * A tetrahedron has 4 triangular faces. In a closed volume mesh, every interior
 * face is shared by exactly 2 tets and every boundary face appears in exactly
 * 1 tet. We hash each face by its 3 sorted vertex indices and emit only the
 * faces with count == 1.
 *
 * Why this exists: the FEA / thermal solvers operate on the volumetric tet
 * mesh, but the 3D viewer only needs to render the visible outer skin. Sending
 * the whole tet connectivity to the client would (a) be 4x bigger and (b)
 * require the client to do this same boundary extraction before rendering.
 *
 * Output: Uint32Array indices [a,b,c, a,b,c, ...] referencing the same vertex
 * array the tet mesh uses — so per-vertex scalars (vonMises, temperature) and
 * per-vertex displacements line up without remapping.
 *
 * Note on face winding: we preserve the canonical face winding from each tet
 * (the four faces (1,2,3), (0,3,2), (0,1,3), (0,2,1) for tet (a,b,c,d) — these
 * point outward when the tet has positive volume in a right-handed system).
 * The viewer uses MeshBasicMaterial with side: DoubleSide so winding-driven
 * backface culling doesn't matter, but we keep it consistent for future
 * lit-shading upgrades.
 */

const TET_FACES: ReadonlyArray<readonly [number, number, number]> = [
  [1, 2, 3],
  [0, 3, 2],
  [0, 1, 3],
  [0, 2, 1],
];

interface FaceEntry {
  /** Original (un-sorted, winding-preserving) triplet for emission. */
  triplet: [number, number, number];
  /** How many tets share this face. */
  count: number;
}

/**
 * Extract the boundary surface triangles of a tetrahedral mesh.
 *
 * @param tets flat Uint32Array of [a,b,c,d, a,b,c,d, ...]
 * @returns Uint32Array of [a,b,c, a,b,c, ...] — surface triangle indices
 */
export function surfaceTrianglesOfTet(tets: Uint32Array): Uint32Array {
  const faces = new Map<string, FaceEntry>();

  const tetCount = tets.length / 4;
  for (let t = 0; t < tetCount; t++) {
    const i = t * 4;
    const v = [tets[i], tets[i + 1], tets[i + 2], tets[i + 3]] as const;
    for (const [fa, fb, fc] of TET_FACES) {
      const a = v[fa];
      const b = v[fb];
      const c = v[fc];
      // Hash key: sorted triplet so opposite-winded duplicates collide.
      const sorted = [a, b, c].sort((x, y) => x - y);
      const key = `${sorted[0]}|${sorted[1]}|${sorted[2]}`;
      const existing = faces.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        faces.set(key, { triplet: [a, b, c], count: 1 });
      }
    }
  }

  // Surface = faces seen exactly once.
  const surface: number[] = [];
  for (const entry of faces.values()) {
    if (entry.count === 1) {
      surface.push(entry.triplet[0], entry.triplet[1], entry.triplet[2]);
    }
  }

  return Uint32Array.from(surface);
}

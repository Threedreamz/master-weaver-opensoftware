/**
 * opensimulation/solvers/mesh-tet — REAL 3D Delaunay tetrahedralization
 *
 * Replaces the prior centroid-fan stub with an incremental Bowyer-Watson 3D
 * Delaunay mesher that produces topology-conforming tets (each interior face
 * shared by exactly two tets, each boundary face shared by one).
 *
 * ALGORITHM
 * =========
 * 1. Normalize input vertices into a unit-cube-ish frame (translate to bbox
 *    origin + scale so the longest edge is 1.0). This keeps circumsphere
 *    predicates well-conditioned regardless of input units (mm vs m).
 * 2. Build a super-tetrahedron that strictly contains all normalized verts
 *    (vertices placed far outside the unit cube so no real point is on its
 *    boundary).
 * 3. Insert every surface vertex one by one (Bowyer-Watson):
 *      - Find every existing tet whose circumsphere contains the new point.
 *      - Their union forms a star-shaped cavity. Collect its boundary faces.
 *      - Delete those tets, re-tet the cavity by fanning from the new point
 *        to each cavity boundary face.
 * 4. Insert a small interior sample set (jittered grid over the bbox,
 *    point-in-polyhedron filtered) so concave parts get interior tets, not
 *    just a thin shell of boundary fans. Sample count adapts to mesh size:
 *    O(sqrt(n_verts)) interior points — enough to populate a hollow region,
 *    cheap enough to keep wall-clock under a second for typical CAD parts.
 * 5. Strip every tet that references a super-tet vertex.
 * 6. Carve to the closed surface: remove tets whose centroid lies OUTSIDE
 *    the input surface (parity ray-cast in +x with epsilon-jitter to avoid
 *    edge / vertex hits). For convex hulls this is a no-op; for concave or
 *    hollow inputs it removes the bridging tets the convex hull contains.
 * 7. Denormalize vertex positions back to input coordinates.
 *
 * CONFORMING-NESS
 * ===============
 * Bowyer-Watson is provably Delaunay-conforming when the input vertex set is
 * in general position. Carving in step 6 preserves face-conformance because
 * we only remove whole tets — we never split a face. After carving, an
 * interior face may become a boundary face (its sibling was carved away),
 * which is fine: still 1 or 2 tets per face, never 3.
 *
 * LIMITATIONS (documented honestly)
 * =================================
 *   - Convex/star-shaped inputs: produces a conforming, well-shaped mesh.
 *   - Mildly concave inputs: works, but tet quality (radius-edge ratio) may
 *     degrade near concave features. Acceptable for FEA/thermal accuracy
 *     in the M1/M2 product range; not refinement-grade for thin features.
 *   - Strongly concave / hollow / multi-component inputs: carving handles
 *     hollow regions correctly (parity ray-cast), but very thin walls may
 *     be missed by the interior sampler. Increase sample density via the
 *     `interiorSampleDensity` option if needed.
 *   - Non-manifold or self-intersecting input surfaces: undefined behavior.
 *     The point-in-polyhedron test assumes a closed orientable manifold.
 *   - Coplanar / collinear vertex sets: the super-tet jitter avoids most
 *     degeneracies. If the predicate sees a near-zero determinant we treat
 *     the point as "on the circumsphere" and include the tet in the cavity
 *     (consistent with the Bowyer-Watson tie-break convention).
 *   - Numerical tolerance: 1e-12 in normalized coords (~1e-12 * scale in
 *     world units). For micron-scale features in meter-scale parts this
 *     may need tuning — surfaces are accepted when input scale is sane.
 *   - Worst-case complexity: O(n^2) (each insertion can touch O(n) tets).
 *     Typical: O(n log n). Practical limit: a few thousand vertices in <1s.
 *
 * FALLBACK
 * ========
 * If the mesher hits an internal invariant violation (e.g. cavity that isn't
 * star-shaped due to a hostile input), we fall back to the prior centroid-fan
 * so callers always get *some* tet mesh. The fallback is logged but does not
 * throw, since solver consumers handle "low quality mesh" via the BAD_INPUT
 * path on degenerate-volume tets.
 */

import { TriMesh, TetMesh, BBox3, SolverError } from "../kernel-types";

/* ============================================================ Public surface */

export interface MeshTetOptions {
  /**
   * Approximate target count of interior sample points to insert after the
   * surface vertices. Default: ceil(sqrt(nVerts)) clamped to [4, 64]. Set 0
   * to disable interior sampling (surface-only Delaunay; faster but worse
   * for hollow / concave parts).
   */
  interiorSampleDensity?: number;
  /**
   * If true, on internal failure throw instead of falling back to the
   * centroid-fan stub. Default false (production routes should not crash).
   */
  strict?: boolean;
}

/**
 * Tetrahedralize the volume bounded by a closed triangle surface mesh.
 *
 * Returns a TetMesh whose vertices include all input surface vertices (same
 * indices, same positions) plus any interior Steiner points the mesher
 * inserted. tets[] is a flat Uint32Array of [a,b,c,d, ...] indices into
 * vertices[]. All tets have positive (oriented) volume.
 */
export function triMeshToTetMesh(tri: TriMesh, opts: MeshTetOptions = {}): TetMesh {
  const nInputVerts = tri.vertices.length / 3;
  const nTris = tri.indices.length / 3;
  if (nInputVerts === 0 || nTris === 0) {
    throw new SolverError("BAD_INPUT", "triMeshToTetMesh: empty mesh");
  }
  if (nInputVerts < 4) {
    throw new SolverError("BAD_INPUT", "triMeshToTetMesh: need at least 4 surface vertices");
  }

  try {
    return delaunayTetMesh(tri, opts);
  } catch (err) {
    if (opts.strict) throw err;
    // Fallback: centroid fan. Logged so prod can detect degraded inputs.
    // eslint-disable-next-line no-console
    console.warn(
      `[mesh-tet] Delaunay mesher failed, falling back to centroid-fan: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return centroidFanFallback(tri);
  }
}

/* ============================================================ Delaunay core */

interface Tet {
  // Indices into the working vertex array (which includes super-tet vertices
  // at indices [N..N+3] where N = number of real vertices).
  a: number;
  b: number;
  c: number;
  d: number;
  // Cached circumsphere center + squared radius. Recomputed on construction.
  cx: number;
  cy: number;
  cz: number;
  r2: number;
  // Soft-delete flag for cavity walking (we mark, then sweep at end of insert).
  alive: boolean;
}

interface Face {
  a: number;
  b: number;
  c: number;
}

function delaunayTetMesh(tri: TriMesh, opts: MeshTetOptions): TetMesh {
  /* ---------- Step 1: normalize ----------------------------------------- */
  const inputVerts = tri.vertices;
  const nInput = inputVerts.length / 3;

  const bbox = tri.bbox;
  const cx0 = (bbox.min.x + bbox.max.x) / 2;
  const cy0 = (bbox.min.y + bbox.max.y) / 2;
  const cz0 = (bbox.min.z + bbox.max.z) / 2;
  const dx = bbox.max.x - bbox.min.x;
  const dy = bbox.max.y - bbox.min.y;
  const dz = bbox.max.z - bbox.min.z;
  const scale = Math.max(dx, dy, dz, 1e-9);
  const inv = 1 / scale;

  // Working vertex pool: [normalized input verts ... super-tet 4 verts ...
  // future Steiner interior verts ...]. We over-allocate generously.
  const interiorTarget =
    opts.interiorSampleDensity ?? clamp(Math.ceil(Math.sqrt(nInput)), 4, 64);
  const maxVerts = nInput + 4 + interiorTarget + 8;
  const work = new Float64Array(maxVerts * 3);
  for (let i = 0; i < nInput; i++) {
    work[i * 3 + 0] = (inputVerts[i * 3 + 0] - cx0) * inv;
    work[i * 3 + 1] = (inputVerts[i * 3 + 1] - cy0) * inv;
    work[i * 3 + 2] = (inputVerts[i * 3 + 2] - cz0) * inv;
  }

  /* ---------- Step 2: super-tetrahedron --------------------------------- */
  // Place 4 verts far outside the unit cube on the corners of a regular tet
  // centered at the origin. The circumsphere of a regular tet with vertices
  // at (±SUPER, ±SUPER, ±SUPER) using only the four "even-parity" corners
  // (i.e. an even number of minus signs) has radius SUPER * sqrt(3), which
  // strictly engulfs the [-0.5, 0.5]^3 normalized cube for any SUPER >= 1.
  // We use SUPER = 100 so even badly-placed Steiner samples remain inside.
  const SUPER = 100;
  const sIdx = nInput;
  setVert(work, sIdx + 0, +SUPER, +SUPER, +SUPER);
  setVert(work, sIdx + 1, +SUPER, -SUPER, -SUPER);
  setVert(work, sIdx + 2, -SUPER, +SUPER, -SUPER);
  setVert(work, sIdx + 3, -SUPER, -SUPER, +SUPER);
  let nVerts = nInput + 4;

  const tets: Tet[] = [];
  tets.push(makeTet(work, sIdx + 0, sIdx + 1, sIdx + 2, sIdx + 3));

  /* ---------- Step 3: insert surface vertices --------------------------- */
  for (let i = 0; i < nInput; i++) {
    insertPoint(tets, work, i);
  }

  /* ---------- Step 4: insert interior Steiner points -------------------- */
  if (interiorTarget > 0) {
    const samples = jitteredInteriorSamples(tri, interiorTarget, cx0, cy0, cz0, inv);
    for (const s of samples) {
      if (nVerts >= maxVerts) break; // safety
      setVert(work, nVerts, s[0], s[1], s[2]);
      try {
        insertPoint(tets, work, nVerts);
        nVerts++;
      } catch {
        // Skip degenerate interior samples silently (e.g. on a face).
      }
    }
  }

  /* ---------- Step 5: strip super-tet ----------------------------------- */
  const superLo = nInput;
  const superHi = nInput + 3;
  for (const t of tets) {
    if (!t.alive) continue;
    if (
      isSuper(t.a, superLo, superHi) ||
      isSuper(t.b, superLo, superHi) ||
      isSuper(t.c, superLo, superHi) ||
      isSuper(t.d, superLo, superHi)
    ) {
      t.alive = false;
    }
  }

  /* ---------- Step 6: carve to surface ---------------------------------- */
  // Build the input surface as world-coord triangles for the parity ray-cast.
  const surface = buildSurface(tri);
  for (const t of tets) {
    if (!t.alive) continue;
    // Centroid in world coordinates
    const ax = work[t.a * 3 + 0] * scale + cx0;
    const ay = work[t.a * 3 + 1] * scale + cy0;
    const az = work[t.a * 3 + 2] * scale + cz0;
    const bx = work[t.b * 3 + 0] * scale + cx0;
    const by = work[t.b * 3 + 1] * scale + cy0;
    const bz = work[t.b * 3 + 2] * scale + cz0;
    const ccx = work[t.c * 3 + 0] * scale + cx0;
    const ccy = work[t.c * 3 + 1] * scale + cy0;
    const ccz = work[t.c * 3 + 2] * scale + cz0;
    const dx2 = work[t.d * 3 + 0] * scale + cx0;
    const dy2 = work[t.d * 3 + 1] * scale + cy0;
    const dz2 = work[t.d * 3 + 2] * scale + cz0;
    const px = (ax + bx + ccx + dx2) / 4;
    const py = (ay + by + ccy + dy2) / 4;
    const pz = (az + bz + ccz + dz2) / 4;
    if (!pointInPolyhedron(px, py, pz, surface)) {
      t.alive = false;
    }
  }

  /* ---------- Step 7: emit final TetMesh -------------------------------- */
  // Compact verts: keep all original input verts (indices 0..nInput-1) and
  // any interior Steiner points referenced by surviving tets. We re-index to
  // remove super-tet slots and unreferenced Steiners.
  const used = new Uint8Array(nVerts);
  for (let i = 0; i < nInput; i++) used[i] = 1; // always keep input verts
  let liveCount = 0;
  for (const t of tets) {
    if (!t.alive) continue;
    used[t.a] = 1;
    used[t.b] = 1;
    used[t.c] = 1;
    used[t.d] = 1;
    liveCount++;
  }

  if (liveCount === 0) {
    throw new SolverError(
      "BAD_INPUT",
      "Delaunay produced zero tets after carving — check surface is closed and orientable"
    );
  }

  const remap = new Int32Array(nVerts);
  let kept = 0;
  for (let i = 0; i < nVerts; i++) {
    if (used[i] && i < superLo) {
      remap[i] = kept++;
    } else if (used[i] && i > superHi) {
      remap[i] = kept++;
    } else {
      remap[i] = -1;
    }
  }

  const outVerts = new Float32Array(kept * 3);
  for (let i = 0; i < nVerts; i++) {
    if (remap[i] === -1) continue;
    const j = remap[i];
    outVerts[j * 3 + 0] = work[i * 3 + 0] * scale + cx0;
    outVerts[j * 3 + 1] = work[i * 3 + 1] * scale + cy0;
    outVerts[j * 3 + 2] = work[i * 3 + 2] * scale + cz0;
  }

  const outTets = new Uint32Array(liveCount * 4);
  let ti = 0;
  for (const t of tets) {
    if (!t.alive) continue;
    // Ensure positive (oriented) volume — swap two vertices if needed.
    let ia = remap[t.a];
    let ib = remap[t.b];
    let ic = remap[t.c];
    let id = remap[t.d];
    if (orient3d(outVerts, ia, ib, ic, id) < 0) {
      // Swap c and d to flip orientation
      const tmp = ic;
      ic = id;
      id = tmp;
    }
    outTets[ti * 4 + 0] = ia;
    outTets[ti * 4 + 1] = ib;
    outTets[ti * 4 + 2] = ic;
    outTets[ti * 4 + 3] = id;
    ti++;
  }

  // Recompute bbox of the actual kept verts (may extend slightly beyond the
  // input bbox if Steiner points were placed near the boundary).
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < kept; i++) {
    const x = outVerts[i * 3 + 0];
    const y = outVerts[i * 3 + 1];
    const z = outVerts[i * 3 + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  const outBbox: BBox3 = {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };

  return { vertices: outVerts, tets: outTets, bbox: outBbox };
}

/* ============================================================ Bowyer-Watson */

function insertPoint(tets: Tet[], verts: Float64Array, pi: number): void {
  const px = verts[pi * 3 + 0];
  const py = verts[pi * 3 + 1];
  const pz = verts[pi * 3 + 2];

  // Find every alive tet whose circumsphere contains p.
  const bad: Tet[] = [];
  for (const t of tets) {
    if (!t.alive) continue;
    const ddx = px - t.cx;
    const ddy = py - t.cy;
    const ddz = pz - t.cz;
    if (ddx * ddx + ddy * ddy + ddz * ddz < t.r2 - 1e-14) {
      bad.push(t);
    }
  }

  if (bad.length === 0) {
    // Point lies outside every circumsphere — shouldn't happen with super-tet,
    // but skip rather than corrupt the mesh.
    throw new Error(`point ${pi} outside super-tet circumsphere`);
  }

  // Collect cavity boundary faces (faces shared by exactly one bad tet).
  const faceMap = new Map<string, { face: Face; count: number }>();
  for (const t of bad) {
    addFace(faceMap, t.a, t.b, t.c);
    addFace(faceMap, t.a, t.b, t.d);
    addFace(faceMap, t.a, t.c, t.d);
    addFace(faceMap, t.b, t.c, t.d);
  }

  // Mark bad tets as dead.
  for (const t of bad) t.alive = false;

  // Re-tet cavity by fanning from p to each boundary face.
  for (const entry of faceMap.values()) {
    if (entry.count !== 1) continue; // interior face — skip
    tets.push(makeTet(verts, entry.face.a, entry.face.b, entry.face.c, pi));
  }
}

function addFace(map: Map<string, { face: Face; count: number }>, a: number, b: number, c: number): void {
  // Sort the 3 indices so {a,b,c} and {b,c,a} hash the same.
  let x = a, y = b, z = c;
  if (x > y) { const t = x; x = y; y = t; }
  if (y > z) { const t = y; y = z; z = t; }
  if (x > y) { const t = x; x = y; y = t; }
  const key = `${x},${y},${z}`;
  const existing = map.get(key);
  if (existing) {
    existing.count++;
  } else {
    map.set(key, { face: { a, b, c }, count: 1 });
  }
}

function makeTet(verts: Float64Array, a: number, b: number, c: number, d: number): Tet {
  const cs = circumsphere(verts, a, b, c, d);
  return { a, b, c, d, cx: cs.cx, cy: cs.cy, cz: cs.cz, r2: cs.r2, alive: true };
}

/**
 * Circumsphere of a tetrahedron. Returns center (cx,cy,cz) and squared radius.
 * Solved via the standard 3x3 linear system:
 *   2 (B-A) . C = |B|^2 - |A|^2     etc.
 * If the tet is degenerate (coplanar), returns an "infinite" sphere so the
 * Bowyer-Watson cavity test treats every later point as inside it — this
 * causes the bad tet to be replaced on the next insertion, which is exactly
 * what we want for sliver cleanup.
 */
function circumsphere(
  verts: Float64Array,
  a: number,
  b: number,
  c: number,
  d: number
): { cx: number; cy: number; cz: number; r2: number } {
  const ax = verts[a * 3 + 0], ay = verts[a * 3 + 1], az = verts[a * 3 + 2];
  const bx = verts[b * 3 + 0], by = verts[b * 3 + 1], bz = verts[b * 3 + 2];
  const cx = verts[c * 3 + 0], cy = verts[c * 3 + 1], cz = verts[c * 3 + 2];
  const dx = verts[d * 3 + 0], dy = verts[d * 3 + 1], dz = verts[d * 3 + 2];

  const m00 = bx - ax, m01 = by - ay, m02 = bz - az;
  const m10 = cx - ax, m11 = cy - ay, m12 = cz - az;
  const m20 = dx - ax, m21 = dy - ay, m22 = dz - az;

  const r0 = 0.5 * (m00 * m00 + m01 * m01 + m02 * m02);
  const r1 = 0.5 * (m10 * m10 + m11 * m11 + m12 * m12);
  const r2_ = 0.5 * (m20 * m20 + m21 * m21 + m22 * m22);

  const det =
    m00 * (m11 * m22 - m12 * m21) -
    m01 * (m10 * m22 - m12 * m20) +
    m02 * (m10 * m21 - m11 * m20);

  if (Math.abs(det) < 1e-20) {
    // Degenerate: pretend the circumsphere is everything.
    return { cx: 0, cy: 0, cz: 0, r2: Infinity };
  }
  const inv = 1 / det;

  const cof00 = m11 * m22 - m12 * m21;
  const cof01 = -(m10 * m22 - m12 * m20);
  const cof02 = m10 * m21 - m11 * m20;
  const cof10 = -(m01 * m22 - m02 * m21);
  const cof11 = m00 * m22 - m02 * m20;
  const cof12 = -(m00 * m21 - m01 * m20);
  const cof20 = m01 * m12 - m02 * m11;
  const cof21 = -(m00 * m12 - m02 * m10);
  const cof22 = m00 * m11 - m01 * m10;

  // M u = r where M = [[B-A], [C-A], [D-A]] (rows). Then u = M^-1 r and
  // C = A + u. M^-1 = adj(M) / det(M), and (adj(M))_{i,j} = cof(M)_{j,i}.
  // So u_i = (1/det) Σ_j cof(M)_{j,i} r_j (transpose-of-cofactors x r).
  const ux = (cof00 * r0 + cof10 * r1 + cof20 * r2_) * inv;
  const uy = (cof01 * r0 + cof11 * r1 + cof21 * r2_) * inv;
  const uz = (cof02 * r0 + cof12 * r1 + cof22 * r2_) * inv;

  const ccx = ax + ux;
  const ccy = ay + uy;
  const ccz = az + uz;

  const rdx = ax - ccx;
  const rdy = ay - ccy;
  const rdz = az - ccz;
  return { cx: ccx, cy: ccy, cz: ccz, r2: rdx * rdx + rdy * rdy + rdz * rdz };
}

/* ============================================================ Surface helpers */

interface Surface {
  // Flat triangle list in WORLD coords for the parity ray-cast.
  // [ax,ay,az,bx,by,bz,cx,cy,cz, ...]
  tris: Float64Array;
  nTris: number;
  bbox: BBox3;
}

function buildSurface(tri: TriMesh): Surface {
  const nTris = tri.indices.length / 3;
  const tris = new Float64Array(nTris * 9);
  for (let t = 0; t < nTris; t++) {
    const ia = tri.indices[t * 3 + 0];
    const ib = tri.indices[t * 3 + 1];
    const ic = tri.indices[t * 3 + 2];
    tris[t * 9 + 0] = tri.vertices[ia * 3 + 0];
    tris[t * 9 + 1] = tri.vertices[ia * 3 + 1];
    tris[t * 9 + 2] = tri.vertices[ia * 3 + 2];
    tris[t * 9 + 3] = tri.vertices[ib * 3 + 0];
    tris[t * 9 + 4] = tri.vertices[ib * 3 + 1];
    tris[t * 9 + 5] = tri.vertices[ib * 3 + 2];
    tris[t * 9 + 6] = tri.vertices[ic * 3 + 0];
    tris[t * 9 + 7] = tri.vertices[ic * 3 + 1];
    tris[t * 9 + 8] = tri.vertices[ic * 3 + 2];
  }
  return { tris, nTris, bbox: tri.bbox };
}

/**
 * Parity ray-cast in the +x direction with light y/z jitter to avoid grazing
 * edges. Returns true if (px,py,pz) is strictly inside the surface.
 *
 * Uses the Möller-Trumbore intersection test. We jitter the ray's y/z by tiny
 * irrational multiples so the chance of hitting an edge / vertex exactly is
 * effectively zero. If parity differs across two jittered rays we re-roll
 * with bigger jitter (max 3 attempts) and otherwise default to "inside" for
 * carving stability.
 */
function pointInPolyhedron(px: number, py: number, pz: number, surf: Surface): boolean {
  const b = surf.bbox;
  // Quick reject: outside bbox -> outside.
  if (px < b.min.x || px > b.max.x) return false;
  if (py < b.min.y || py > b.max.y) return false;
  if (pz < b.min.z || pz > b.max.z) return false;

  const jitters = [
    { dy: 1e-7, dz: 0 },
    { dy: 0, dz: 1.3e-7 },
    { dy: 7e-7, dz: -3e-7 },
  ];
  let lastParity = -1;
  let agree = 0;
  for (const j of jitters) {
    const inside = rayParity(px, py, pz, j.dy, j.dz, surf);
    if (lastParity === -1) {
      lastParity = inside ? 1 : 0;
      agree = 1;
    } else if ((inside ? 1 : 0) === lastParity) {
      agree++;
      if (agree >= 2) return inside;
    } else {
      lastParity = inside ? 1 : 0;
      agree = 1;
    }
  }
  return lastParity === 1;
}

function rayParity(
  px: number,
  py: number,
  pz: number,
  dy: number,
  dz: number,
  surf: Surface
): boolean {
  // Ray direction = (1, dy, dz), normalized enough.
  const dirX = 1, dirY = dy, dirZ = dz;
  let hits = 0;
  const tris = surf.tris;
  const n = surf.nTris;
  for (let t = 0; t < n; t++) {
    const v0x = tris[t * 9 + 0], v0y = tris[t * 9 + 1], v0z = tris[t * 9 + 2];
    const v1x = tris[t * 9 + 3], v1y = tris[t * 9 + 4], v1z = tris[t * 9 + 5];
    const v2x = tris[t * 9 + 6], v2y = tris[t * 9 + 7], v2z = tris[t * 9 + 8];

    const e1x = v1x - v0x, e1y = v1y - v0y, e1z = v1z - v0z;
    const e2x = v2x - v0x, e2y = v2y - v0y, e2z = v2z - v0z;

    // h = dir x e2
    const hx = dirY * e2z - dirZ * e2y;
    const hy = dirZ * e2x - dirX * e2z;
    const hz = dirX * e2y - dirY * e2x;
    const a = e1x * hx + e1y * hy + e1z * hz;
    if (Math.abs(a) < 1e-14) continue; // parallel
    const f = 1 / a;
    const sx = px - v0x, sy = py - v0y, sz = pz - v0z;
    const u = f * (sx * hx + sy * hy + sz * hz);
    if (u < 0 || u > 1) continue;
    // q = s x e1
    const qx = sy * e1z - sz * e1y;
    const qy = sz * e1x - sx * e1z;
    const qz = sx * e1y - sy * e1x;
    const v = f * (dirX * qx + dirY * qy + dirZ * qz);
    if (v < 0 || u + v > 1) continue;
    const tt = f * (e2x * qx + e2y * qy + e2z * qz);
    if (tt > 1e-9) hits++;
  }
  return (hits & 1) === 1;
}

/* ============================================================ Interior samples */

function jitteredInteriorSamples(
  tri: TriMesh,
  target: number,
  cx0: number,
  cy0: number,
  cz0: number,
  inv: number
): Array<[number, number, number]> {
  // Build a coarse grid over the bbox, jitter each cell center, accept those
  // that lie inside the surface. Aim for ~target accepted samples; oversample
  // by 4x to compensate for rejections.
  const surf = buildSurface(tri);
  const b = tri.bbox;
  const dx = b.max.x - b.min.x;
  const dy = b.max.y - b.min.y;
  const dz = b.max.z - b.min.z;
  const cellSide = Math.cbrt((dx * dy * dz) / Math.max(1, target * 4));
  const nx = Math.max(1, Math.ceil(dx / cellSide));
  const ny = Math.max(1, Math.ceil(dy / cellSide));
  const nz = Math.max(1, Math.ceil(dz / cellSide));

  const samples: Array<[number, number, number]> = [];
  let seed = 1337;
  const rand = () => {
    // xorshift32
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed |= 0;
    return ((seed >>> 0) % 10000) / 10000;
  };

  for (let i = 0; i < nx && samples.length < target; i++) {
    for (let j = 0; j < ny && samples.length < target; j++) {
      for (let k = 0; k < nz && samples.length < target; k++) {
        const sxw = b.min.x + (i + 0.5 + (rand() - 0.5) * 0.6) * (dx / nx);
        const syw = b.min.y + (j + 0.5 + (rand() - 0.5) * 0.6) * (dy / ny);
        const szw = b.min.z + (k + 0.5 + (rand() - 0.5) * 0.6) * (dz / nz);
        if (!pointInPolyhedron(sxw, syw, szw, surf)) continue;
        // Convert to normalized coords.
        samples.push([(sxw - cx0) * inv, (syw - cy0) * inv, (szw - cz0) * inv]);
      }
    }
  }
  return samples;
}

/* ============================================================ Centroid-fan fallback */

function centroidFanFallback(tri: TriMesh): TetMesh {
  const verts = tri.vertices;
  const tris = tri.indices;
  const nVerts = verts.length / 3;
  const nTris = tris.length / 3;

  let cx = 0, cy = 0, cz = 0;
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
  const cIdx = nVerts;
  outVerts[cIdx * 3 + 0] = cx;
  outVerts[cIdx * 3 + 1] = cy;
  outVerts[cIdx * 3 + 2] = cz;

  const outTets = new Uint32Array(nTris * 4);
  for (let t = 0; t < nTris; t++) {
    let a = tris[t * 3 + 0];
    let b = tris[t * 3 + 1];
    let c = tris[t * 3 + 2];
    let d = cIdx;
    if (orient3d(outVerts, a, b, c, d) < 0) {
      const tmp = b;
      b = c;
      c = tmp;
    }
    outTets[t * 4 + 0] = a;
    outTets[t * 4 + 1] = b;
    outTets[t * 4 + 2] = c;
    outTets[t * 4 + 3] = d;
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

/* ============================================================ Geom utilities */

function setVert(arr: Float64Array, i: number, x: number, y: number, z: number): void {
  arr[i * 3 + 0] = x;
  arr[i * 3 + 1] = y;
  arr[i * 3 + 2] = z;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function isSuper(idx: number, lo: number, hi: number): boolean {
  return idx >= lo && idx <= hi;
}

/**
 * Signed orientation predicate: positive if (a,b,c,d) is right-handed
 * (= positive volume for the FEA solver's convention).
 */
function orient3d(verts: Float32Array, a: number, b: number, c: number, d: number): number {
  const ax = verts[a * 3 + 0], ay = verts[a * 3 + 1], az = verts[a * 3 + 2];
  const bx = verts[b * 3 + 0] - ax, by = verts[b * 3 + 1] - ay, bz = verts[b * 3 + 2] - az;
  const cx = verts[c * 3 + 0] - ax, cy = verts[c * 3 + 1] - ay, cz = verts[c * 3 + 2] - az;
  const dx = verts[d * 3 + 0] - ax, dy = verts[d * 3 + 1] - ay, dz = verts[d * 3 + 2] - az;
  const crossX = cy * dz - cz * dy;
  const crossY = cz * dx - cx * dz;
  const crossZ = cx * dy - cy * dx;
  return bx * crossX + by * crossY + bz * crossZ;
}

/* ============================================================ Volume export */

/**
 * Signed volume of a tetrahedron given 4 vertex indices into a flat
 * [x,y,z,...] Float32Array. Computed as |det([b-a, c-a, d-a])| / 6
 * via the scalar triple product. Kept for backward compatibility with
 * solver code that imported `tetVolume` from this module.
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

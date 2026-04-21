/**
 * opencad — loft operation.
 *
 * Builds a solid by stitching together ≥2 planar cross-sections (rings),
 * each a CCW polygon in the XY plane with an associated `z` height.
 *
 * Contract:
 *  - All sections must have the SAME vertex count N (≥3). Vertex `j` in
 *    ring `i` is connected to vertex `j` in ring `i+1` (no profile
 *    resampling, no correspondence-solver — caller pre-aligns).
 *  - Sections are sorted by `z` ascending before stitching; duplicate z
 *    values are rejected.
 *  - Side walls: adjacent rings connected with two triangles per edge
 *    (quad strip), wound CCW for outward-facing normals given CCW profiles.
 *  - End caps: centroid-fan triangulation at the bottom (z_min, normal
 *    pointing −Z) and top (z_max, normal pointing +Z). Non-convex profiles
 *    will self-intersect under fan triangulation — caller must supply
 *    convex sections for correct caps.
 *  - Closed ring-loft (`options.closed=true`): adds a wrap-around side
 *    strip from the last ring back to the first AND SKIPS the end caps.
 *    This produces a closed tube/torus-like cyclic surface — it is not
 *    a closed manifold volume (the open "straw" through the ring centers
 *    is intentionally unsealed). `volumeMm3` from the tetra-sum is still
 *    returned but will be non-physical for a ring-loft.
 *
 * Units: mm. Server-safe (no DOM).
 *
 * Replicad TODO: once OCCT is vendored, delegate to BREP loft for exact
 * surface continuity, rails/guide curves, and profile resampling.
 */
import * as THREE from "three";
import {
  type SolidResult,
  type Point2,
  exportBoundingBox,
  computeVolumeMm3,
} from "../cad-kernel";

export interface LoftSection {
  points: readonly Point2[];
  z: number;
}

export interface LoftOptions {
  /**
   * Ring-loft: connect the last section back to the first as an additional
   * side strip. When true, end caps at z_min / z_max are skipped (see file
   * header for the rationale). Default: false.
   */
  closed?: boolean;
  /** Reserved for future use (curve subdivision between rings). */
  rampSamples?: number;
}

const Z_EPSILON = 1e-9;

/**
 * Loft ≥2 cross-sections into a solid. See file header for the full contract.
 */
export function loft(
  sections: readonly LoftSection[],
  options: LoftOptions = {}
): SolidResult {
  if (sections.length < 2) {
    throw new Error("loft: need ≥2 sections");
  }

  const n = sections[0].points.length;
  if (n < 3) {
    throw new Error("loft: each section needs ≥3 points");
  }
  for (let i = 0; i < sections.length; i += 1) {
    if (sections[i].points.length < 3) {
      throw new Error("loft: each section needs ≥3 points");
    }
    if (sections[i].points.length !== n) {
      throw new Error("loft: all sections must have equal vertex count");
    }
  }

  // Sort a COPY ascending by z (don't mutate caller input).
  const ordered = sections.slice().sort((a, b) => a.z - b.z);
  for (let i = 1; i < ordered.length; i += 1) {
    if (Math.abs(ordered[i].z - ordered[i - 1].z) < Z_EPSILON) {
      throw new Error("loft: section z values must be unique");
    }
  }

  const closed = options.closed === true;
  const m = ordered.length;

  // Vertex buffer layout:
  //   [0 .. m*n)      — ring vertices (ring i, vertex j) at index i*n + j
  //   m*n             — bottom centroid (unused if closed)
  //   m*n + 1         — top centroid    (unused if closed)
  const totalVerts = m * n + 2;
  const positions = new Float32Array(totalVerts * 3);

  // Write ring vertices.
  for (let i = 0; i < m; i += 1) {
    const ring = ordered[i];
    for (let j = 0; j < n; j += 1) {
      const base = (i * n + j) * 3;
      positions[base + 0] = ring.points[j].x;
      positions[base + 1] = ring.points[j].y;
      positions[base + 2] = ring.z;
    }
  }

  // Centroid of first (bottom) and last (top) ring.
  const bottomIdx = m * n;
  const topIdx = m * n + 1;
  {
    let cx = 0;
    let cy = 0;
    for (let j = 0; j < n; j += 1) {
      cx += ordered[0].points[j].x;
      cy += ordered[0].points[j].y;
    }
    positions[bottomIdx * 3 + 0] = cx / n;
    positions[bottomIdx * 3 + 1] = cy / n;
    positions[bottomIdx * 3 + 2] = ordered[0].z;
  }
  {
    let cx = 0;
    let cy = 0;
    for (let j = 0; j < n; j += 1) {
      cx += ordered[m - 1].points[j].x;
      cy += ordered[m - 1].points[j].y;
    }
    positions[topIdx * 3 + 0] = cx / n;
    positions[topIdx * 3 + 1] = cy / n;
    positions[topIdx * 3 + 2] = ordered[m - 1].z;
  }

  // Index buffer.
  const indices: number[] = [];

  // Side walls — stitch ring i to ring i+1.
  // For CCW profiles and i+1 above i, the outward-facing winding is:
  //   (A[j], A[j2], B[j2]) and (A[j], B[j2], B[j])
  // where A = lower ring, B = upper ring.
  const stitchRings = (loIdx: number, hiIdx: number) => {
    const aBase = loIdx * n;
    const bBase = hiIdx * n;
    for (let j = 0; j < n; j += 1) {
      const j2 = (j + 1) % n;
      const a0 = aBase + j;
      const a1 = aBase + j2;
      const b0 = bBase + j;
      const b1 = bBase + j2;
      indices.push(a0, a1, b1);
      indices.push(a0, b1, b0);
    }
  };

  for (let i = 0; i < m - 1; i += 1) {
    stitchRings(i, i + 1);
  }
  if (closed) {
    // Wrap last ring back to first. Keep the same winding direction as the
    // main stitch (low→high in z terms); geometrically this "low" is the
    // top ring and "high" is the bottom ring.
    stitchRings(m - 1, 0);
  }

  // End caps — skip for ring-loft (see header).
  if (!closed) {
    // Bottom cap at z_min: normal points −Z, so wind (centroid, j2, j).
    const aBase = 0;
    for (let j = 0; j < n; j += 1) {
      const j2 = (j + 1) % n;
      indices.push(bottomIdx, aBase + j2, aBase + j);
    }
    // Top cap at z_max: normal points +Z, wind (centroid, j, j2).
    const tBase = (m - 1) * n;
    for (let j = 0; j < n; j += 1) {
      const j2 = (j + 1) % n;
      indices.push(topIdx, tBase + j, tBase + j2);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return {
    mesh: geom,
    bbox: exportBoundingBox(geom),
    volumeMm3: computeVolumeMm3(geom),
  };
}

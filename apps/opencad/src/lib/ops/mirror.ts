/**
 * opencad — mirror (reflection) operator.
 *
 * Reflects a `THREE.BufferGeometry` across an arbitrary plane defined by a
 * point (origin) and a non-zero normal. Optionally merges the reflected
 * geometry with the original into a single combined `BufferGeometry`.
 *
 * Pure JS, server-safe (no DOM, no window). Units: mm.
 *
 * Algorithm (Householder reflection about a plane through P0 with normal n):
 *   x' = x - 2 * ((x - P0) · n) * n
 *      = R · x + t
 *   where R = I - 2·n·nᵀ  (3×3, det = -1)
 *         t = 2·(P0·n)·n
 *
 * Because R has negative determinant, triangle winding is flipped after the
 * transform. We swap the 2nd and 3rd index of each triangle to restore CCW
 * winding so `computeVertexNormals()` produces outward normals.
 *
 * Limitations:
 *   - Assumes triangulated input (indexed or non-indexed triangle lists).
 *   - No CSG union when `keepOriginal=true`; if the original and reflection
 *     overlap, coincident/interior faces are preserved. A clean boolean
 *     merge would require `booleanOp(..., "union")` from the kernel.
 *   - Only the `position` attribute is carried through the merge; UVs,
 *     colors, custom attrs are dropped. Normals are always recomputed.
 *   - Not BREP-aware; once the kernel swaps to replicad this should delegate.
 */
import * as THREE from "three";
import {
  type SolidResult,
  exportBoundingBox,
  computeVolumeMm3,
} from "../cad-kernel";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Plane {
  /** Plane normal — must be non-zero; will be normalized internally. */
  normal: Vec3;
  /** Any point on the plane. */
  origin: Vec3;
}

export interface MirrorOptions {
  /** If true (default), merge the original geometry with its reflection. */
  keepOriginal?: boolean;
}

const EPS_NORMAL = 1e-10;

/**
 * Build a Matrix4 representing reflection about the plane (P0, n̂).
 * Column-major layout for Three.js `Matrix4.set(...)` (row-major args).
 */
function buildReflectionMatrix(nx: number, ny: number, nz: number, px: number, py: number, pz: number): THREE.Matrix4 {
  // R = I - 2·n·nᵀ
  const r00 = 1 - 2 * nx * nx;
  const r01 = -2 * nx * ny;
  const r02 = -2 * nx * nz;
  const r10 = -2 * ny * nx;
  const r11 = 1 - 2 * ny * ny;
  const r12 = -2 * ny * nz;
  const r20 = -2 * nz * nx;
  const r21 = -2 * nz * ny;
  const r22 = 1 - 2 * nz * nz;

  // Translation t = 2·(P0·n)·n
  const d = px * nx + py * ny + pz * nz;
  const tx = 2 * d * nx;
  const ty = 2 * d * ny;
  const tz = 2 * d * nz;

  const m = new THREE.Matrix4();
  m.set(
    r00, r01, r02, tx,
    r10, r11, r12, ty,
    r20, r21, r22, tz,
    0, 0, 0, 1,
  );
  return m;
}

/**
 * Flip triangle winding in-place. After a reflection (det R = -1) the
 * triangle orientation reverses; swapping the 2nd and 3rd index per triangle
 * restores the original CCW/CW convention so outward normals stay outward.
 *
 * If the geometry is indexed, we swap pairs in the index buffer. If not, we
 * swap the position vectors themselves in the attribute.
 */
function flipWinding(geom: THREE.BufferGeometry): void {
  const idx = geom.getIndex();
  if (idx) {
    const arr = idx.array as Uint16Array | Uint32Array;
    for (let t = 0; t + 2 < arr.length; t += 3) {
      const b = arr[t + 1];
      arr[t + 1] = arr[t + 2];
      arr[t + 2] = b;
    }
    idx.needsUpdate = true;
    return;
  }
  const pos = geom.getAttribute("position");
  if (!pos) return;
  const arr = pos.array as Float32Array;
  // Swap vertex 1 and vertex 2 of each triangle (each vertex = 3 floats).
  for (let t = 0; t < pos.count; t += 3) {
    const i1 = (t + 1) * 3;
    const i2 = (t + 2) * 3;
    const x = arr[i1 + 0];
    const y = arr[i1 + 1];
    const z = arr[i1 + 2];
    arr[i1 + 0] = arr[i2 + 0];
    arr[i1 + 1] = arr[i2 + 1];
    arr[i1 + 2] = arr[i2 + 2];
    arr[i2 + 0] = x;
    arr[i2 + 1] = y;
    arr[i2 + 2] = z;
  }
  pos.needsUpdate = true;
}

/**
 * Merge two geometries' `position` attributes (and indices, if both share
 * the same indexed/non-indexed state). Any non-position attributes are
 * dropped. Normals will be recomputed by the caller.
 */
function mergePositionOnly(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  let aSrc = a;
  let bSrc = b;
  const aIdx = aSrc.getIndex();
  const bIdx = bSrc.getIndex();

  // Normalize to same indexing: if either is non-indexed, convert both.
  if ((aIdx === null) !== (bIdx === null)) {
    aSrc = aIdx ? aSrc.toNonIndexed() : aSrc;
    bSrc = bIdx ? bSrc.toNonIndexed() : bSrc;
  }

  const aPos = aSrc.getAttribute("position") as THREE.BufferAttribute;
  const bPos = bSrc.getAttribute("position") as THREE.BufferAttribute;
  const aArr = aPos.array as Float32Array;
  const bArr = bPos.array as Float32Array;

  const merged = new THREE.BufferGeometry();
  const combined = new Float32Array(aArr.length + bArr.length);
  combined.set(aArr, 0);
  combined.set(bArr, aArr.length);
  merged.setAttribute("position", new THREE.BufferAttribute(combined, 3));

  const aIdx2 = aSrc.getIndex();
  const bIdx2 = bSrc.getIndex();
  if (aIdx2 && bIdx2) {
    const offset = aPos.count;
    const aIdxArr = aIdx2.array;
    const bIdxArr = bIdx2.array;
    const combinedCount = aIdxArr.length + bIdxArr.length;
    const totalVerts = aPos.count + bPos.count;
    const useU32 = totalVerts > 65535;
    const combinedIdx = useU32 ? new Uint32Array(combinedCount) : new Uint16Array(combinedCount);
    for (let i = 0; i < aIdxArr.length; i += 1) combinedIdx[i] = aIdxArr[i];
    for (let i = 0; i < bIdxArr.length; i += 1) combinedIdx[aIdxArr.length + i] = bIdxArr[i] + offset;
    merged.setIndex(new THREE.BufferAttribute(combinedIdx, 1));
  }
  return merged;
}

/**
 * Reflect a geometry across a plane, optionally merging with the original.
 *
 * @param geom   Source triangulated BufferGeometry (not modified).
 * @param plane  Plane definition (origin + non-zero normal).
 * @param options Optional flags. Defaults: `{ keepOriginal: true }`.
 * @returns SolidResult with bbox + volumeMm3 + mesh (normals recomputed).
 *
 * @throws If `plane.normal` is effectively zero (length < 1e-10).
 *
 * @example
 *   import { createBox } from "../cad-kernel";
 *   import { mirror } from "./mirror";
 *   const box = createBox(10, 10, 10);
 *   const mirrored = mirror(box.mesh, {
 *     normal: { x: 1, y: 0, z: 0 },
 *     origin: { x: 0, y: 0, z: 0 },
 *   }, { keepOriginal: true });
 */
export function mirror(
  geom: THREE.BufferGeometry,
  plane: Plane,
  options?: MirrorOptions,
): SolidResult {
  const keepOriginal = options?.keepOriginal ?? true;

  const nx0 = plane.normal.x;
  const ny0 = plane.normal.y;
  const nz0 = plane.normal.z;
  const nLen = Math.sqrt(nx0 * nx0 + ny0 * ny0 + nz0 * nz0);
  if (!Number.isFinite(nLen) || nLen < EPS_NORMAL) {
    throw new Error("mirror: plane.normal must be non-zero");
  }
  const nx = nx0 / nLen;
  const ny = ny0 / nLen;
  const nz = nz0 / nLen;

  const M = buildReflectionMatrix(nx, ny, nz, plane.origin.x, plane.origin.y, plane.origin.z);

  // Clone source; strip non-position attributes from the clone so the merge
  // path is deterministic and we don't fight stale normals.
  const reflected = geom.clone();
  // Keep only position + index; drop others.
  const attrNames = Object.keys(reflected.attributes);
  for (const name of attrNames) {
    if (name !== "position") reflected.deleteAttribute(name);
  }
  reflected.applyMatrix4(M);
  flipWinding(reflected);

  let outGeom: THREE.BufferGeometry;
  if (keepOriginal) {
    // Build a position-only clone of the original for merging.
    const originalPosOnly = new THREE.BufferGeometry();
    const origPos = geom.getAttribute("position") as THREE.BufferAttribute;
    originalPosOnly.setAttribute(
      "position",
      new THREE.BufferAttribute((origPos.array as Float32Array).slice(), 3),
    );
    const origIdx = geom.getIndex();
    if (origIdx) {
      originalPosOnly.setIndex(
        new THREE.BufferAttribute((origIdx.array as Uint16Array | Uint32Array).slice(), 1),
      );
    }
    outGeom = mergePositionOnly(originalPosOnly, reflected);
  } else {
    outGeom = reflected;
  }

  outGeom.computeVertexNormals();

  return {
    mesh: outGeom,
    bbox: exportBoundingBox(outGeom),
    volumeMm3: computeVolumeMm3(outGeom),
  };
}

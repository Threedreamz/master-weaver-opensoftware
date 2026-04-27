import * as THREE from "three";
import {
  exportBoundingBox,
  computeVolumeMm3,
  type SolidResult,
} from "../cad-kernel";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PatternCircularOptions {
  /** Total sweep angle in degrees. Valid range: (0, 360]. Default 360. */
  totalAngleDeg?: number;
  /**
   * When true, copies are centered around angle 0, distributed across ±half of
   * totalAngleDeg (useful for symmetric fan patterns). When false (default),
   * copies start at angle 0 and step forward.
   */
  symmetric?: boolean;
}

/**
 * Rotationally duplicate `geom` around a world-space (axis, origin) line,
 * returning a merged `SolidResult`.
 *
 * The rotation for each copy i is constructed as
 *   M_i = T(+origin) · R(axis, θ_i) · T(-origin)
 * so the axis line passes through `origin`, not the world origin.
 *
 * Non-symmetric: θ_i = i · (totalAngleDeg / count)   (full-circle defaults to
 *                                                     360/N, no endpoint overlap)
 * Symmetric:     θ_i = (i - (count-1)/2) · (totalAngleDeg / (count-1))
 *                                                     (copies span ±half of total)
 */
export function patternCircular(
  geom: THREE.BufferGeometry,
  axis: Vec3,
  origin: Vec3,
  count: number,
  options: PatternCircularOptions = {},
): SolidResult {
  // --- VALIDATION ---
  if (!Number.isFinite(count) || count < 1 || !Number.isInteger(count)) {
    throw new Error("patternCircular: count must be an integer >= 1");
  }
  const totalAngleDeg = options.totalAngleDeg ?? 360;
  if (
    !Number.isFinite(totalAngleDeg) ||
    totalAngleDeg <= 0 ||
    totalAngleDeg > 360
  ) {
    throw new Error("patternCircular: totalAngleDeg must be in (0, 360]");
  }
  const axisVec = new THREE.Vector3(axis.x, axis.y, axis.z);
  if (axisVec.lengthSq() === 0) {
    throw new Error("patternCircular: axis must be non-zero");
  }
  axisVec.normalize();
  const originVec = new THREE.Vector3(origin.x, origin.y, origin.z);

  // --- EARLY EXIT (count === 1) ---
  if (count === 1) {
    const clone = geom.clone();
    clone.computeVertexNormals();
    return {
      mesh: clone,
      bbox: exportBoundingBox(clone),
      volumeMm3: computeVolumeMm3(clone),
    };
  }

  // --- STEP + OFFSET ---
  const denom = options.symmetric ? (count - 1 || 1) : count;
  const stepAngleRad = (totalAngleDeg / denom) * (Math.PI / 180);
  const baseOffsetRad = options.symmetric
    ? -((count - 1) / 2) * stepAngleRad
    : 0;

  // --- ACCUMULATORS ---
  const srcPos = geom.getAttribute("position");
  if (!srcPos) {
    throw new Error(
      "patternCircular: source geometry missing position attribute",
    );
  }
  const srcIdx = geom.getIndex();
  const vertsPerCopy = srcPos.count;
  const posChunks: Float32Array[] = [];
  const idxChunks: Uint32Array[] = [];

  for (let i = 0; i < count; i += 1) {
    const angle = baseOffsetRad + i * stepAngleRad;
    // M = T(+origin) · R(axis, θ) · T(-origin)
    const m = new THREE.Matrix4()
      .makeTranslation(originVec.x, originVec.y, originVec.z)
      .multiply(new THREE.Matrix4().makeRotationAxis(axisVec, angle))
      .multiply(
        new THREE.Matrix4().makeTranslation(
          -originVec.x,
          -originVec.y,
          -originVec.z,
        ),
      );

    const cloned = geom.clone();
    cloned.applyMatrix4(m);
    const cp = cloned.getAttribute("position");
    // Copy into an owned Float32Array so downstream ownership is clean.
    posChunks.push(new Float32Array(cp.array as Float32Array));

    if (srcIdx) {
      const srcArr = srcIdx.array as Uint32Array | Uint16Array;
      const off = i * vertsPerCopy;
      const rebuilt = new Uint32Array(srcArr.length);
      for (let j = 0; j < srcArr.length; j += 1) {
        rebuilt[j] = srcArr[j] + off;
      }
      idxChunks.push(rebuilt);
    }
    cloned.dispose();
  }

  // --- CONCAT ---
  const totalVerts = posChunks.reduce((a, c) => a + c.length, 0);
  const posOut = new Float32Array(totalVerts);
  {
    let o = 0;
    for (const c of posChunks) {
      posOut.set(c, o);
      o += c.length;
    }
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(posOut, 3));

  if (srcIdx) {
    const totalIdx = idxChunks.reduce((a, c) => a + c.length, 0);
    const idxOut = new Uint32Array(totalIdx);
    let o = 0;
    for (const c of idxChunks) {
      idxOut.set(c, o);
      o += c.length;
    }
    merged.setIndex(new THREE.BufferAttribute(idxOut, 1));
  }

  merged.computeVertexNormals();
  return {
    mesh: merged,
    bbox: exportBoundingBox(merged),
    volumeMm3: computeVolumeMm3(merged),
  };
}

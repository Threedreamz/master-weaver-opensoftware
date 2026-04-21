import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { exportBoundingBox, computeVolumeMm3, type SolidResult } from "../cad-kernel";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PatternAxis {
  direction: Vec3;
  count: number;
  spacing: number;
}

/**
 * Rectangular (1D/2D) linear pattern.
 * Duplicates `geom` across a uniformly spaced grid defined by `axisA` (and
 * optionally `axisB`) and returns a merged `SolidResult`.
 *
 * - `count` must be an integer >= 1.
 * - `spacing` must be > 0 when `count > 1`.
 * - Direction vectors are normalised internally; zero-length vectors throw.
 * - Non-position attributes (normals/uvs) are stripped before merging so
 *   `mergeGeometries` sees identical attribute sets. Vertex normals are
 *   recomputed on the merged result.
 */
export function patternLinear(
  geom: THREE.BufferGeometry,
  axisA: PatternAxis,
  axisB?: PatternAxis,
): SolidResult {
  validateAxis(axisA, "axisA");
  if (axisB) validateAxis(axisB, "axisB");

  const dirA = normalizeVec3(axisA.direction);
  const dirB = axisB ? normalizeVec3(axisB.direction) : null;

  const countB = axisB?.count ?? 1;
  const spacingB = axisB?.spacing ?? 0;

  const clones: THREE.BufferGeometry[] = [];
  for (let i = 0; i < axisA.count; i += 1) {
    for (let j = 0; j < countB; j += 1) {
      const ox =
        i * axisA.spacing * dirA.x + (dirB ? j * spacingB * dirB.x : 0);
      const oy =
        i * axisA.spacing * dirA.y + (dirB ? j * spacingB * dirB.y : 0);
      const oz =
        i * axisA.spacing * dirA.z + (dirB ? j * spacingB * dirB.z : 0);
      const c = geom.clone();
      c.translate(ox, oy, oz);
      clones.push(c);
    }
  }

  const normalized = clones.map(stripToPositionOnly);

  const merged = mergeGeometries(normalized, false);
  if (!merged) {
    throw new Error(
      "patternLinear: mergeGeometries returned null (attribute mismatch)",
    );
  }

  merged.computeVertexNormals();

  return {
    mesh: merged,
    bbox: exportBoundingBox(merged),
    volumeMm3: computeVolumeMm3(merged),
  };
}

function validateAxis(ax: PatternAxis, name: string): void {
  if (!Number.isInteger(ax.count) || ax.count < 1) {
    throw new Error(
      `patternLinear: ${name}.count must be integer >= 1 (got ${ax.count})`,
    );
  }
  if (ax.count > 1 && !(ax.spacing > 0)) {
    throw new Error(
      `patternLinear: ${name}.spacing must be > 0 when count > 1 (got ${ax.spacing})`,
    );
  }
}

function normalizeVec3(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z);
  if (len === 0) {
    throw new Error("patternLinear: axis direction cannot be zero vector");
  }
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function stripToPositionOnly(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  const pos = g.getAttribute("position");
  if (pos) out.setAttribute("position", pos);
  const idx = g.getIndex();
  if (idx) out.setIndex(idx);
  return out;
}

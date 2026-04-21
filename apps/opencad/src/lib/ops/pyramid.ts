import * as THREE from "three";
import {
  type SolidResult,
  exportBoundingBox,
  computeVolumeMm3,
} from "../cad-kernel";

/**
 * Create an n-sided pyramid solid centered at the origin with axis along +Z.
 *
 * Uses `THREE.CylinderGeometry(0, baseRadius, height, sides, 1, false)` which
 * collapses the top radius to a point — yielding a pyramid whose base is a
 * regular n-gon inscribed in a circle of `baseRadius` (circumradius) and whose
 * apex sits `height` mm above the base plane.
 *
 * `CylinderGeometry` orients along +Y by default; we rotate by π/2 around X so
 * the axis aligns with +Z for consistency with the rest of the CAD kernel.
 *
 * @param sides       Number of base sides, must be ≥3 (3=triangle, 4=square, …)
 * @param baseRadius  Circumradius of the base n-gon in mm, must be >0
 * @param height      Apex height above the base plane in mm, must be >0
 */
export function createPyramid(
  sides: number,
  baseRadius: number,
  height: number
): SolidResult {
  if (!Number.isFinite(sides) || sides < 3) {
    throw new Error(`createPyramid: sides must be ≥3 (got ${sides})`);
  }
  if (!Number.isFinite(baseRadius) || baseRadius <= 0) {
    throw new Error(`createPyramid: baseRadius must be >0 (got ${baseRadius})`);
  }
  if (!Number.isFinite(height) || height <= 0) {
    throw new Error(`createPyramid: height must be >0 (got ${height})`);
  }

  const segments = Math.floor(sides);
  const geom = new THREE.CylinderGeometry(0, baseRadius, height, segments, 1, false);
  // CylinderGeometry orients along +Y. Rotate so the axis is +Z.
  geom.rotateX(Math.PI / 2);
  geom.computeVertexNormals();

  return {
    mesh: geom,
    bbox: exportBoundingBox(geom),
    volumeMm3: computeVolumeMm3(geom),
  };
}

/**
 * opencad — cone primitive.
 *
 * Z-axis cone / frustum centered at origin. Pass `radiusTop = 0` for a
 * sharp-tipped cone; any positive `radiusTop` yields a truncated cone
 * (frustum). Matches the orientation convention of `createCylinder` in
 * cad-kernel.ts (CylinderGeometry is Y-axis by default, we rotate it onto Z).
 *
 * Units: millimeters (mm). Node-compatible (no DOM).
 */
import * as THREE from "three";
import {
  type SolidResult,
  exportBoundingBox,
  computeVolumeMm3,
} from "../cad-kernel";

/**
 * Create a Z-axis cone (or frustum) centered at the origin.
 *
 * @param radiusBase  Radius at the bottom cap (z = -h/2). Must be > 0.
 * @param radiusTop   Radius at the top cap (z = +h/2). Must be ≥ 0;
 *                    pass 0 for a sharp-tipped cone.
 * @param height      Cone height along Z in mm. Must be > 0.
 * @param radialSegments  Number of radial segments (default 48).
 */
export function createCone(
  radiusBase: number,
  radiusTop: number,
  height: number,
  radialSegments: number = 48
): SolidResult {
  if (!(radiusBase > 0)) {
    throw new Error(
      `createCone: radiusBase must be > 0 (got ${radiusBase})`
    );
  }
  if (!(height > 0)) {
    throw new Error(`createCone: height must be > 0 (got ${height})`);
  }
  if (!(radiusTop >= 0)) {
    throw new Error(
      `createCone: radiusTop must be ≥ 0 (got ${radiusTop})`
    );
  }

  // CylinderGeometry(topRadius, bottomRadius, height, ...) — note the
  // argument order: top first. It is oriented along Y by default; rotate
  // onto Z to match createCylinder's convention.
  const geom = new THREE.CylinderGeometry(
    radiusTop,
    radiusBase,
    height,
    Math.max(3, radialSegments),
    1,
    false
  );
  geom.rotateX(Math.PI / 2);
  geom.computeVertexNormals();

  return {
    mesh: geom,
    bbox: exportBoundingBox(geom),
    volumeMm3: computeVolumeMm3(geom),
  };
}

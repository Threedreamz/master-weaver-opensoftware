/**
 * opencad — torus primitive.
 *
 * Thin wrapper over THREE.TorusGeometry. Torus is centered at origin with its
 * symmetry axis aligned to +Z (TorusGeometry defaults to the XY plane / Z axis,
 * so no re-orientation is needed — matching the convention other primitives in
 * cad-kernel.ts use for CAD workflows).
 *
 * Supports partial tori via `arcDeg` ∈ (0, 360].
 *
 * Units: millimeters (mm).
 */
import * as THREE from "three";
import {
  type SolidResult,
  exportBoundingBox,
  computeVolumeMm3,
} from "../cad-kernel";

/**
 * Torus centered at origin, axis along +Z.
 *
 * @param majorRadius    Distance from the center of the torus to the center of the tube.
 * @param minorRadius    Tube radius.
 * @param arcDeg         Sweep angle in degrees (default 360). Values in (0, 360].
 * @param radialSegments Segments around the tube cross-section (default 16).
 * @param tubularSegments Segments around the main ring (default 48).
 */
export function createTorus(
  majorRadius: number,
  minorRadius: number,
  arcDeg: number = 360,
  radialSegments: number = 16,
  tubularSegments: number = 48
): SolidResult {
  if (!(minorRadius > 0)) {
    throw new Error(
      `createTorus: minorRadius must be > 0 (got ${minorRadius})`
    );
  }
  if (!(majorRadius > minorRadius)) {
    throw new Error(
      `createTorus: majorRadius (${majorRadius}) must be > minorRadius (${minorRadius})`
    );
  }
  if (!(arcDeg > 0 && arcDeg <= 360)) {
    throw new Error(
      `createTorus: arcDeg must be in (0, 360] (got ${arcDeg})`
    );
  }

  const arcRad = (arcDeg * Math.PI) / 180;
  const geom = new THREE.TorusGeometry(
    majorRadius,
    minorRadius,
    radialSegments,
    tubularSegments,
    arcRad
  );
  // TorusGeometry already lies in the XY plane with symmetry axis +Z — matches
  // the CAD convention (Z-up). No rotation needed.
  geom.computeVertexNormals();
  return {
    mesh: geom,
    bbox: exportBoundingBox(geom),
    volumeMm3: computeVolumeMm3(geom),
  };
}

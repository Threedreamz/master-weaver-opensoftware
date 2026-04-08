"use client";

import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Place inside the R3F Canvas to expose camera preset control
 * AND publish camera angles for the ViewCube overlay.
 *
 * - `window.__openslicerCameraPreset(pos)` — snaps camera to a position
 * - `window.__openslicerCameraAngles()` — returns { rx, ry } in degrees for CSS cube rotation
 */
export function CameraPresetController() {
  const { camera, controls } = useThree();

  // Expose the preset function (same as before)
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__openslicerCameraPreset = (
      pos: [number, number, number]
    ) => {
      camera.position.set(...pos);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      if (controls && "target" in controls) {
        (controls as unknown as { target: THREE.Vector3; update: () => void }).target.set(0, 0, 0);
        (controls as unknown as { update: () => void }).update();
      }
    };

    // Expose camera angles for the ViewCube (CSS 3D rotation sync).
    // We convert the camera position to spherical coordinates and then to
    // euler-style rotateX / rotateY values that make the CSS cube visually
    // match the 3D camera orientation.
    (window as unknown as Record<string, unknown>).__openslicerCameraAngles = () => {
      const target = new THREE.Vector3(0, 0, 0);
      if (controls && "target" in controls) {
        target.copy((controls as unknown as { target: THREE.Vector3 }).target);
      }
      const dir = new THREE.Vector3().subVectors(camera.position, target);
      const spherical = new THREE.Spherical().setFromVector3(dir);

      // spherical.phi = polar angle from Y+ (0 = top, PI = bottom)
      // spherical.theta = azimuth in XZ plane from Z+ (like longitude)
      const elevationDeg = -(90 - THREE.MathUtils.radToDeg(spherical.phi));
      const azimuthDeg = -THREE.MathUtils.radToDeg(spherical.theta);

      return { rx: elevationDeg, ry: azimuthDeg };
    };
  }

  return null;
}

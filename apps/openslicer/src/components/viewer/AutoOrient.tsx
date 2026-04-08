"use client";

import { useCallback } from "react";
import * as THREE from "three";
import { useSlicerStore } from "../../stores/slicer-store";

export function AutoOrient() {
  const { selectedFace, setSelectedFace, updateModelRotation, toggleFaceSelection } =
    useSlicerStore();

  const handlePlaceOnBuildPlate = useCallback(() => {
    if (!selectedFace) return;

    const faceNormal = new THREE.Vector3(
      selectedFace.normal[0],
      selectedFace.normal[1],
      selectedFace.normal[2]
    ).normalize();

    // Compute quaternion to rotate face normal to point downward (-Y)
    const targetDirection = new THREE.Vector3(0, -1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(faceNormal, targetDirection);

    // Convert to Euler angles
    const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");

    const rotation: [number, number, number] = [euler.x, euler.y, euler.z];

    updateModelRotation(selectedFace.modelId, rotation);
    setSelectedFace(null);
    toggleFaceSelection();
  }, [selectedFace, updateModelRotation, setSelectedFace, toggleFaceSelection]);

  const handleCancel = useCallback(() => {
    setSelectedFace(null);
    toggleFaceSelection();
  }, [setSelectedFace, toggleFaceSelection]);

  if (!selectedFace) return null;

  const normal = selectedFace.normal;
  const angleFromVertical = Math.round(
    (Math.acos(Math.abs(normal[1])) * 180) / Math.PI
  );

  return (
    <div className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2">
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 px-4 py-3 shadow-2xl backdrop-blur-sm">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Auto-Orient
        </div>

        <div className="mb-3 space-y-1 text-sm text-zinc-300">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Normal:</span>
            <span className="font-mono text-xs">
              [{normal.map((n) => n.toFixed(3)).join(", ")}]
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Angle from vertical:</span>
            <span className="font-mono text-xs">{angleFromVertical}&deg;</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePlaceOnBuildPlate}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-500"
          >
            Place on Build Plate
          </button>
          <button
            onClick={handleCancel}
            className="rounded-md border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

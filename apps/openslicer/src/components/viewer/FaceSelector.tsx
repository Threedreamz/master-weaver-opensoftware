"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { useLoader } from "@react-three/fiber";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface FaceSelectorProps {
  url: string;
  enabled: boolean;
  onFaceSelected: (faceIndex: number, normal: [number, number, number]) => void;
}

export function FaceSelector({ url, enabled, onFaceSelected }: FaceSelectorProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(null);
  const [labelPosition, setLabelPosition] = useState<THREE.Vector3 | null>(null);
  const [labelNormal, setLabelNormal] = useState<[number, number, number] | null>(null);

  const geometry = useLoader(STLLoader, url);

  // Center geometry the same way as ModelLoader
  const centeredGeometry = useMemo(() => {
    const geo = geometry.clone();
    geo.computeBoundingBox();

    if (geo.boundingBox) {
      const center = new THREE.Vector3();
      geo.boundingBox.getCenter(center);
      geo.translate(-center.x, -geo.boundingBox.min.y, -center.z);
    }

    geo.computeVertexNormals();
    return geo;
  }, [geometry]);

  // Create highlight geometry for the selected face
  const highlightGeometry = useMemo(() => {
    if (selectedFaceIndex === null) return null;

    const posAttr = centeredGeometry.getAttribute("position");
    if (!posAttr) return null;

    const vertexCount = posAttr.count;
    const highlightGeo = centeredGeometry.clone();

    // Create vertex color buffer
    const colors = new Float32Array(vertexCount * 3);

    // All vertices transparent (black with 0 opacity handled by material)
    for (let i = 0; i < vertexCount * 3; i++) {
      colors[i] = 0;
    }

    // Highlight the selected face's 3 vertices with amber (#f59e0b)
    const faceStart = selectedFaceIndex * 3;
    if (faceStart + 2 < vertexCount) {
      // Amber color: r=0.961, g=0.620, b=0.043
      for (let v = 0; v < 3; v++) {
        const idx = (faceStart + v) * 3;
        colors[idx] = 0.961;
        colors[idx + 1] = 0.620;
        colors[idx + 2] = 0.043;
      }
    }

    highlightGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return highlightGeo;
  }, [centeredGeometry, selectedFaceIndex]);

  const handleClick = useCallback(
    (e: { stopPropagation: () => void; face?: THREE.Face | null; point?: THREE.Vector3 }) => {
      if (!enabled) return;
      e.stopPropagation();

      const face = e.face;
      if (!face) return;

      const posAttr = centeredGeometry.getAttribute("position");
      if (!posAttr) return;

      // face.a, face.b, face.c are the vertex indices
      // For non-indexed BufferGeometry (STL), the face index is floor(face.a / 3)
      const faceIndex = Math.floor(face.a / 3);

      // Get the face normal in local space, then transform to world space
      const normalLocal = face.normal.clone();

      // If the mesh has a world matrix, transform the normal
      if (meshRef.current) {
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(meshRef.current.matrixWorld);
        normalLocal.applyMatrix3(normalMatrix).normalize();
      }

      const worldNormal: [number, number, number] = [normalLocal.x, normalLocal.y, normalLocal.z];

      setSelectedFaceIndex(faceIndex);
      setLabelNormal(worldNormal);

      // Position label at the click point, offset along the normal
      if (e.point) {
        const offset = normalLocal.clone().multiplyScalar(5);
        setLabelPosition(e.point.clone().add(offset));
      }

      onFaceSelected(faceIndex, worldNormal);
    },
    [enabled, centeredGeometry, onFaceSelected]
  );

  if (!enabled) return null;

  const angleFromVertical = labelNormal
    ? Math.round(
        (Math.acos(Math.abs(labelNormal[1])) * 180) / Math.PI
      )
    : null;

  return (
    <group>
      {/* Invisible click target mesh */}
      <mesh
        ref={meshRef}
        geometry={centeredGeometry}
        onClick={handleClick}
      >
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Highlight overlay for selected face */}
      {highlightGeometry && selectedFaceIndex !== null && (
        <mesh geometry={highlightGeometry}>
          <meshBasicMaterial
            vertexColors
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>
      )}

      {/* Floating label */}
      {labelPosition && labelNormal && (
        <Html position={labelPosition} center style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-md bg-zinc-900/90 border border-zinc-700 px-2 py-1 text-xs text-zinc-200 shadow-lg backdrop-blur-sm">
            <div className="font-medium text-amber-400">Face selected</div>
            <div className="text-zinc-400">
              Normal: [{labelNormal.map((n) => n.toFixed(2)).join(", ")}]
            </div>
            <div className="text-zinc-400">
              {angleFromVertical !== null ? `${angleFromVertical}` : ""}
              {angleFromVertical !== null ? "\u00B0 from vertical" : ""}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

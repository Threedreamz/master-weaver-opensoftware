"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";

interface SupportPreviewProps {
  meshGeometry: THREE.BufferGeometry;
  orientation: { rotationX: number; rotationY: number; rotationZ: number };
  overhangThreshold?: number;
}

/**
 * R3F component that renders a semi-transparent red overlay on overhang faces.
 * Must be used inside a Canvas context.
 */
export function SupportPreview({
  meshGeometry,
  orientation,
  overhangThreshold = -0.5,
}: SupportPreviewProps) {
  const groupRef = useRef<THREE.Group>(null);

  const { supportGeometry, supportVolume } = useMemo(() => {
    // Clone and apply orientation rotation
    const geo = meshGeometry.clone();
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(orientation.rotationX),
      THREE.MathUtils.degToRad(orientation.rotationY),
      THREE.MathUtils.degToRad(orientation.rotationZ),
      "XYZ"
    );
    const rotMatrix = new THREE.Matrix4().makeRotationFromEuler(euler);
    geo.applyMatrix4(rotMatrix);

    // Ensure normals exist
    geo.computeVertexNormals();

    const posAttr = geo.getAttribute("position");
    const normalAttr = geo.getAttribute("normal");
    const index = geo.getIndex();

    if (!posAttr || !normalAttr) {
      return { supportGeometry: new THREE.BufferGeometry(), supportVolume: 0 };
    }

    const overhangPositions: number[] = [];
    let totalOverhangArea = 0;

    const triCount = index
      ? index.count / 3
      : posAttr.count / 3;

    const v0 = new THREE.Vector3();
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const faceNormal = new THREE.Vector3();
    const edge1 = new THREE.Vector3();
    const edge2 = new THREE.Vector3();

    for (let i = 0; i < triCount; i++) {
      let i0: number, i1: number, i2: number;
      if (index) {
        i0 = index.getX(i * 3);
        i1 = index.getX(i * 3 + 1);
        i2 = index.getX(i * 3 + 2);
      } else {
        i0 = i * 3;
        i1 = i * 3 + 1;
        i2 = i * 3 + 2;
      }

      v0.fromBufferAttribute(posAttr, i0);
      v1.fromBufferAttribute(posAttr, i1);
      v2.fromBufferAttribute(posAttr, i2);

      // Compute face normal
      edge1.subVectors(v1, v0);
      edge2.subVectors(v2, v0);
      faceNormal.crossVectors(edge1, edge2).normalize();

      // Check if overhang: normal.y < threshold (pointing downward)
      if (faceNormal.y < overhangThreshold) {
        overhangPositions.push(v0.x, v0.y, v0.z);
        overhangPositions.push(v1.x, v1.y, v1.z);
        overhangPositions.push(v2.x, v2.y, v2.z);

        // Triangle area for volume estimate
        const area = edge1.cross(edge2).length() / 2;
        totalOverhangArea += area;
      }
    }

    const supportGeo = new THREE.BufferGeometry();
    if (overhangPositions.length > 0) {
      supportGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(overhangPositions, 3)
      );
      supportGeo.computeVertexNormals();
    }

    // Rough support volume estimate: area * average overhang depth (2mm)
    const vol = (totalOverhangArea * 2) / 1000; // cm3

    geo.dispose();

    return { supportGeometry: supportGeo, supportVolume: vol };
  }, [meshGeometry, orientation, overhangThreshold]);

  return (
    <group ref={groupRef}>
      {supportGeometry.getAttribute("position") && (
        <mesh geometry={supportGeometry}>
          <meshBasicMaterial
            color="red"
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {supportVolume > 0 && (
        <Html
          position={[0, 10, 0]}
          center
          distanceFactor={200}
          style={{ pointerEvents: "none" }}
        >
          <div className="rounded bg-zinc-900/90 border border-red-700 px-2 py-1 text-xs text-red-300 whitespace-nowrap">
            Support ~{supportVolume.toFixed(2)} cm³
          </div>
        </Html>
      )}
    </group>
  );
}

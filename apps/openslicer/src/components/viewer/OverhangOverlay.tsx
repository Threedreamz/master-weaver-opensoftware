"use client";

import { useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import * as THREE from "three";
import type { ArcOverhangResult } from "@opensoftware/slicer-core";

const SEVERITY_COLORS: Record<string, THREE.Color> = {
  none: new THREE.Color(0x4ade80),
  mild: new THREE.Color(0xfbbf24),
  moderate: new THREE.Color(0xf97316),
  severe: new THREE.Color(0xef4444),
  extreme: new THREE.Color(0xa855f7),
};

interface OverhangOverlayProps {
  url: string;
  overhangResult: ArcOverhangResult;
  visible: boolean;
}

export function OverhangOverlay({
  url,
  overhangResult,
  visible,
}: OverhangOverlayProps) {
  const geometry = useLoader(STLLoader, url);

  const coloredGeometry = useMemo(() => {
    const geo = geometry.clone();
    geo.computeBoundingBox();

    // Center the geometry to match ModelLoader's centering
    if (geo.boundingBox) {
      const center = new THREE.Vector3();
      geo.boundingBox.getCenter(center);
      geo.translate(-center.x, -geo.boundingBox.min.y, -center.z);
    }

    geo.computeVertexNormals();

    const positionAttr = geo.getAttribute("position");
    const vertexCount = positionAttr.count;

    // Create a color buffer -- 3 floats (RGB) per vertex
    const colors = new Float32Array(vertexCount * 3);

    // Build a lookup from triangleIndex to severity
    const faceSeverityMap = new Map<number, string>();
    for (const zone of overhangResult.zones) {
      for (const face of zone.faces) {
        faceSeverityMap.set(face.triangleIndex, face.severity);
      }
    }

    // Each triangle is 3 consecutive vertices (non-indexed STL geometry)
    const faceCount = Math.floor(vertexCount / 3);
    for (let fi = 0; fi < faceCount; fi++) {
      const severity = faceSeverityMap.get(fi) ?? "none";
      const color = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.none;

      for (let v = 0; v < 3; v++) {
        const idx = fi * 3 + v;
        colors[idx * 3] = color.r;
        colors[idx * 3 + 1] = color.g;
        colors[idx * 3 + 2] = color.b;
      }
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [geometry, overhangResult]);

  if (!visible) return null;

  return (
    <mesh geometry={coloredGeometry} renderOrder={1}>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}

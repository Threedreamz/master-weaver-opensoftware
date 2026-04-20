"use client";

/**
 * opencad — R3F Viewport
 *
 * Renders evaluated features as <mesh> instances. Parent page should
 * dynamic-import this file with { ssr: false } because three.js + WebGL
 * cannot render server-side.
 *
 *   const Viewport = dynamic(
 *     () => import("@/components/workbench/Viewport").then(m => m.Viewport),
 *     { ssr: false }
 *   );
 */

import { useMemo, useRef } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  GizmoHelper,
  GizmoViewport,
  Grid,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";

export interface ViewportFeature {
  id: string;
  positions: Float32Array | number[];
  indices?: Uint32Array | number[];
  bbox?: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  color?: string;
}

export interface ViewportProps {
  features: ViewportFeature[];
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}

/** Convert a feature into a BufferGeometry (memoised per-feature). */
function useFeatureGeometry(feature: ViewportFeature): THREE.BufferGeometry {
  return useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions =
      feature.positions instanceof Float32Array
        ? feature.positions
        : new Float32Array(feature.positions);
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    if (feature.indices && feature.indices.length > 0) {
      const indices =
        feature.indices instanceof Uint32Array
          ? feature.indices
          : new Uint32Array(feature.indices);
      geom.setIndex(new THREE.BufferAttribute(indices, 1));
    }

    geom.computeVertexNormals();
    geom.computeBoundingSphere();
    return geom;
  }, [feature.id, feature.positions, feature.indices]);
}

function FeatureMesh({
  feature,
  selected,
  onSelect,
}: {
  feature: ViewportFeature;
  selected: boolean;
  onSelect?: (id: string) => void;
}) {
  const geometry = useFeatureGeometry(feature);
  const meshRef = useRef<THREE.Mesh>(null);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect?.(feature.id);
  };

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onClick={handleClick}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={selected ? "#60a5fa" : feature.color ?? "#d4d4d8"}
        metalness={0.15}
        roughness={0.55}
        emissive={selected ? "#1e3a8a" : "#000000"}
        emissiveIntensity={selected ? 0.25 : 0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function Viewport({ features, onSelect, selectedId = null }: ViewportProps) {
  return (
    <div className="relative h-full w-full bg-[#0a0a0a]">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
        style={{ background: "#0a0a0a" }}
      >
        <PerspectiveCamera
          makeDefault
          fov={50}
          near={0.1}
          far={5000}
          position={[60, 60, 60]}
        />

        <ambientLight intensity={0.45} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-8, 4, -4]} intensity={0.35} />

        <Grid
          args={[200, 200]}
          infiniteGrid
          cellColor="#444444"
          sectionColor="#666666"
          cellSize={1}
          sectionSize={10}
          fadeDistance={120}
          fadeStrength={1.2}
          followCamera={false}
        />

        {features.map((f) => (
          <FeatureMesh
            key={f.id}
            feature={f}
            selected={selectedId === f.id}
            onSelect={onSelect}
          />
        ))}

        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
        <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
          <GizmoViewport
            axisColors={["#ef4444", "#22c55e", "#3b82f6"]}
            labelColor="#fafafa"
          />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}

export default Viewport;

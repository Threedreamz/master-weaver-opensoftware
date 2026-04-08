"use client";

import { type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  GizmoHelper,
  GizmoViewport,
} from "@react-three/drei";
import * as THREE from "three";

interface ModelViewerProps {
  children?: ReactNode;
}

function SceneSetup() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[50, 100, 50]}
        intensity={0.9}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight
        position={[-30, 60, -40]}
        intensity={0.3}
      />

      <Environment preset="studio" />

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        maxPolarAngle={Math.PI / 2}
        minDistance={10}
        maxDistance={1000}
        makeDefault
      />

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport
          axisColors={["#ff3653", "#0adb50", "#2c8fdf"]}
          labelColor="white"
        />
      </GizmoHelper>
    </>
  );
}

export function ModelViewer({ children }: ModelViewerProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{
        fov: 50,
        position: [0, 100, 200],
        near: 0.1,
        far: 5000,
      }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
      style={{ width: "100%", height: "100%", background: "#e5e5e5" }}
      scene={{ background: new THREE.Color("#e5e5e5") }}
    >
      <SceneSetup />
      {children}
    </Canvas>
  );
}

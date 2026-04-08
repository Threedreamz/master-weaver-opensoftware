"use client";

import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Environment, Center, Bounds } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";

// ─── 3D Model ─────────────────────────────────────────────────────────────────

interface STLModelProps {
  url: string;
  color: string;
  autoRotate: boolean;
}

function STLModel({ url, color, autoRotate }: STLModelProps) {
  const geometry = useLoader(STLLoader, url);
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (geometry) {
      geometry.computeVertexNormals();
      geometry.center();
    }
  }, [geometry]);

  useFrame((_state, delta) => {
    if (autoRotate && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.45;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial
        color={color}
        metalness={0.15}
        roughness={0.45}
        envMapIntensity={0.9}
      />
    </mesh>
  );
}

function GridFloor() {
  return (
    <gridHelper args={[20, 20, "#cccccc", "#eeeeee"]} position={[0, -0.01, 0]} />
  );
}

function WireframeFallback() {
  return (
    <mesh>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial color="#c7d2fe" wireframe />
    </mesh>
  );
}

// ─── Main Viewer ──────────────────────────────────────────────────────────────

export interface STLViewerProps {
  fileUrl: string;
  backgroundColor?: string;
  modelColor?: string;
  autoRotate?: boolean;
  showGrid?: boolean;
  caption?: string;
  height?: number;
}

export default function STLViewerComponent({
  fileUrl,
  backgroundColor = "#f1f5f9",
  modelColor = "#6366f1",
  autoRotate = false,
  showGrid = true,
  caption,
  height = 400,
}: STLViewerProps) {
  const [hasError, setHasError] = useState(false);

  if (!fileUrl) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 gap-3"
        style={{ height }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
        <p className="text-sm text-gray-400">Keine STL-Datei angegeben</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 gap-2"
        style={{ height }}
      >
        <p className="text-sm text-red-600 font-medium">STL-Datei konnte nicht geladen werden</p>
        <p className="text-xs text-red-400 max-w-xs text-center break-all">{fileUrl}</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden select-none" style={{ height, touchAction: "none" }}>
      <Canvas
        style={{ background: backgroundColor, width: "100%", height: "100%" }}
        camera={{ position: [0, 2, 5], fov: 45, near: 0.01, far: 1000 }}
        shadows
        onError={() => setHasError(true)}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, -2, -4]} intensity={0.25} />
        <pointLight position={[0, 10, 0]} intensity={0.3} />

        <Suspense fallback={<WireframeFallback />}>
          <Bounds fit clip observe margin={1.4}>
            <Center>
              <STLModel url={fileUrl} color={modelColor} autoRotate={autoRotate} />
            </Center>
          </Bounds>
          <Environment preset="studio" />
        </Suspense>

        {showGrid && <GridFloor />}

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={0.1}
          maxDistance={50}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>

      {/* Hint */}
      <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-sm text-white text-[10px] pointer-events-none select-none">
        Ziehen · Scrollen · Zwei Finger
      </div>

      {/* Caption */}
      {caption && (
        <div className="absolute bottom-0 left-0 right-0 pb-8 px-4 bg-gradient-to-t from-black/30 to-transparent text-center pointer-events-none">
          <p className="text-white text-sm drop-shadow">{caption}</p>
        </div>
      )}
    </div>
  );
}

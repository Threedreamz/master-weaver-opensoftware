"use client";

import { useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { Environment, Center, Text } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import * as THREE from "three";

export type LightingPreset = "product" | "studio" | "dramatic" | "neon";
export type RotationType = "turntable" | "orbit" | "oscillate";
export type ZoomPreset = "near" | "medium" | "far";

interface Props {
  modelUrl: string;
  modelFormat: "stl" | "obj" | "gltf" | "glb";
  lighting: LightingPreset;
  rotation: RotationType;
  bgColor: string;
  durationS: number;
  watermarkEnabled: boolean;
  zoom: ZoomPreset;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

// Zoom = camera distance from origin (model is auto-centered + scaled).
const ZOOM_DIST: Record<ZoomPreset, number> = {
  near: 2.4,
  medium: 3.4,
  far: 5.0,
};

function LightsForPreset({ preset }: { preset: LightingPreset }) {
  switch (preset) {
    case "studio":
      return (
        <>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
          <directionalLight position={[-5, 4, -5]} intensity={0.8} color="#ffffff" />
        </>
      );
    case "dramatic":
      return (
        <>
          <ambientLight intensity={0.15} />
          <spotLight
            position={[8, 10, 4]}
            intensity={3}
            angle={0.3}
            penumbra={0.4}
            castShadow
            color="#ffe8c0"
          />
          <spotLight position={[-6, -2, 6]} intensity={0.5} color="#4080ff" />
        </>
      );
    case "neon":
      return (
        <>
          <ambientLight intensity={0.1} />
          <pointLight position={[4, 4, 4]} intensity={2} color="#00ffcc" />
          <pointLight position={[-4, -2, -4]} intensity={1.5} color="#ff00aa" />
          <pointLight position={[0, 6, 0]} intensity={1} color="#4466ff" />
        </>
      );
    default:
      return (
        <>
          <ambientLight intensity={0.8} />
          <directionalLight position={[4, 6, 4]} intensity={1.2} castShadow />
          <directionalLight position={[-4, 4, -4]} intensity={0.6} color="#e8f0ff" />
          <directionalLight position={[0, -4, 0]} intensity={0.2} color="#ffffff" />
        </>
      );
  }
}

function applyRotation(obj: THREE.Object3D, type: RotationType, t: number, durationS: number) {
  // Phase ∈ [0,1] across reel duration — exactly one cycle per reel.
  const phase = t / Math.max(durationS, 0.01);

  if (type === "turntable") {
    obj.rotation.y = phase * Math.PI * 2;
  } else if (type === "orbit") {
    obj.rotation.y = phase * Math.PI * 2;
    obj.rotation.x = Math.sin(phase * Math.PI) * 0.25;
  } else {
    // oscillate: forward 0→0.5, back 0.5→1
    const half = (phase % 1) * 2;
    obj.rotation.y = (half < 1 ? half : 2 - half) * Math.PI * 2;
  }
}

function STLModel({
  url,
  rotation,
  durationS,
}: {
  url: string;
  rotation: RotationType;
  durationS: number;
}) {
  const geom = useLoader(STLLoader, url);
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  useFrame((_s, delta) => {
    if (!ref.current) return;
    t.current += delta;
    applyRotation(ref.current, rotation, t.current, durationS);
  });
  return (
    <Center>
      <mesh ref={ref} geometry={geom} castShadow receiveShadow>
        <meshStandardMaterial color="#c8d0dc" metalness={0.3} roughness={0.5} />
      </mesh>
    </Center>
  );
}

function GLTFModel({
  url,
  rotation,
  durationS,
}: {
  url: string;
  rotation: RotationType;
  durationS: number;
}) {
  const gltf = useLoader(GLTFLoader, url);
  const ref = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_s, delta) => {
    if (!ref.current) return;
    t.current += delta;
    applyRotation(ref.current, rotation, t.current, durationS);
  });
  return (
    <Center>
      <primitive ref={ref} object={gltf.scene} castShadow />
    </Center>
  );
}

function OBJModel({
  url,
  rotation,
  durationS,
}: {
  url: string;
  rotation: RotationType;
  durationS: number;
}) {
  const obj = useLoader(OBJLoader, url);
  const ref = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_s, delta) => {
    if (!ref.current) return;
    t.current += delta;
    applyRotation(ref.current, rotation, t.current, durationS);
  });
  return (
    <Center>
      <primitive ref={ref} object={obj} castShadow />
    </Center>
  );
}

// Camera-locked text watermark. Updates each frame so it stays bottom-right
// regardless of model rotation or zoom. Position is in camera-local space
// (x>0 right, y<0 bottom, z<0 in front of camera) — multiplied by camera
// world matrix every frame. The text is rendered into the WebGL canvas via
// drei's `<Text>` (troika-three-text under the hood), which means it IS
// captured by `canvas.captureStream()` and ends up in the recorded WebM.
function WatermarkText() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (!ref.current) return;
    ref.current.position.set(0.42, -0.55, -1.5);
    ref.current.position.applyMatrix4(camera.matrixWorld);
    ref.current.quaternion.copy(camera.quaternion);
  });
  return (
    <group ref={ref}>
      <Text
        fontSize={0.06}
        color="#fec83e"
        anchorX="right"
        anchorY="bottom"
        outlineWidth={0.005}
        outlineColor="#000"
        outlineOpacity={0.4}
      >
        3dreel.app
      </Text>
    </group>
  );
}

function CanvasCapture({ onReady }: { onReady: (canvas: HTMLCanvasElement) => void }) {
  const { gl } = useThree();
  useEffect(() => {
    onReady(gl.domElement);
  }, [gl, onReady]);
  return null;
}

export function ModelRenderer({
  modelUrl,
  modelFormat,
  lighting,
  rotation,
  bgColor,
  durationS,
  watermarkEnabled,
  zoom,
  onCanvasReady,
}: Props) {
  const dist = ZOOM_DIST[zoom];
  return (
    <Canvas
      shadows
      gl={{ preserveDrawingBuffer: true }}
      camera={{ position: [0, 1.2, dist], fov: 45 }}
      style={{ background: bgColor, width: "100%", height: "100%" }}
    >
      <CanvasCapture onReady={onCanvasReady} />
      <LightsForPreset preset={lighting} />
      {lighting === "product" && <Environment preset="city" />}
      <Suspense fallback={null}>
        {modelFormat === "stl" && (
          <STLModel url={modelUrl} rotation={rotation} durationS={durationS} />
        )}
        {(modelFormat === "glb" || modelFormat === "gltf") && (
          <GLTFModel url={modelUrl} rotation={rotation} durationS={durationS} />
        )}
        {modelFormat === "obj" && (
          <OBJModel url={modelUrl} rotation={rotation} durationS={durationS} />
        )}
      </Suspense>
      {watermarkEnabled && <WatermarkText />}
    </Canvas>
  );
}

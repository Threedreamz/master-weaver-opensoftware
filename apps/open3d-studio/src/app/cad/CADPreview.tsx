'use client';
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';

interface CADPreviewProps {
  vertices: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

function CADMesh({ vertices, normals, indices }: CADPreviewProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }, [vertices, normals, indices]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#4488cc" metalness={0.3} roughness={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default function CADPreview(props: CADPreviewProps) {
  return (
    <Canvas shadows camera={{ position: [4, 4, 4], fov: 50 }} style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
      <Environment preset="studio" />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      <CADMesh {...props} />
      <Grid args={[20,20]} cellSize={1} cellThickness={0.5} cellColor="#6f6f6f"
        sectionSize={5} sectionThickness={1} sectionColor="#9d4b4b" fadeDistance={25} infiniteGrid />
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={['#f73','#3f7','#37f']} labelColor="white" />
      </GizmoHelper>
    </Canvas>
  );
}

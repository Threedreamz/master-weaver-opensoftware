'use client';
import { useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';

interface CADPreviewProps {
  vertices: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

function CameraFit({ geometry }: { geometry: THREE.BufferGeometry }) {
  const { camera, controls } = useThree() as any;
  useMemo(() => {
    if (!geometry.boundingBox) return;
    const box = geometry.boundingBox;
    const size = new THREE.Vector3(); box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 1.5;
    camera.position.set(dist, dist * 0.7, dist);
    camera.near = maxDim * 0.0001;
    camera.far = maxDim * 100;
    camera.updateProjectionMatrix();
    if (controls?.target) controls.target.set(0, 0, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry]);
  return null;
}

function CADMesh({ vertices, normals, indices }: CADPreviewProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    if (indices.length > 0) geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeBoundingBox();
    const center = new THREE.Vector3();
    geo.boundingBox!.getCenter(center);
    geo.translate(-center.x, -center.y, -center.z);
    geo.computeBoundingBox(); // recompute after translate
    return geo;
  }, [vertices, normals, indices]);

  return (
    <>
      <CameraFit geometry={geometry} />
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#4488cc" metalness={0.3} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

export default function CADPreview(props: CADPreviewProps) {
  return (
    <Canvas shadows camera={{ position: [4, 4, 4], fov: 50 }} style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
      <Environment preset="studio" />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      <CADMesh {...props} />
      <Grid args={[2000,2000]} cellSize={10} cellThickness={0.5} cellColor="#6f6f6f"
        sectionSize={50} sectionThickness={1} sectionColor="#9d4b4b" fadeDistance={2000} infiniteGrid />
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={['#f73','#3f7','#37f']} labelColor="white" />
      </GizmoHelper>
    </Canvas>
  );
}

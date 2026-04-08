'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { Suspense, useEffect, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

interface ViewerSceneProps {
  src: string;
  format: string | null;
  wireframe: boolean;
  grid: boolean;
  autoRotate: boolean;
  metalness: number;
  roughness: number;
  activeTool: string;
  clipPosition: number;
  onMeshInfo: (info: Record<string, any>) => void;
}

function Model({ src, format, wireframe, metalness, roughness, onMeshInfo }: any) {
  const [object, setObject] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    const ext = format || '';
    if (ext === 'stl') {
      new STLLoader().load(src, (geo) => {
        geo.computeVertexNormals();
        geo.center();
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#b0b0b0', metalness, roughness, wireframe, side: THREE.DoubleSide }));
        mesh.castShadow = true;
        setObject(mesh);
        const pos = geo.getAttribute('position');
        const box = new THREE.Box3().setFromBufferAttribute(pos as THREE.BufferAttribute);
        const size = new THREE.Vector3(); box.getSize(size);
        onMeshInfo({ Triangles: Math.floor(pos.count / 3), Vertices: pos.count, 'Size X': size.x.toFixed(1), 'Size Y': size.y.toFixed(1), 'Size Z': size.z.toFixed(1) });
      });
    } else if (ext === 'obj') {
      new OBJLoader().load(src, (obj) => {
        obj.traverse(c => { if (c instanceof THREE.Mesh) { c.material = new THREE.MeshStandardMaterial({ color: '#b0b0b0', metalness, roughness, wireframe }); c.castShadow = true; }});
        const box = new THREE.Box3().setFromObject(obj);
        const center = new THREE.Vector3(); box.getCenter(center);
        obj.position.sub(center);
        setObject(obj);
        onMeshInfo({ Format: 'OBJ' });
      });
    } else if (ext === 'gltf' || ext === 'glb') {
      new GLTFLoader().load(src, (gltf) => {
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = new THREE.Vector3(); box.getCenter(center);
        gltf.scene.position.sub(center);
        setObject(gltf.scene);
        let tris = 0;
        gltf.scene.traverse(c => { if (c instanceof THREE.Mesh && c.geometry) { const idx = c.geometry.getIndex(); tris += idx ? idx.count / 3 : c.geometry.getAttribute('position').count / 3; }});
        onMeshInfo({ Format: 'glTF', Triangles: Math.floor(tris) });
      });
    }
  }, [src, format]);

  useEffect(() => {
    if (!object) return;
    object.traverse(c => {
      if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
        c.material.wireframe = wireframe;
        c.material.metalness = metalness;
        c.material.roughness = roughness;
      }
    });
  }, [wireframe, metalness, roughness, object]);

  return object ? <primitive object={object} /> : null;
}

export default function ViewerScene(props: ViewerSceneProps) {
  return (
    <Canvas shadows camera={{ position: [5, 5, 5], fov: 50 }} style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, localClippingEnabled: props.activeTool === 'clip' }}>
      <Suspense fallback={null}>
        <Environment preset="studio" />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
        <Model src={props.src} format={props.format} wireframe={props.wireframe}
          metalness={props.metalness} roughness={props.roughness} onMeshInfo={props.onMeshInfo} />
        {props.grid && <Grid args={[20, 20]} cellSize={1} cellThickness={0.5} cellColor="#6f6f6f"
          sectionSize={5} sectionThickness={1} sectionColor="#9d4b4b" fadeDistance={25} infiniteGrid />}
        <OrbitControls makeDefault autoRotate={props.autoRotate} enableDamping dampingFactor={0.05} />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={['#f73', '#3f7', '#37f']} labelColor="white" />
        </GizmoHelper>
      </Suspense>
    </Canvas>
  );
}

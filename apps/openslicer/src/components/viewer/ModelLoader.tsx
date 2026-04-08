"use client";

import { useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import { useLoader } from "@react-three/fiber";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { Edges } from "@react-three/drei";
import * as THREE from "three";

interface ModelLoaderProps {
  url: string;
  color?: string;
  selected?: boolean;
  onSelect?: () => void;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

export interface ModelLoaderHandle {
  groupRef: React.RefObject<THREE.Group | null>;
}

export const ModelLoader = forwardRef<ModelLoaderHandle, ModelLoaderProps>(
  function ModelLoader(
    {
      url,
      color = "#8cb4d5",
      selected = false,
      onSelect,
      position = [0, 0, 0],
      rotation = [0, 0, 0],
      scale = [1, 1, 1],
    },
    ref
  ) {
    const meshRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);

    useImperativeHandle(ref, () => ({ groupRef }), []);

    const geometry = useLoader(STLLoader, url);

    const centeredGeometry = useMemo(() => {
      const geo = geometry.clone();
      geo.computeBoundingBox();

      if (geo.boundingBox) {
        const center = new THREE.Vector3();
        geo.boundingBox.getCenter(center);

        // Center X and Z, but place bottom at Y=0
        geo.translate(-center.x, -geo.boundingBox.min.y, -center.z);
      }

      geo.computeVertexNormals();
      return geo;
    }, [geometry]);

    return (
      <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
        <mesh
          ref={meshRef}
          geometry={centeredGeometry}
          castShadow
          receiveShadow
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
          }}
        >
          <meshStandardMaterial
            color={color}
            metalness={0.1}
            roughness={0.7}
            side={THREE.DoubleSide}
          />
          {selected && (
            <Edges
              threshold={15}
              color="#ff6600"
              linewidth={2}
            />
          )}
        </mesh>
      </group>
    );
  }
);

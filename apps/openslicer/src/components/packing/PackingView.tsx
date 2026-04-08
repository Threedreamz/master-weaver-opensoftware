"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

const ITEM_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

interface PackedItemData {
  id: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; depth: number; height: number };
}

interface PackingViewProps {
  buildVolume: { x: number; y: number; z: number };
  packedItems: PackedItemData[];
}

function BuildVolumeWireframe({
  size,
}: {
  size: { x: number; y: number; z: number };
}) {
  const geometry = useMemo(
    () => new THREE.BoxGeometry(size.x, size.z, size.y),
    [size]
  );

  return (
    <group position={[size.x / 2, size.z / 2, size.y / 2]}>
      <lineSegments>
        <edgesGeometry args={[geometry]} />
        <lineBasicMaterial color="#525252" linewidth={1} />
      </lineSegments>
    </group>
  );
}

function PackedItemBox({
  item,
  colorIndex,
}: {
  item: PackedItemData;
  colorIndex: number;
}) {
  const color = ITEM_COLORS[colorIndex % ITEM_COLORS.length];

  return (
    <mesh
      position={[
        item.position.x + item.dimensions.width / 2,
        item.position.z + item.dimensions.height / 2,
        item.position.y + item.dimensions.depth / 2,
      ]}
    >
      <boxGeometry
        args={[item.dimensions.width, item.dimensions.height, item.dimensions.depth]}
      />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function PackedItemEdges({
  item,
  colorIndex,
}: {
  item: PackedItemData;
  colorIndex: number;
}) {
  const color = ITEM_COLORS[colorIndex % ITEM_COLORS.length];
  const geometry = useMemo(
    () =>
      new THREE.BoxGeometry(
        item.dimensions.width,
        item.dimensions.height,
        item.dimensions.depth
      ),
    [item.dimensions]
  );

  return (
    <lineSegments
      position={[
        item.position.x + item.dimensions.width / 2,
        item.position.z + item.dimensions.height / 2,
        item.position.y + item.dimensions.depth / 2,
      ]}
    >
      <edgesGeometry args={[geometry]} />
      <lineBasicMaterial color={color} linewidth={2} />
    </lineSegments>
  );
}

function Scene({
  buildVolume,
  packedItems,
}: PackingViewProps) {
  // Assign color index by unique item id
  const colorMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const item of packedItems) {
      if (!map.has(item.id)) {
        map.set(item.id, idx++);
      }
    }
    return map;
  }, [packedItems]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[50, 100, 50]} intensity={0.7} />

      <BuildVolumeWireframe size={buildVolume} />

      {packedItems.map((item, i) => {
        const colorIdx = colorMap.get(item.id) ?? i;
        return (
          <group key={`${item.id}-${i}`}>
            <PackedItemBox item={item} colorIndex={colorIdx} />
            <PackedItemEdges item={item} colorIndex={colorIdx} />
          </group>
        );
      })}

      {/* Floor grid */}
      <gridHelper
        args={[
          Math.max(buildVolume.x, buildVolume.y) * 1.5,
          20,
          "#3f3f46",
          "#27272a",
        ]}
        position={[buildVolume.x / 2, 0, buildVolume.y / 2]}
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        target={[buildVolume.x / 2, buildVolume.z / 2, buildVolume.y / 2]}
      />
    </>
  );
}

export function PackingView({ buildVolume, packedItems }: PackingViewProps) {
  const maxDim = Math.max(buildVolume.x, buildVolume.y, buildVolume.z);

  return (
    <div className="h-64 w-full rounded-lg border border-zinc-700 bg-zinc-950 overflow-hidden">
      <Canvas
        camera={{
          fov: 50,
          position: [maxDim * 1.2, maxDim * 0.8, maxDim * 1.2],
          near: 0.1,
          far: maxDim * 10,
        }}
        gl={{ antialias: true }}
      >
        <Scene buildVolume={buildVolume} packedItems={packedItems} />
      </Canvas>
    </div>
  );
}

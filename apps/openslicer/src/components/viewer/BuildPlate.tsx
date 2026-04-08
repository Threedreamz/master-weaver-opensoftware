"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Line, Text } from "@react-three/drei";

interface BuildPlateProps {
  width: number;
  depth: number;
  height: number;
}

export function BuildPlate({ width, depth, height }: BuildPlateProps) {
  const halfW = width / 2;
  const halfD = depth / 2;

  const gridLines = useMemo(() => {
    const lines: [number, number, number][][] = [];
    const spacing = 10;

    for (let z = -halfD; z <= halfD; z += spacing) {
      lines.push([
        [-halfW, 0.05, z],
        [halfW, 0.05, z],
      ]);
    }

    for (let x = -halfW; x <= halfW; x += spacing) {
      lines.push([
        [x, 0.05, -halfD],
        [x, 0.05, halfD],
      ]);
    }

    return lines;
  }, [halfW, halfD]);

  // Raised border outline
  const borderHeight = 1.5;
  const borderBottom = useMemo<[number, number, number][]>(() => [
    [-halfW, 0, -halfD],
    [halfW, 0, -halfD],
    [halfW, 0, halfD],
    [-halfW, 0, halfD],
    [-halfW, 0, -halfD],
  ], [halfW, halfD]);

  const borderTop = useMemo<[number, number, number][]>(() => [
    [-halfW, borderHeight, -halfD],
    [halfW, borderHeight, -halfD],
    [halfW, borderHeight, halfD],
    [-halfW, borderHeight, halfD],
    [-halfW, borderHeight, -halfD],
  ], [halfW, halfD]);

  const borderVerticals = useMemo<[number, number, number][][]>(() => [
    [[-halfW, 0, -halfD], [-halfW, borderHeight, -halfD]],
    [[halfW, 0, -halfD], [halfW, borderHeight, -halfD]],
    [[halfW, 0, halfD], [halfW, borderHeight, halfD]],
    [[-halfW, 0, halfD], [-halfW, borderHeight, halfD]],
  ], [halfW, halfD]);

  // Volume wireframe (top + verticals) — very faint
  const topFacePoints = useMemo<[number, number, number][]>(() => [
    [-halfW, height, -halfD],
    [halfW, height, -halfD],
    [halfW, height, halfD],
    [-halfW, height, halfD],
    [-halfW, height, -halfD],
  ], [halfW, halfD, height]);

  const volumeVerticals = useMemo<[number, number, number][][]>(() => [
    [[-halfW, 0, -halfD], [-halfW, height, -halfD]],
    [[halfW, 0, -halfD], [halfW, height, -halfD]],
    [[halfW, 0, halfD], [halfW, height, halfD]],
    [[-halfW, 0, halfD], [-halfW, height, halfD]],
  ], [halfW, halfD, height]);

  return (
    <group>
      {/* Solid dark build plate surface (PEI plate look) */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[width, 1, depth]} />
        <meshStandardMaterial
          color="#2a2a2a"
          roughness={0.85}
          metalness={0.1}
        />
      </mesh>

      {/* Raised border — bottom outline */}
      <Line points={borderBottom} color="#555555" lineWidth={1.5} />

      {/* Raised border — top outline */}
      <Line points={borderTop} color="#4a4a4a" lineWidth={2} />

      {/* Raised border — vertical edges */}
      {borderVerticals.map((edge, i) => (
        <Line key={`bv-${i}`} points={edge} color="#4a4a4a" lineWidth={1.5} />
      ))}

      {/* Subtle grid lines on plate surface */}
      {gridLines.map((line, i) => (
        <Line
          key={`grid-${i}`}
          points={line}
          color="#3a3a3a"
          lineWidth={0.5}
          transparent
          opacity={0.5}
        />
      ))}

      {/* Build plate label - subtle, like Bambu's "Textured PEI Plate" */}
      <Text
        position={[0, 0.15, halfD - 6]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={3.5}
        color="#3a3a3a"
        anchorX="center"
        anchorY="middle"
      >
        Textured PEI Plate
      </Text>

      {/* Subtle dimension labels */}
      <Text
        position={[0, 0.15, halfD + 5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={3.5}
        color="#505050"
        anchorX="center"
        anchorY="middle"
      >
        {`${width}mm`}
      </Text>

      <Text
        position={[halfW + 5, 0.15, 0]}
        rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
        fontSize={3.5}
        color="#505050"
        anchorX="center"
        anchorY="middle"
      >
        {`${depth}mm`}
      </Text>

      {/* Semi-transparent volume box */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshBasicMaterial
          color="#6688bb"
          transparent
          opacity={0.02}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Top face outline — very subtle */}
      <Line
        points={topFacePoints}
        color="#888899"
        lineWidth={0.5}
        transparent
        opacity={0.15}
      />

      {/* Volume vertical edges — very subtle */}
      {volumeVerticals.map((edge, i) => (
        <Line
          key={`vv-${i}`}
          points={edge}
          color="#888899"
          lineWidth={0.5}
          transparent
          opacity={0.15}
        />
      ))}

      {/* Height label */}
      <Text
        position={[halfW + 5, height / 2, halfD + 5]}
        rotation={[0, -Math.PI / 4, 0]}
        fontSize={3.5}
        color="#505050"
        anchorX="center"
        anchorY="middle"
      >
        {`${height}mm`}
      </Text>
    </group>
  );
}

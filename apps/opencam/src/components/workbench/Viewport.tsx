"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, Line, OrbitControls } from "@react-three/drei";
import { useCamStore } from "@/stores/cam-store";
import type { Vector3Tuple } from "three";

type Vec3 = { x: number; y: number; z: number };
type BBox = { min: Vec3; max: Vec3 };

const KIND_COLORS: Record<string, string> = {
  pocket: "#3b82f6",
  contour: "#22c55e",
  face: "#f59e0b",
  drill: "#ef4444",
  adaptive: "#a855f7",
  "3d-parallel": "#06b6d4",
};

function bboxEdges(bbox: BBox): Vector3Tuple[][] {
  const { min, max } = bbox;
  const c = [
    [min.x, min.y, min.z],
    [max.x, min.y, min.z],
    [max.x, max.y, min.z],
    [min.x, max.y, min.z],
    [min.x, min.y, max.z],
    [max.x, min.y, max.z],
    [max.x, max.y, max.z],
    [min.x, max.y, max.z],
  ] as Vector3Tuple[];
  const edges: Array<[number, number]> = [
    [0, 1], [1, 2], [2, 3], [3, 0], // bottom
    [4, 5], [5, 6], [6, 7], [7, 4], // top
    [0, 4], [1, 5], [2, 6], [3, 7], // verticals
  ];
  return edges.map(([a, b]) => [c[a], c[b]]);
}

export function Viewport() {
  const project = useCamStore((s) => s.project);
  const operations = useCamStore((s) => s.operations);
  const toolpaths = useCamStore((s) => s.toolpaths);

  const stock: BBox | null = useMemo(() => {
    if (!project?.stockBbox) return null;
    return project.stockBbox as BBox;
  }, [project]);

  const stockEdges = useMemo(() => (stock ? bboxEdges(stock) : []), [stock]);

  const opKindById = useMemo(() => {
    const m = new Map<string, string>();
    for (const op of operations) m.set(op.id, op.kind);
    return m;
  }, [operations]);

  if (!project || !stock) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-900">
        <div className="text-sm text-neutral-500">
          Import geometry from OpenCAD to begin
        </div>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [100, 100, 100], fov: 50, near: 0.1, far: 10000 }}
      className="h-full w-full"
      style={{ background: "#171717" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[200, 200, 200]} intensity={0.8} />

        <Grid
          args={[1000, 1000]}
          cellSize={10}
          cellThickness={0.5}
          cellColor="#404040"
          sectionSize={100}
          sectionThickness={1}
          sectionColor="#525252"
          fadeDistance={800}
          fadeStrength={1}
          infiniteGrid
        />

        {stockEdges.map((pts, i) => (
          <Line
            key={`stock-${i}`}
            points={pts}
            color="#737373"
            lineWidth={1}
            transparent
            opacity={0.7}
          />
        ))}

        {Object.entries(toolpaths).map(([opId, result]) => {
          const kind = opKindById.get(opId) ?? "pocket";
          const color = KIND_COLORS[kind] ?? "#9ca3af";
          return result.polylines.map((poly, idx) => {
            if (!poly || poly.length < 2) return null;
            const pts = poly.map((p) => [p.x, p.y, p.z] as Vector3Tuple);
            return (
              <Line
                key={`${opId}-${idx}`}
                points={pts}
                color={color}
                lineWidth={1.5}
              />
            );
          });
        })}

        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          target={[0, 0, 0]}
        />
      </Suspense>
    </Canvas>
  );
}

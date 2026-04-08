"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useSlicerStore } from "../../stores/slicer-store";
import { useToastStore } from "../../stores/toast-store";

interface CutToolProps {
  active: boolean;
}

export function CutTool({ active }: CutToolProps) {
  const { camera, gl, raycaster } = useThree();
  const addToast = useToastStore((s) => s.addToast);
  const selectedModelId = useSlicerStore((s) => s.selectedModelId);
  const models = useSlicerStore((s) => s.models);
  const addModel = useSlicerStore((s) => s.addModel);
  const removeModel = useSlicerStore((s) => s.removeModel);
  const setToolMode = useSlicerStore((s) => s.setToolMode);

  const selectedModel = models.find((m) => m.id === selectedModelId);

  // Cut plane Y position (height)
  const [cutHeight, setCutHeight] = useState(20);
  const [isDragging, setIsDragging] = useState(false);
  const [isCutting, setIsCutting] = useState(false);
  const planeRef = useRef<THREE.Mesh>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  // Compute model bounding box height for smart defaults
  const modelBounds = useMemo(() => {
    if (!selectedModel?.boundingBox) return { minY: 0, maxY: 100 };
    return {
      minY: 0,
      maxY: selectedModel.boundingBox.z, // Z in model = height
    };
  }, [selectedModel]);

  // Reset cut height to midpoint when model changes
  useEffect(() => {
    if (active && selectedModel?.boundingBox) {
      setCutHeight(selectedModel.boundingBox.z / 2);
    }
  }, [active, selectedModel?.id, selectedModel?.boundingBox]);

  // Drag to adjust cut height
  const handlePointerDown = useCallback(
    (e: THREE.Event & { stopPropagation: () => void }) => {
      e.stopPropagation();
      setIsDragging(true);
      const canvas = gl.domElement;
      const rect = canvas.getBoundingClientRect();

      // Store initial pointer Y and height
      const pointerEvent = e as unknown as PointerEvent;
      dragStartY.current = pointerEvent.clientY ?? (e as unknown as { clientY: number }).clientY;
      dragStartHeight.current = cutHeight;

      // Capture pointer for smooth dragging
      canvas.setPointerCapture(
        pointerEvent.pointerId ?? (e as unknown as { pointerId: number }).pointerId
      );
    },
    [cutHeight, gl.domElement]
  );

  // Global pointer move/up handlers for dragging
  useEffect(() => {
    if (!active || !isDragging) return;

    const canvas = gl.domElement;

    const handlePointerMove = (e: PointerEvent) => {
      // Convert pixel delta to world-space Y delta
      // Use a simple mapping: pixels -> mm based on camera distance
      const deltaPixels = dragStartY.current - e.clientY;
      const cameraDistance = camera.position.length();
      const sensitivity = cameraDistance / 500;
      const newHeight = Math.max(
        0.1,
        Math.min(modelBounds.maxY - 0.1, dragStartHeight.current + deltaPixels * sensitivity)
      );
      setCutHeight(newHeight);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    return () => {
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
    };
  }, [active, isDragging, camera, gl.domElement, modelBounds]);

  // Cancel on Escape
  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setToolMode("select");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, setToolMode]);

  // Perform the cut
  const handleCut = useCallback(async () => {
    if (!selectedModel) {
      addToast({ message: "No model selected to cut", type: "error" });
      return;
    }

    setIsCutting(true);
    try {
      const res = await fetch(`/api/models/${selectedModel.id}/cut`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planeNormal: [0, 0, 1], // Cutting along Z-axis (horizontal plane)
          planePoint: [0, 0, cutHeight],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Cut failed" }));
        addToast({ message: err.error || "Cut failed", type: "error" });
        return;
      }

      const data = await res.json();

      // Remove original model
      removeModel(selectedModel.id);

      // Add both halves
      addModel({
        id: data.modelA.id,
        name: data.modelA.name,
        filename: data.modelA.filename,
        url: `/api/models/${data.modelA.id}/file`,
        fileFormat: data.modelA.fileFormat || "stl",
        fileSizeBytes: data.modelA.fileSizeBytes || 0,
        triangleCount: data.modelA.triangleCount,
        boundingBox: data.modelA.boundingBox,
        volumeCm3: data.modelA.volumeCm3,
        surfaceAreaCm2: data.modelA.surfaceAreaCm2,
        isManifold: data.modelA.isManifold,
        meshAnalyzed: data.modelA.meshAnalyzed ?? false,
      });

      addModel({
        id: data.modelB.id,
        name: data.modelB.name,
        filename: data.modelB.filename,
        url: `/api/models/${data.modelB.id}/file`,
        fileFormat: data.modelB.fileFormat || "stl",
        fileSizeBytes: data.modelB.fileSizeBytes || 0,
        triangleCount: data.modelB.triangleCount,
        boundingBox: data.modelB.boundingBox,
        volumeCm3: data.modelB.volumeCm3,
        surfaceAreaCm2: data.modelB.surfaceAreaCm2,
        isManifold: data.modelB.isManifold,
        meshAnalyzed: data.modelB.meshAnalyzed ?? false,
      });

      addToast({ message: `Cut "${selectedModel.name}" into two parts`, type: "success" });
      setToolMode("select");
    } catch (err) {
      addToast({ message: "Cut operation failed", type: "error" });
    } finally {
      setIsCutting(false);
    }
  }, [selectedModel, cutHeight, addModel, removeModel, addToast, setToolMode]);

  const handleCancel = useCallback(() => {
    setToolMode("select");
  }, [setToolMode]);

  if (!active) return null;

  // Plane size based on model or default
  const planeSize = Math.max(
    (selectedModel?.boundingBox?.x ?? 100) * 2,
    (selectedModel?.boundingBox?.y ?? 100) * 2,
    200
  );

  return (
    <group>
      {/* Semi-transparent cutting plane */}
      <mesh
        ref={planeRef}
        position={[
          selectedModel?.position?.[0] ?? 0,
          cutHeight,
          selectedModel?.position?.[2] ?? 0,
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={handlePointerDown}
      >
        <planeGeometry args={[planeSize, planeSize]} />
        <meshBasicMaterial
          color="#ef4444"
          transparent
          opacity={isDragging ? 0.35 : 0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Plane edge outline ring */}
      <mesh
        position={[
          selectedModel?.position?.[0] ?? 0,
          cutHeight,
          selectedModel?.position?.[2] ?? 0,
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[planeSize / 2 - 0.5, planeSize / 2, 64]} />
        <meshBasicMaterial
          color="#f97316"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Center line indicator */}
      <mesh
        position={[
          selectedModel?.position?.[0] ?? 0,
          cutHeight,
          selectedModel?.position?.[2] ?? 0,
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={handlePointerDown}
      >
        <ringGeometry args={[0, 3, 32]} />
        <meshBasicMaterial
          color="#f97316"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Height label */}
      <Html
        position={[
          (selectedModel?.position?.[0] ?? 0) + planeSize / 2 + 5,
          cutHeight,
          selectedModel?.position?.[2] ?? 0,
        ]}
        center
        style={{ pointerEvents: "none" }}
      >
        <div className="whitespace-nowrap rounded-md bg-zinc-900/90 border border-red-500/40 px-2.5 py-1 text-xs text-zinc-200 shadow-lg backdrop-blur-sm">
          <span className="font-medium text-red-400">
            Cut at Z: {cutHeight.toFixed(1)}mm
          </span>
        </div>
      </Html>

      {/* Action buttons overlay */}
      <Html
        position={[
          selectedModel?.position?.[0] ?? 0,
          cutHeight + 12,
          selectedModel?.position?.[2] ?? 0,
        ]}
        center
      >
        <div className="flex gap-2">
          <button
            onClick={handleCut}
            disabled={isCutting || !selectedModel}
            className="rounded-md bg-red-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCutting ? "Cutting..." : "Cut"}
          </button>
          <button
            onClick={handleCancel}
            disabled={isCutting}
            className="rounded-md bg-zinc-700 px-4 py-1.5 text-xs font-semibold text-zinc-200 shadow-lg transition-colors hover:bg-zinc-600 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </Html>

      {/* Instruction hint (only when no model selected) */}
      {!selectedModel && (
        <Html position={[0, 30, 0]} center style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-md bg-zinc-900/90 border border-zinc-600 px-3 py-2 text-xs text-zinc-400 shadow-lg backdrop-blur-sm">
            Select a model first, then adjust the cut plane height
          </div>
        </Html>
      )}
    </group>
  );
}

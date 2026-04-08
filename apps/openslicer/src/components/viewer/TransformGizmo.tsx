"use client";

import { useRef, useEffect, useCallback } from "react";
import { TransformControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ToolMode } from "../../stores/slicer-store";

interface TransformGizmoProps {
  targetRef: React.RefObject<THREE.Group | null>;
  toolMode: ToolMode;
  onTransformChange: (
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number]
  ) => void;
}

const TOOL_TO_TRANSFORM_MODE: Record<string, "translate" | "rotate" | "scale"> = {
  move: "translate",
  rotate: "rotate",
  scale: "scale",
};

export function TransformGizmo({
  targetRef,
  toolMode,
  onTransformChange,
}: TransformGizmoProps) {
  const transformRef = useRef<any>(null);
  const { controls } = useThree();

  const mode = TOOL_TO_TRANSFORM_MODE[toolMode];
  if (!mode) return null;

  // Disable orbit controls while dragging the gizmo
  useEffect(() => {
    const tc = transformRef.current;
    if (!tc || !controls) return;

    const onDraggingChanged = (event: { value: boolean }) => {
      (controls as any).enabled = !event.value;
    };

    tc.addEventListener("dragging-changed", onDraggingChanged);
    return () => {
      tc.removeEventListener("dragging-changed", onDraggingChanged);
      // Re-enable orbit controls on unmount
      (controls as any).enabled = true;
    };
  }, [controls]);

  const handleObjectChange = useCallback(() => {
    const target = targetRef.current;
    if (!target) return;

    const pos = target.position;
    const rot = target.rotation;
    const scl = target.scale;

    onTransformChange(
      [pos.x, pos.y, pos.z],
      [rot.x, rot.y, rot.z],
      [scl.x, scl.y, scl.z]
    );
  }, [targetRef, onTransformChange]);

  return (
    <TransformControls
      ref={transformRef}
      object={targetRef.current ?? undefined}
      mode={mode}
      onObjectChange={handleObjectChange}
      size={0.8}
    />
  );
}

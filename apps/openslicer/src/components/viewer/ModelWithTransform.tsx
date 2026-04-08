"use client";

import { useRef, useCallback } from "react";
import { ModelLoader } from "./ModelLoader";
import { TransformGizmo } from "./TransformGizmo";
import type { ModelLoaderHandle } from "./ModelLoader";
import type { ToolMode, SlicerModel } from "../../stores/slicer-store";
import * as THREE from "three";

interface ModelWithTransformProps {
  model: SlicerModel;
  selected: boolean;
  toolMode: ToolMode;
  onSelect: () => void;
  onTransformChange: (
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number]
  ) => void;
}

export function ModelWithTransform({
  model,
  selected,
  toolMode,
  onSelect,
  onTransformChange,
}: ModelWithTransformProps) {
  const modelHandle = useRef<ModelLoaderHandle>(null);

  const isTransformMode = toolMode === "move" || toolMode === "rotate" || toolMode === "scale";
  const showGizmo = selected && isTransformMode;

  return (
    <>
      <ModelLoader
        ref={modelHandle}
        url={model.url}
        selected={selected}
        onSelect={onSelect}
        position={model.position}
        rotation={model.rotation}
        scale={model.scale}
      />
      {showGizmo && modelHandle.current?.groupRef && (
        <TransformGizmo
          targetRef={modelHandle.current.groupRef}
          toolMode={toolMode}
          onTransformChange={onTransformChange}
        />
      )}
    </>
  );
}

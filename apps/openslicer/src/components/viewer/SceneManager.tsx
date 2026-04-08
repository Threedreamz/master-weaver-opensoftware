"use client";

import { ModelLoader } from "./ModelLoader";

interface SceneModel {
  id: string;
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
}

interface SceneManagerProps {
  models: SceneModel[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

export function SceneManager({
  models,
  selectedId = null,
  onSelect,
}: SceneManagerProps) {
  return (
    <group>
      {models.map((model) => (
        <ModelLoader
          key={model.id}
          url={model.url}
          position={model.position ?? [0, 0, 0]}
          rotation={model.rotation ?? [0, 0, 0]}
          color={model.color}
          selected={model.id === selectedId}
          onSelect={() => onSelect?.(model.id)}
        />
      ))}
    </group>
  );
}

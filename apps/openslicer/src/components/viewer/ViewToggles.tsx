"use client";

import { Box, Axis3D, Grid3X3, Magnet } from "lucide-react";
import { useSlicerStore } from "../../stores/slicer-store";

const TOGGLES = [
  { key: "wireframe" as const, icon: Box, label: "Wireframe" },
  { key: "axes" as const, icon: Axis3D, label: "Axes" },
  { key: "grid" as const, icon: Grid3X3, label: "Grid" },
  { key: "snap" as const, icon: Magnet, label: "Snap to Grid" },
];

/**
 * Small icon toggle row overlaid at the top-left of the 3D viewport.
 * Mirrors OrcaSlicer's viewport view toggles.
 */
export function ViewToggles() {
  const viewSettings = useSlicerStore((s) => s.viewSettings);
  const toggleViewSetting = useSlicerStore((s) => s.toggleViewSetting);

  return (
    <div className="absolute left-3 top-3 z-10 flex gap-1">
      {TOGGLES.map(({ key, icon: Icon, label }) => {
        const active = viewSettings[key];
        return (
          <button
            key={key}
            onClick={() => toggleViewSetting(key)}
            title={label}
            className={`flex h-7 w-7 items-center justify-center rounded-md backdrop-blur transition-colors ${
              active
                ? "bg-zinc-800/90 text-zinc-100 shadow"
                : "bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-300"
            }`}
          >
            <Icon size={16} strokeWidth={active ? 2 : 1.5} />
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { Layers } from "lucide-react";

interface LayerSliderProps {
  currentLayer: number;
  totalLayers: number;
  onChange: (layer: number) => void;
}

/**
 * Vertical range slider for navigating G-code layers.
 */
export function LayerSlider({
  currentLayer,
  totalLayers,
  onChange,
}: LayerSliderProps) {
  const maxLayer = Math.max(totalLayers - 1, 0);

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
        <Layers className="h-3.5 w-3.5" />
        Layer
      </div>

      <span className="text-xs font-mono text-zinc-400">{maxLayer}</span>

      <div className="relative flex h-48 items-center justify-center">
        <input
          type="range"
          min={0}
          max={maxLayer}
          value={currentLayer}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="h-48 w-6 cursor-pointer appearance-none rounded-full bg-zinc-700"
          style={{
            writingMode: "vertical-lr",
            direction: "rtl",
            WebkitAppearance: "slider-vertical",
          }}
        />
      </div>

      <span className="text-xs font-mono text-zinc-400">0</span>

      <div className="mt-1 rounded bg-zinc-800 px-2 py-1 text-center">
        <span className="text-xs font-mono text-amber-400">
          {currentLayer}
        </span>
        <span className="text-xs text-zinc-500"> / {maxLayer}</span>
      </div>
    </div>
  );
}

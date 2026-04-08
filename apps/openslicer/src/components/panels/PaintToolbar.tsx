"use client";

import { useSlicerStore } from "../../stores/slicer-store";
import type { PaintMode } from "../../stores/slicer-store";

const PAINT_MODES: { mode: PaintMode; label: string; color: string; description: string }[] = [
  {
    mode: "support_enforcer",
    label: "Support Enforcer",
    color: "bg-green-500",
    description: "Force supports on painted faces",
  },
  {
    mode: "support_blocker",
    label: "Support Blocker",
    color: "bg-red-500",
    description: "Block supports on painted faces",
  },
  {
    mode: "seam",
    label: "Seam Position",
    color: "bg-blue-500",
    description: "Place Z-seam on painted faces",
  },
];

export function PaintToolbar() {
  const {
    paintMode,
    paintBrushSize,
    selectedModelId,
    setPaintMode,
    setPaintBrushSize,
    clearPaintData,
    modelPaintData,
  } = useSlicerStore();

  if (!paintMode) return null;

  const paintData = selectedModelId ? modelPaintData[selectedModelId] : null;
  const totalPainted =
    (paintData?.supportEnforcers.length ?? 0) +
    (paintData?.supportBlockers.length ?? 0) +
    (paintData?.seamPositions.length ?? 0);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Paint Tool
        </h3>
        <button
          onClick={() => setPaintMode(null)}
          className="rounded px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
        >
          Done
        </button>
      </div>

      {/* Paint mode selection */}
      <div className="space-y-1">
        {PAINT_MODES.map(({ mode, label, color, description }) => (
          <button
            key={mode}
            onClick={() => setPaintMode(mode)}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
              paintMode === mode
                ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
            }`}
          >
            <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
            <span className="flex-1">
              <span className="block font-medium">{label}</span>
              <span className="block text-[10px] text-zinc-500">{description}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Brush size slider */}
      <div className="space-y-1">
        <label className="flex items-center justify-between text-xs text-zinc-400">
          <span>Brush Size</span>
          <span className="font-mono text-zinc-500">{paintBrushSize}</span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={paintBrushSize}
          onChange={(e) => setPaintBrushSize(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>Fine</span>
          <span>Broad</span>
        </div>
      </div>

      {/* Usage instructions */}
      <div className="rounded-md bg-zinc-800/50 p-2 text-[10px] text-zinc-500 space-y-0.5">
        <p>Left-click + drag to paint</p>
        <p>Right-click + drag to erase</p>
        <p>Hold Alt to orbit camera</p>
      </div>

      {/* Stats */}
      {paintData && totalPainted > 0 && (
        <div className="rounded-md bg-zinc-800/50 p-2 text-xs text-zinc-400 space-y-0.5">
          {paintData.supportEnforcers.length > 0 && (
            <p className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              {paintData.supportEnforcers.length} enforcer faces
            </p>
          )}
          {paintData.supportBlockers.length > 0 && (
            <p className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              {paintData.supportBlockers.length} blocker faces
            </p>
          )}
          {paintData.seamPositions.length > 0 && (
            <p className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
              {paintData.seamPositions.length} seam faces
            </p>
          )}
        </div>
      )}

      {/* Clear all */}
      {selectedModelId && totalPainted > 0 && (
        <button
          onClick={() => clearPaintData(selectedModelId)}
          className="flex w-full items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-red-400"
        >
          Clear All Paint
        </button>
      )}

      {!selectedModelId && (
        <p className="px-1 text-xs text-zinc-500 italic">
          Select a model to paint on
        </p>
      )}
    </div>
  );
}

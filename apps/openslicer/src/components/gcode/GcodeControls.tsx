"use client";

import { Eye, EyeOff, Circle } from "lucide-react";
import type { MoveType } from "@opensoftware/slicer-core";
import { MOVE_TYPE_COLORS, MOVE_TYPE_LABELS, type GcodeColorMode } from "../../lib/gcode-colors";
import { useSlicerStore, type GcodeVisibility } from "../../stores/slicer-store";

const COLOR_MODE_OPTIONS: { value: GcodeColorMode; label: string }[] = [
  { value: "type", label: "Type" },
  { value: "speed", label: "Speed" },
  { value: "flowRate", label: "Flow Rate" },
  { value: "temperature", label: "Temperature" },
];

const MOVE_TYPE_ORDER: MoveType[] = [
  "outer_wall",
  "inner_wall",
  "infill",
  "support",
  "bridge",
  "skirt",
  "wipe",
  "travel",
  "custom",
];

/**
 * G-code visualization controls: color mode selector, move type visibility toggles,
 * and retraction marker toggle. Matches the dark zinc theme.
 */
export function GcodeControls() {
  const {
    gcodeColorMode,
    setGcodeColorMode,
    gcodeVisibility,
    toggleMoveTypeVisibility,
    showRetractions,
    setShowRetractions,
  } = useSlicerStore();

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 space-y-3">
      {/* Color Mode Selector */}
      <div>
        <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Color by
        </h4>
        <div className="flex rounded-md border border-zinc-700 overflow-hidden">
          {COLOR_MODE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setGcodeColorMode(value)}
              className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
                gcodeColorMode === value
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Move Type Visibility Toggles */}
      <div>
        <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Visibility
        </h4>
        <div className="space-y-0.5">
          {MOVE_TYPE_ORDER.map((moveType) => {
            const visible = gcodeVisibility[moveType];
            const color = MOVE_TYPE_COLORS[moveType];
            const label = MOVE_TYPE_LABELS[moveType];

            return (
              <button
                key={moveType}
                onClick={() => toggleMoveTypeVisibility(moveType)}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                  visible
                    ? "text-zinc-200 hover:bg-zinc-800"
                    : "text-zinc-500 hover:bg-zinc-800/50"
                }`}
              >
                {/* Color swatch */}
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-sm"
                  style={{
                    backgroundColor: visible ? color : 'transparent',
                    border: `1.5px solid ${color}`,
                    opacity: visible ? 1 : 0.4,
                  }}
                />
                {/* Label */}
                <span className="flex-1">{label}</span>
                {/* Eye icon */}
                {visible ? (
                  <Eye className="h-3 w-3 shrink-0 text-zinc-500" />
                ) : (
                  <EyeOff className="h-3 w-3 shrink-0 text-zinc-600" />
                )}
              </button>
            );
          })}

          {/* Retraction markers toggle */}
          <button
            onClick={() => setShowRetractions(!showRetractions)}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
              showRetractions
                ? "text-zinc-200 hover:bg-zinc-800"
                : "text-zinc-500 hover:bg-zinc-800/50"
            }`}
          >
            <Circle
              className="h-3 w-3 shrink-0"
              style={{
                color: showRetractions ? '#EF4444' : '#6b7280',
                fill: showRetractions ? '#EF4444' : 'transparent',
              }}
            />
            <span className="flex-1">Retractions</span>
            {showRetractions ? (
              <Eye className="h-3 w-3 shrink-0 text-zinc-500" />
            ) : (
              <EyeOff className="h-3 w-3 shrink-0 text-zinc-600" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

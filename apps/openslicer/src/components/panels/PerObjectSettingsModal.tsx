"use client";

import { useState, useEffect } from "react";
import type { ProcessOverrides } from "../../stores/slicer-store";

interface PerObjectSettingsModalProps {
  modelName: string;
  currentOverrides: ProcessOverrides;
  onApply: (overrides: ProcessOverrides) => void;
  onCancel: () => void;
}

const INFILL_PATTERNS = ["rectilinear", "grid", "gyroid", "honeycomb"];
const SUPPORT_TYPES = ["none", "normal", "tree"];

interface FieldState<T> {
  enabled: boolean;
  value: T;
}

export function PerObjectSettingsModal({
  modelName,
  currentOverrides,
  onApply,
  onCancel,
}: PerObjectSettingsModalProps) {
  const [layerHeight, setLayerHeight] = useState<FieldState<number>>({
    enabled: currentOverrides.layerHeight != null,
    value: currentOverrides.layerHeight ?? 0.2,
  });
  const [infillDensity, setInfillDensity] = useState<FieldState<number>>({
    enabled: currentOverrides.infillDensity != null,
    value: currentOverrides.infillDensity ?? 20,
  });
  const [infillPattern, setInfillPattern] = useState<FieldState<string>>({
    enabled: currentOverrides.infillPattern != null,
    value: currentOverrides.infillPattern ?? "gyroid",
  });
  const [wallCount, setWallCount] = useState<FieldState<number>>({
    enabled: currentOverrides.wallCount != null,
    value: currentOverrides.wallCount ?? 3,
  });
  const [supportType, setSupportType] = useState<FieldState<string>>({
    enabled: currentOverrides.supportType != null,
    value: currentOverrides.supportType ?? "none",
  });
  const [perimeterSpeed, setPerimeterSpeed] = useState<FieldState<number>>({
    enabled: currentOverrides.printSpeedPerimeter != null,
    value: currentOverrides.printSpeedPerimeter ?? 60,
  });
  const [infillSpeed, setInfillSpeed] = useState<FieldState<number>>({
    enabled: currentOverrides.printSpeedInfill != null,
    value: currentOverrides.printSpeedInfill ?? 80,
  });

  const handleApply = () => {
    const overrides: ProcessOverrides = {};
    if (layerHeight.enabled) overrides.layerHeight = layerHeight.value;
    if (infillDensity.enabled) overrides.infillDensity = infillDensity.value;
    if (infillPattern.enabled) overrides.infillPattern = infillPattern.value;
    if (wallCount.enabled) overrides.wallCount = wallCount.value;
    if (supportType.enabled) overrides.supportType = supportType.value;
    if (perimeterSpeed.enabled) overrides.printSpeedPerimeter = perimeterSpeed.value;
    if (infillSpeed.enabled) overrides.printSpeedInfill = infillSpeed.value;
    onApply(overrides);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">
            Per-Object Settings: {modelName}
          </h2>
          <button
            onClick={onCancel}
            className="text-zinc-500 hover:text-zinc-300"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
          <p className="text-xs text-zinc-500">
            Check a field to override the global profile default for this object.
          </p>

          {/* Layer Height */}
          <FieldRow
            label="Layer Height (mm)"
            checked={layerHeight.enabled}
            onToggle={(c) => setLayerHeight((s) => ({ ...s, enabled: c }))}
          >
            <input
              type="number"
              step={0.01}
              min={0.04}
              max={0.6}
              value={layerHeight.value}
              onChange={(e) =>
                setLayerHeight((s) => ({ ...s, value: parseFloat(e.target.value) || 0.2 }))
              }
              disabled={!layerHeight.enabled}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
            />
          </FieldRow>

          {/* Infill Density */}
          <FieldRow
            label="Infill Density (%)"
            checked={infillDensity.enabled}
            onToggle={(c) => setInfillDensity((s) => ({ ...s, enabled: c }))}
          >
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={infillDensity.value}
                onChange={(e) =>
                  setInfillDensity((s) => ({ ...s, value: parseInt(e.target.value, 10) }))
                }
                disabled={!infillDensity.enabled}
                className="flex-1 disabled:opacity-40"
              />
              <span className="w-8 text-right text-xs text-zinc-400">
                {infillDensity.value}%
              </span>
            </div>
          </FieldRow>

          {/* Infill Pattern */}
          <FieldRow
            label="Infill Pattern"
            checked={infillPattern.enabled}
            onToggle={(c) => setInfillPattern((s) => ({ ...s, enabled: c }))}
          >
            <select
              value={infillPattern.value}
              onChange={(e) => setInfillPattern((s) => ({ ...s, value: e.target.value }))}
              disabled={!infillPattern.enabled}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
            >
              {INFILL_PATTERNS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </FieldRow>

          {/* Wall Count */}
          <FieldRow
            label="Wall Count"
            checked={wallCount.enabled}
            onToggle={(c) => setWallCount((s) => ({ ...s, enabled: c }))}
          >
            <input
              type="number"
              min={1}
              max={20}
              value={wallCount.value}
              onChange={(e) =>
                setWallCount((s) => ({ ...s, value: parseInt(e.target.value, 10) || 3 }))
              }
              disabled={!wallCount.enabled}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
            />
          </FieldRow>

          {/* Support Type */}
          <FieldRow
            label="Support Type"
            checked={supportType.enabled}
            onToggle={(c) => setSupportType((s) => ({ ...s, enabled: c }))}
          >
            <select
              value={supportType.value}
              onChange={(e) => setSupportType((s) => ({ ...s, value: e.target.value }))}
              disabled={!supportType.enabled}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
            >
              {SUPPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </FieldRow>

          {/* Perimeter Speed */}
          <FieldRow
            label="Perimeter Speed (mm/s)"
            checked={perimeterSpeed.enabled}
            onToggle={(c) => setPerimeterSpeed((s) => ({ ...s, enabled: c }))}
          >
            <input
              type="number"
              min={5}
              max={500}
              value={perimeterSpeed.value}
              onChange={(e) =>
                setPerimeterSpeed((s) => ({ ...s, value: parseInt(e.target.value, 10) || 60 }))
              }
              disabled={!perimeterSpeed.enabled}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
            />
          </FieldRow>

          {/* Infill Speed */}
          <FieldRow
            label="Infill Speed (mm/s)"
            checked={infillSpeed.enabled}
            onToggle={(c) => setInfillSpeed((s) => ({ ...s, enabled: c }))}
          >
            <input
              type="number"
              min={5}
              max={500}
              value={infillSpeed.value}
              onChange={(e) =>
                setInfillSpeed((s) => ({ ...s, value: parseInt(e.target.value, 10) || 80 }))
              }
              disabled={!infillSpeed.enabled}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
            />
          </FieldRow>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-4 py-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  label,
  checked,
  onToggle,
  children,
}: {
  label: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-xs text-zinc-300">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
        />
        {label}
      </label>
      <div className="pl-5">{children}</div>
    </div>
  );
}

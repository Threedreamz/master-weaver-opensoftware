"use client";

import { useState } from "react";
import type { ProcessOverrides, HeightRangeModifier } from "../../stores/slicer-store";

const INFILL_PATTERNS = ["rectilinear", "grid", "gyroid", "honeycomb"];
const SUPPORT_TYPES = ["none", "normal", "tree"];

interface HeightRangeEditorProps {
  modelName: string;
  modelHeight?: number;
  modifier?: HeightRangeModifier;
  onSave: (modifier: Omit<HeightRangeModifier, "id"> & { id?: string }) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function HeightRangeEditor({
  modelName,
  modelHeight,
  modifier,
  onSave,
  onDelete,
  onCancel,
}: HeightRangeEditorProps) {
  const [zMin, setZMin] = useState(modifier?.zMin ?? 0);
  const [zMax, setZMax] = useState(modifier?.zMax ?? (modelHeight ?? 10));
  const [settings, setSettings] = useState<Partial<ProcessOverrides>>(
    modifier?.settings ?? {}
  );

  const maxZ = modelHeight ?? 999;
  const rangePercent =
    modelHeight && modelHeight > 0
      ? {
          bottom: (zMin / modelHeight) * 100,
          top: (zMax / modelHeight) * 100,
        }
      : null;

  const updateSetting = <K extends keyof ProcessOverrides>(
    key: K,
    value: ProcessOverrides[K] | undefined
  ) => {
    setSettings((prev) => {
      if (value === undefined) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  };

  const handleSave = () => {
    onSave({
      id: modifier?.id,
      zMin,
      zMax: Math.max(zMax, zMin + 0.1),
      settings,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">
            {modifier ? "Edit" : "Add"} Height Range: {modelName}
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
          {/* Z Range inputs */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-zinc-400">
                Z Min (mm)
              </label>
              <input
                type="number"
                step={0.1}
                min={0}
                max={maxZ}
                value={zMin}
                onChange={(e) => setZMin(parseFloat(e.target.value) || 0)}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-zinc-400">
                Z Max (mm)
              </label>
              <input
                type="number"
                step={0.1}
                min={0}
                max={maxZ}
                value={zMax}
                onChange={(e) => setZMax(parseFloat(e.target.value) || 0)}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
              />
            </div>
          </div>

          {/* Z range preview bar */}
          {rangePercent && (
            <div className="relative h-4 w-full overflow-hidden rounded bg-zinc-800">
              <div
                className="absolute inset-y-0 rounded bg-indigo-600/50"
                style={{
                  left: `${rangePercent.bottom}%`,
                  width: `${Math.max(rangePercent.top - rangePercent.bottom, 1)}%`,
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[9px] text-zinc-400">
                {zMin.toFixed(1)} - {zMax.toFixed(1)} mm
                {modelHeight ? ` / ${modelHeight.toFixed(1)} mm` : ""}
              </span>
            </div>
          )}

          <hr className="border-zinc-800" />
          <p className="text-xs text-zinc-500">
            Override settings within this Z range:
          </p>

          {/* Layer Height */}
          <SettingToggle
            label="Layer Height (mm)"
            active={settings.layerHeight != null}
            onToggle={(on) =>
              updateSetting("layerHeight", on ? 0.2 : undefined)
            }
          >
            <input
              type="number"
              step={0.01}
              min={0.04}
              max={0.6}
              value={settings.layerHeight ?? 0.2}
              onChange={(e) =>
                updateSetting("layerHeight", parseFloat(e.target.value) || 0.2)
              }
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
            />
          </SettingToggle>

          {/* Infill Density */}
          <SettingToggle
            label="Infill Density (%)"
            active={settings.infillDensity != null}
            onToggle={(on) =>
              updateSetting("infillDensity", on ? 20 : undefined)
            }
          >
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={settings.infillDensity ?? 20}
                onChange={(e) =>
                  updateSetting("infillDensity", parseInt(e.target.value, 10))
                }
                className="flex-1"
              />
              <span className="w-8 text-right text-xs text-zinc-400">
                {settings.infillDensity ?? 20}%
              </span>
            </div>
          </SettingToggle>

          {/* Infill Pattern */}
          <SettingToggle
            label="Infill Pattern"
            active={settings.infillPattern != null}
            onToggle={(on) =>
              updateSetting("infillPattern", on ? "gyroid" : undefined)
            }
          >
            <select
              value={settings.infillPattern ?? "gyroid"}
              onChange={(e) => updateSetting("infillPattern", e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
            >
              {INFILL_PATTERNS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </SettingToggle>

          {/* Wall Count */}
          <SettingToggle
            label="Wall Count"
            active={settings.wallCount != null}
            onToggle={(on) => updateSetting("wallCount", on ? 3 : undefined)}
          >
            <input
              type="number"
              min={1}
              max={20}
              value={settings.wallCount ?? 3}
              onChange={(e) =>
                updateSetting("wallCount", parseInt(e.target.value, 10) || 3)
              }
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
            />
          </SettingToggle>

          {/* Print Speed Perimeter */}
          <SettingToggle
            label="Perimeter Speed (mm/s)"
            active={settings.printSpeedPerimeter != null}
            onToggle={(on) =>
              updateSetting("printSpeedPerimeter", on ? 60 : undefined)
            }
          >
            <input
              type="number"
              min={5}
              max={500}
              value={settings.printSpeedPerimeter ?? 60}
              onChange={(e) =>
                updateSetting(
                  "printSpeedPerimeter",
                  parseInt(e.target.value, 10) || 60
                )
              }
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
            />
          </SettingToggle>

          {/* Print Speed Infill */}
          <SettingToggle
            label="Infill Speed (mm/s)"
            active={settings.printSpeedInfill != null}
            onToggle={(on) =>
              updateSetting("printSpeedInfill", on ? 80 : undefined)
            }
          >
            <input
              type="number"
              min={5}
              max={500}
              value={settings.printSpeedInfill ?? 80}
              onChange={(e) =>
                updateSetting(
                  "printSpeedInfill",
                  parseInt(e.target.value, 10) || 80
                )
              }
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
            />
          </SettingToggle>
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t border-zinc-800 px-4 py-3">
          <div>
            {onDelete && (
              <button
                onClick={onDelete}
                className="rounded-md border border-red-800 bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/50"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
            >
              {modifier ? "Save" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingToggle({
  label,
  active,
  onToggle,
  children,
}: {
  label: string;
  active: boolean;
  onToggle: (on: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-xs text-zinc-300">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => onToggle(e.target.checked)}
          className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
        />
        {label}
      </label>
      {active && <div className="pl-5">{children}</div>}
    </div>
  );
}

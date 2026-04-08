"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { useSlicerStore } from "../../../stores/slicer-store";
import { CollapsibleSection } from "../../ui/CollapsibleSection";
import { VariableLayerHeight } from "../VariableLayerHeight";

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";
const labelClass =
  "block text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1";
const selectClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";

function Toggle({
  checked,
  onChange,
  label,
  tooltip,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-300" title={tooltip}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-blue-500" : "bg-zinc-600"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function QualityTab() {
  const {
    sliceOverrides,
    setSliceOverride,
    processProfiles,
    selectedProcessProfileId,
    variableLayerProfile,
  } = useSlicerStore();

  const [vlhOpen, setVlhOpen] = useState(false);

  const activeProfile = processProfiles.find(
    (p) => p.id === selectedProcessProfileId
  );

  const hasVariableProfile =
    variableLayerProfile !== null && variableLayerProfile.length > 2;

  return (
    <div className="flex flex-col">
      <VariableLayerHeight open={vlhOpen} onClose={() => setVlhOpen(false)} />
      <CollapsibleSection title="Layer" defaultOpen>
        <div className="flex flex-col gap-3">
          {/* Layer Height */}
          <div>
            <label className={labelClass} title="Height of each printed layer. Lower = better quality, slower print">
              Layer Height
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0.04}
                max={0.4}
                step={0.01}
                value={sliceOverrides.layerHeight ?? ""}
                placeholder={
                  activeProfile?.layerHeight != null
                    ? String(activeProfile.layerHeight)
                    : "0.2"
                }
                onChange={(e) =>
                  setSliceOverride("layerHeight", parseFloat(e.target.value))
                }
                className={`flex-1 ${inputClass}`}
              />
              <span className="text-[10px] text-zinc-500">mm</span>
            </div>
          </div>

          {/* First Layer Height */}
          <div>
            <label className={labelClass} title="Height of the first layer. Thicker first layers improve bed adhesion">
              First Layer Height
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0.04}
                max={0.4}
                step={0.01}
                value={sliceOverrides.firstLayerHeight ?? ""}
                placeholder={
                  activeProfile?.firstLayerHeight != null
                    ? String(activeProfile.firstLayerHeight)
                    : "0.2"
                }
                onChange={(e) =>
                  setSliceOverride(
                    "firstLayerHeight",
                    parseFloat(e.target.value)
                  )
                }
                className={`flex-1 ${inputClass}`}
              />
              <span className="text-[10px] text-zinc-500">mm</span>
            </div>
          </div>

          {/* Adaptive Layer Height */}
          <Toggle
            checked={sliceOverrides.adaptiveLayerHeight ?? false}
            onChange={(v) => setSliceOverride("adaptiveLayerHeight", v)}
            label="Adaptive Layer Height"
            tooltip="Automatically varies layer height based on model geometry for faster prints with good detail"
          />

          {/* Variable Layer Height */}
          <div>
            <button
              type="button"
              onClick={() => setVlhOpen(true)}
              className={`flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                hasVariableProfile
                  ? "border-indigo-600 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30"
                  : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Variable Height
              {hasVariableProfile && (
                <span className="ml-1 rounded-full bg-indigo-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                  {variableLayerProfile!.length}pt
                </span>
              )}
            </button>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Surface">
        <div className="flex flex-col gap-3">
          {/* Seam Position */}
          <div>
            <label className={labelClass} title="Where each layer starts. Aligned hides the seam, Random distributes it">
              Seam Position
            </label>
            <select
              value={sliceOverrides.seamPosition ?? "nearest"}
              onChange={(e) =>
                setSliceOverride("seamPosition", e.target.value)
              }
              className={selectClass}
            >
              <option value="nearest">Nearest</option>
              <option value="aligned">Aligned</option>
              <option value="random">Random</option>
              <option value="rear">Rear</option>
            </select>
          </div>

          {/* Toggles */}
          <Toggle
            checked={sliceOverrides.ironing ?? false}
            onChange={(v) => setSliceOverride("ironing", v)}
            label="Ironing"
            tooltip="Passes the nozzle over top surfaces for a smoother finish. Adds print time"
          />
          <Toggle
            checked={sliceOverrides.fuzzySkin ?? false}
            onChange={(v) => setSliceOverride("fuzzySkin", v)}
            label="Fuzzy Skin"
            tooltip="Adds random vibrations to outer walls for a textured, matte surface finish"
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}

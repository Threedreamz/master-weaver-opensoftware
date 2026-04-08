"use client";

import { useSlicerStore } from "../../../stores/slicer-store";
import { CollapsibleSection } from "../../ui/CollapsibleSection";

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";
const labelClass =
  "block text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1";
const selectClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";

export function StrengthTab() {
  const {
    sliceOverrides,
    setSliceOverride,
    processProfiles,
    selectedProcessProfileId,
  } = useSlicerStore();

  const activeProfile = processProfiles.find(
    (p) => p.id === selectedProcessProfileId
  );

  return (
    <div className="flex flex-col">
      <CollapsibleSection title="Walls" defaultOpen>
        <div className="flex flex-col gap-3">
          {/* Wall Count */}
          <div>
            <label className={labelClass} title="Number of outer wall loops. More walls = stronger part, longer print">
              Wall Count
            </label>
            <input
              type="number"
              min={1}
              max={10}
              step={1}
              value={sliceOverrides.wallCount ?? ""}
              placeholder={
                activeProfile?.wallCount != null
                  ? String(activeProfile.wallCount)
                  : "2"
              }
              onChange={(e) =>
                setSliceOverride("wallCount", parseInt(e.target.value, 10))
              }
              className={inputClass}
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Top / Bottom">
        <div className="flex flex-col gap-3">
          {/* Top Layers */}
          <div>
            <label className={labelClass} title="Number of solid layers on top surfaces. More layers = better top finish">
              Top Layers
            </label>
            <input
              type="number"
              min={0}
              max={20}
              step={1}
              value={sliceOverrides.topLayers ?? ""}
              placeholder="4"
              onChange={(e) =>
                setSliceOverride("topLayers", parseInt(e.target.value, 10))
              }
              className={inputClass}
            />
          </div>

          {/* Bottom Layers */}
          <div>
            <label className={labelClass} title="Number of solid layers on bottom surfaces. More layers = stronger base">
              Bottom Layers
            </label>
            <input
              type="number"
              min={0}
              max={20}
              step={1}
              value={sliceOverrides.bottomLayers ?? ""}
              placeholder="4"
              onChange={(e) =>
                setSliceOverride("bottomLayers", parseInt(e.target.value, 10))
              }
              className={inputClass}
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Infill" defaultOpen>
        <div className="flex flex-col gap-3">
          {/* Infill Density */}
          <div>
            <label
              className={labelClass}
              title="Percentage of interior filled. Higher = stronger, uses more material"
            >
              Infill Density — {sliceOverrides.infillDensity ?? 20}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={sliceOverrides.infillDensity ?? 20}
              onChange={(e) =>
                setSliceOverride(
                  "infillDensity",
                  parseInt(e.target.value, 10)
                )
              }
              className="w-full accent-blue-500"
            />
          </div>

          {/* Infill Pattern */}
          <div>
            <label className={labelClass} title="Internal fill pattern. Gyroid is strong and flexible, Grid is fast, Honeycomb balances both">
              Infill Pattern
            </label>
            <select
              value={sliceOverrides.infillPattern ?? "gyroid"}
              onChange={(e) =>
                setSliceOverride("infillPattern", e.target.value)
              }
              className={selectClass}
            >
              <option value="rectilinear">Rectilinear</option>
              <option value="grid">Grid</option>
              <option value="triangles">Triangles</option>
              <option value="honeycomb">Honeycomb</option>
              <option value="gyroid">Gyroid</option>
              <option value="cubic">Cubic</option>
            </select>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

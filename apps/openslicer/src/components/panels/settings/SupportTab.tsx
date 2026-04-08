"use client";

import { useSlicerStore } from "../../../stores/slicer-store";
import { CollapsibleSection } from "../../ui/CollapsibleSection";

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";
const labelClass =
  "block text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1";
const selectClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";

export function SupportTab() {
  const { sliceOverrides, setSliceOverride } = useSlicerStore();

  const supportType = sliceOverrides.supportType ?? "none";

  return (
    <div className="flex flex-col">
      <CollapsibleSection title="Support" defaultOpen>
        <div className="flex flex-col gap-3">
          {/* Support Type */}
          <div>
            <label className={labelClass} title="Type of support structures. Tree and Organic use less material and are easier to remove">
              Support Type
            </label>
            <select
              value={supportType}
              onChange={(e) =>
                setSliceOverride("supportType", e.target.value)
              }
              className={selectClass}
            >
              <option value="none">None</option>
              <option value="normal">Normal</option>
              <option value="tree">Tree</option>
              <option value="organic">Organic</option>
            </select>
          </div>

          {/* Only show additional options when supports are enabled */}
          {supportType !== "none" && (
            <>
              {/* Support Threshold Angle */}
              <div>
                <label
                  className={labelClass}
                  title="Minimum overhang angle that triggers support generation. 45 is standard"
                >
                  Threshold Angle — {sliceOverrides.supportThreshold ?? 45}
                  &deg;
                </label>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={1}
                  value={sliceOverrides.supportThreshold ?? 45}
                  onChange={(e) =>
                    setSliceOverride(
                      "supportThreshold",
                      parseInt(e.target.value, 10)
                    )
                  }
                  className="w-full accent-blue-500"
                />
              </div>

              {/* Build Plate Only */}
              <div className="flex items-center justify-between">
                <span
                  className="text-xs text-zinc-300"
                  title="Only generate supports that touch the build plate, not mid-air supports"
                >
                  Build Plate Only
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={
                    sliceOverrides.supportOnBuildPlateOnly ?? false
                  }
                  onClick={() =>
                    setSliceOverride(
                      "supportOnBuildPlateOnly",
                      !(sliceOverrides.supportOnBuildPlateOnly ?? false)
                    )
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    sliceOverrides.supportOnBuildPlateOnly
                      ? "bg-blue-500"
                      : "bg-zinc-600"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      sliceOverrides.supportOnBuildPlateOnly
                        ? "translate-x-4.5"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}

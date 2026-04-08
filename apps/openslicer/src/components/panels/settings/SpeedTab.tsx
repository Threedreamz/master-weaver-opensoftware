"use client";

import { useSlicerStore } from "../../../stores/slicer-store";
import { CollapsibleSection } from "../../ui/CollapsibleSection";

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";
const labelClass =
  "block text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1";

function SpeedInput({
  label,
  value,
  onChange,
  placeholder,
  tooltip,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  placeholder?: string;
  tooltip?: string;
}) {
  return (
    <div>
      <label className={labelClass} title={tooltip}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={600}
          step={5}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={`flex-1 ${inputClass}`}
        />
        <span className="text-[10px] text-zinc-500">mm/s</span>
      </div>
    </div>
  );
}

export function SpeedTab() {
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
      <CollapsibleSection title="Print Speeds" defaultOpen>
        <div className="flex flex-col gap-3">
          <SpeedInput
            label="Perimeter Speed"
            value={sliceOverrides.printSpeedPerimeter}
            placeholder={
              activeProfile?.printSpeedPerimeter != null
                ? String(activeProfile.printSpeedPerimeter)
                : "45"
            }
            onChange={(v) => setSliceOverride("printSpeedPerimeter", v)}
            tooltip="Speed for outer and inner wall perimeters. Lower = better surface quality"
          />
          <SpeedInput
            label="Infill Speed"
            value={sliceOverrides.printSpeedInfill}
            placeholder={
              activeProfile?.printSpeedInfill != null
                ? String(activeProfile.printSpeedInfill)
                : "80"
            }
            onChange={(v) => setSliceOverride("printSpeedInfill", v)}
            tooltip="Speed for internal infill. Can be higher since surface quality doesn't matter"
          />
          <SpeedInput
            label="Travel Speed"
            value={sliceOverrides.travelSpeed}
            placeholder="150"
            onChange={(v) => setSliceOverride("travelSpeed", v)}
            tooltip="Speed when the nozzle moves without extruding. Higher = faster print, risk of ringing"
          />
          <SpeedInput
            label="Bridge Speed"
            value={sliceOverrides.bridgeSpeed}
            placeholder="25"
            onChange={(v) => setSliceOverride("bridgeSpeed", v)}
            tooltip="Speed for bridging unsupported spans. Slower helps filament cool before sagging"
          />
          <SpeedInput
            label="First Layer Speed"
            value={sliceOverrides.firstLayerSpeed}
            placeholder="20"
            onChange={(v) => setSliceOverride("firstLayerSpeed", v)}
            tooltip="Speed for the first layer. Slower improves bed adhesion"
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}

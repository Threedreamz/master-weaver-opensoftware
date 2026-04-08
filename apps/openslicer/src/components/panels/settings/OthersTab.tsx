"use client";

import { useSlicerStore } from "../../../stores/slicer-store";
import { CollapsibleSection } from "../../ui/CollapsibleSection";

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";
const labelClass =
  "block text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1";

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  placeholder,
  tooltip,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
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
          min={min}
          max={max}
          step={step}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={`flex-1 ${inputClass}`}
        />
        {unit && <span className="text-[10px] text-zinc-500">{unit}</span>}
      </div>
    </div>
  );
}

const toggleClass =
  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900";

export function OthersTab() {
  const { sliceOverrides, setSliceOverride } = useSlicerStore();

  return (
    <div className="flex flex-col">
      <CollapsibleSection title="Special Modes" defaultOpen>
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelClass}>Spiral Vase</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={!!sliceOverrides.spiralVaseMode}
                onClick={() =>
                  setSliceOverride("spiralVaseMode", !sliceOverrides.spiralVaseMode)
                }
                className={`${toggleClass} ${
                  sliceOverrides.spiralVaseMode ? "bg-blue-600" : "bg-zinc-600"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    sliceOverrides.spiralVaseMode ? "translate-x-4.5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-[10px] text-zinc-400">
                {sliceOverrides.spiralVaseMode ? "On" : "Off"}
              </span>
            </div>
            {sliceOverrides.spiralVaseMode && (
              <p className="mt-1.5 text-[10px] text-amber-400/80 leading-tight">
                Spiral vase mode: 1 wall, no infill, no top layers. Prints a single
                continuous spiral with smooth Z movement.
              </p>
            )}
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Adhesion" defaultOpen>
        <div className="flex flex-col gap-3">
          <NumberField
            label="Brim Width"
            value={sliceOverrides.brimWidth}
            onChange={(v) => setSliceOverride("brimWidth", v)}
            min={0}
            max={20}
            step={0.5}
            unit="mm"
            placeholder="0"
            tooltip="Extra loops around first layer for better adhesion. 0 = disabled"
          />
          <NumberField
            label="Skirt Distance"
            value={sliceOverrides.skirtDistance}
            onChange={(v) => setSliceOverride("skirtDistance", v)}
            min={0}
            max={20}
            step={1}
            unit="mm"
            placeholder="6"
            tooltip="Gap between the skirt outline and the model. Skirt primes the nozzle before printing"
          />
          <NumberField
            label="Skirt Loops"
            value={sliceOverrides.skirtLoops}
            onChange={(v) => setSliceOverride("skirtLoops", v)}
            min={1}
            max={5}
            step={1}
            placeholder="1"
            tooltip="Number of skirt outlines. More loops = more priming, better first-layer consistency"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Retraction">
        <div className="flex flex-col gap-3">
          <NumberField
            label="Retract Length"
            value={sliceOverrides.retractionLength}
            onChange={(v) => setSliceOverride("retractionLength", v)}
            min={0}
            max={10}
            step={0.1}
            unit="mm"
            placeholder="0.8"
            tooltip="Distance filament is pulled back before travel moves to reduce stringing"
          />
          <NumberField
            label="Retract Speed"
            value={sliceOverrides.retractionSpeed}
            onChange={(v) => setSliceOverride("retractionSpeed", v)}
            min={1}
            max={100}
            step={5}
            unit="mm/s"
            placeholder="30"
            tooltip="Speed of filament retraction. Too fast can grind filament, too slow causes oozing"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Cooling">
        <div className="flex flex-col gap-3">
          <NumberField
            label="Fan Speed Min"
            value={sliceOverrides.fanSpeedMin}
            onChange={(v) => setSliceOverride("fanSpeedMin", v)}
            min={0}
            max={100}
            step={5}
            unit="%"
            placeholder="0"
            tooltip="Minimum part cooling fan speed. 0% for first layers, ramps up for overhangs"
          />
          <NumberField
            label="Fan Speed Max"
            value={sliceOverrides.fanSpeedMax}
            onChange={(v) => setSliceOverride("fanSpeedMax", v)}
            min={0}
            max={100}
            step={5}
            unit="%"
            placeholder="100"
            tooltip="Maximum part cooling fan speed. PLA needs high cooling, ABS/ASA need low or none"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Flow">
        <div className="flex flex-col gap-3">
          <NumberField
            label="Flow Ratio"
            value={sliceOverrides.flowRatio}
            onChange={(v) => setSliceOverride("flowRatio", v)}
            min={0.5}
            max={1.5}
            step={0.01}
            placeholder="1.0"
            tooltip="Multiplier for extrusion amount. >1.0 over-extrudes, <1.0 under-extrudes. Tune per filament"
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}

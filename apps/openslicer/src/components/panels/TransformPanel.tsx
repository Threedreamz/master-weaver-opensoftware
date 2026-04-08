"use client";

import { useCallback } from "react";
import { useSlicerStore } from "../../stores/slicer-store";

function AxisInput({
  label,
  value,
  onChange,
  step = 1,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  color: string;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className={`w-3 text-[10px] font-bold ${color}`}>{label}</span>
      <input
        type="number"
        step={step}
        value={Number(value.toFixed(4))}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200 outline-none ring-1 ring-zinc-700 focus:ring-indigo-500"
      />
    </label>
  );
}

const AXIS_COLORS = ["text-red-400", "text-green-400", "text-blue-400"] as const;
const AXIS_LABELS = ["X", "Y", "Z"] as const;

export function TransformPanel() {
  const selectedModelId = useSlicerStore((s) => s.selectedModelId);
  const models = useSlicerStore((s) => s.models);
  const gcodeMode = useSlicerStore((s) => s.gcodeMode);
  const updateModelPosition = useSlicerStore((s) => s.updateModelPosition);
  const updateModelRotation = useSlicerStore((s) => s.updateModelRotation);
  const updateModelScale = useSlicerStore((s) => s.updateModelScale);

  const model = models.find((m) => m.id === selectedModelId);

  const handlePosition = useCallback(
    (axis: number, value: number) => {
      if (!model) return;
      const pos: [number, number, number] = [...(model.position ?? [0, 0, 0])];
      pos[axis] = value;
      updateModelPosition(model.id, pos);
    },
    [model, updateModelPosition]
  );

  const handleRotation = useCallback(
    (axis: number, valueDeg: number) => {
      if (!model) return;
      const rot: [number, number, number] = [...(model.rotation ?? [0, 0, 0])];
      // Store as degrees — convert to radians if the renderer expects it,
      // but the store stores raw values as set here
      rot[axis] = (valueDeg * Math.PI) / 180;
      updateModelRotation(model.id, rot);
    },
    [model, updateModelRotation]
  );

  const handleScale = useCallback(
    (axis: number, value: number) => {
      if (!model) return;
      const sc: [number, number, number] = [...(model.scale ?? [1, 1, 1])];
      sc[axis] = value;
      updateModelScale(model.id, sc);
    },
    [model, updateModelScale]
  );

  if (!model || gcodeMode) return null;

  const position = model.position ?? [0, 0, 0];
  const rotation = model.rotation ?? [0, 0, 0];
  const scale = model.scale ?? [1, 1, 1];

  return (
    <div className="space-y-3">
      <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Transform
      </h3>

      {/* Position */}
      <div className="space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Position (mm)
        </p>
        <div className="grid grid-cols-3 gap-1">
          {AXIS_LABELS.map((label, i) => (
            <AxisInput
              key={`pos-${label}`}
              label={label}
              value={position[i]}
              onChange={(v) => handlePosition(i, v)}
              step={1}
              color={AXIS_COLORS[i]}
            />
          ))}
        </div>
      </div>

      {/* Rotation */}
      <div className="space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Rotation (deg)
        </p>
        <div className="grid grid-cols-3 gap-1">
          {AXIS_LABELS.map((label, i) => (
            <AxisInput
              key={`rot-${label}`}
              label={label}
              value={(rotation[i] * 180) / Math.PI}
              onChange={(v) => handleRotation(i, v)}
              step={5}
              color={AXIS_COLORS[i]}
            />
          ))}
        </div>
      </div>

      {/* Scale */}
      <div className="space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Scale
        </p>
        <div className="grid grid-cols-3 gap-1">
          {AXIS_LABELS.map((label, i) => (
            <AxisInput
              key={`scl-${label}`}
              label={label}
              value={scale[i]}
              onChange={(v) => handleScale(i, v)}
              step={0.1}
              color={AXIS_COLORS[i]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

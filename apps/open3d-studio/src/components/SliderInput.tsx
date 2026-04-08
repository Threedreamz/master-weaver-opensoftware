'use client';

interface SliderInputProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
}

export function SliderInput({ label, min, max, step = 0.01, value, onChange, unit = '' }: SliderInputProps) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="slider-row">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))} />
        <span className="value">{value.toFixed(step < 1 ? 2 : 0)}{unit}</span>
      </div>
    </div>
  );
}

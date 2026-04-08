"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { FlowTheme } from "@opensoftware/openflow-core";

const FONT_OPTIONS = [
  "system-ui",
  "Inter",
  "Roboto",
  "Open Sans",
  "Poppins",
  "Montserrat",
  "Lato",
];

const BORDER_RADIUS_OPTIONS = [
  { value: "0", label: "None (0)" },
  { value: "0.25rem", label: "Small (0.25rem)" },
  { value: "0.5rem", label: "Medium (0.5rem)" },
  { value: "0.75rem", label: "Large (0.75rem)" },
  { value: "1rem", label: "XL (1rem)" },
];

const TRANSITION_OPTIONS: { value: FlowTheme["transitionStyle"]; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
];

interface DesignPanelProps {
  theme: FlowTheme;
  onChange: (theme: FlowTheme) => void;
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <span>{title}</span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        )}
      </button>
      {open && <div className="px-4 pb-3 space-y-3">{children}</div>}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-gray-500">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded border border-gray-200 cursor-pointer p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 text-xs border border-gray-200 rounded px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white max-w-[140px]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function DesignPanel({ theme, onChange }: DesignPanelProps) {
  function update(key: keyof FlowTheme, value: string) {
    onChange({ ...theme, [key]: value });
  }

  const fontOptions = FONT_OPTIONS.map((f) => ({ value: f, label: f }));

  return (
    <div className="flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Design
        </p>
      </div>

      <CollapsibleSection title="Basics" defaultOpen>
        <ColorField
          label="Primary Color"
          value={theme.primaryColor}
          onChange={(v) => update("primaryColor", v)}
        />
        <ColorField
          label="Background"
          value={theme.backgroundColor}
          onChange={(v) => update("backgroundColor", v)}
        />
        <ColorField
          label="Text Color"
          value={theme.textColor}
          onChange={(v) => update("textColor", v)}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Überschriften">
        <SelectField
          label="Font"
          value={theme.headingFont}
          options={fontOptions}
          onChange={(v) => update("headingFont", v)}
        />
        <ColorField
          label="Color"
          value={theme.headingColor}
          onChange={(v) => update("headingColor", v)}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Text">
        <SelectField
          label="Body Font"
          value={theme.bodyFont}
          options={fontOptions}
          onChange={(v) => update("bodyFont", v)}
        />
        <SelectField
          label="Font Family"
          value={theme.fontFamily}
          options={fontOptions}
          onChange={(v) => update("fontFamily", v)}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Rahmen">
        <SelectField
          label="Border Radius"
          value={theme.borderRadius}
          options={BORDER_RADIUS_OPTIONS}
          onChange={(v) => update("borderRadius", v)}
        />
        <ColorField
          label="Border Color"
          value={theme.borderColor}
          onChange={(v) => update("borderColor", v)}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Seitenübergang">
        <SelectField
          label="Transition"
          value={theme.transitionStyle}
          options={TRANSITION_OPTIONS}
          onChange={(v) => update("transitionStyle", v as FlowTheme["transitionStyle"])}
        />
      </CollapsibleSection>
    </div>
  );
}

"use client";

import type { FlowStep } from "@opensoftware/openflow-core";

// ─── Shared mini-component ────────────────────────────────────────────────────
function ColorField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-[11px] text-gray-500 shrink-0">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer border border-gray-200"
        />
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 text-[11px] border border-gray-200 rounded px-1.5 py-1 font-mono"
        />
      </div>
    </div>
  );
}

// ─── Inspector Design Tab ("Design") ─────────────────────────────────────────

const FONT_FAMILY_OPTIONS = [
  { value: "", label: "Standard (Theme)" },
  { value: "Inter", label: "Inter" },
  { value: "Arial", label: "Arial" },
  { value: "Georgia", label: "Georgia" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Courier New", label: "Courier New" },
  { value: "Verdana", label: "Verdana" },
];

const FONT_SIZE_OPTIONS = [
  { value: "", label: "Standard" },
  { value: "sm", label: "Klein (sm)" },
  { value: "base", label: "Normal (base)" },
  { value: "lg", label: "Groß (lg)" },
  { value: "xl", label: "Sehr groß (xl)" },
  { value: "2xl", label: "Extragroß (2xl)" },
];

const LETTER_SPACING_OPTIONS = [
  { value: "", label: "Standard" },
  { value: "tighter", label: "Enger" },
  { value: "tight", label: "Eng" },
  { value: "normal", label: "Normal" },
  { value: "wide", label: "Weit" },
  { value: "wider", label: "Weiter" },
  { value: "widest", label: "Am weitesten" },
];

const ICON_SIZE_OPTIONS = [
  { value: "", label: "Standard (1.75rem)" },
  { value: "1rem", label: "Klein (1rem)" },
  { value: "1.25rem", label: "Mittel-klein (1.25rem)" },
  { value: "1.75rem", label: "Normal (1.75rem)" },
  { value: "2.5rem", label: "Groß (2.5rem)" },
  { value: "3rem", label: "Sehr groß (3rem)" },
  { value: "4rem", label: "Extra groß (4rem)" },
];

interface StyleOverrides {
  fontFamily?: string;
  fontSize?: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  letterSpacing?: string;
  iconSize?: string;
  iconColor?: string;
  dividerColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  labelColor?: string;
}

// Component types that have icons
const ICON_COMPONENT_TYPES = new Set(["card-selector", "rating", "image-choice"]);
// Component types that benefit from divider color
const DIVIDER_TYPES = new Set(["divider"]);
// Component types with label color
const LABELED_TYPES = new Set([
  "text-input", "text-area", "email-input", "phone-input", "number-input",
  "date-picker", "dropdown", "radio-group", "checkbox-group", "card-selector",
  "image-choice", "rating", "slider", "file-upload", "signature-pad",
  "location-picker", "payment-field",
]);

interface InspectorDesignProps {
  step: FlowStep;
  onStepChange: (step: FlowStep) => void;
  selectedComponentId: string | null;
  onComponentSelect: (id: string | null) => void;
}

export default function InspectorDesign({ step, onStepChange, selectedComponentId, onComponentSelect }: InspectorDesignProps) {
  const selectedComponent = step.components.find((c) => c.id === selectedComponentId);
  const styleOverrides: StyleOverrides = (selectedComponent?.config?.styleOverrides as StyleOverrides) ?? {};

  const inputClass = "w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  function updateStyleOverride(key: keyof StyleOverrides, value: string) {
    if (!selectedComponent) return;

    const newOverrides: StyleOverrides = { ...styleOverrides };
    if (value === "") {
      delete newOverrides[key];
    } else {
      newOverrides[key] = value;
    }

    onStepChange({
      ...step,
      components: step.components.map((c) =>
        c.id === selectedComponent.id
          ? {
              ...c,
              config: {
                ...c.config,
                styleOverrides: Object.keys(newOverrides).length > 0 ? newOverrides : undefined,
              },
            }
          : c
      ),
    });
  }

  const showIconControls = selectedComponent && ICON_COMPONENT_TYPES.has(selectedComponent.componentType);
  const showDividerColor = selectedComponent && DIVIDER_TYPES.has(selectedComponent.componentType);
  const showLabelColor = selectedComponent && LABELED_TYPES.has(selectedComponent.componentType);

  return (
    <div className="flex flex-col gap-0 divide-y divide-gray-100">
      <div className="px-4 py-4 space-y-3">
        <p className="text-xs font-semibold text-gray-700">Block-Design</p>

        {step.components.length === 0 ? (
          <p className="text-xs text-gray-400 italic">
            Keine Komponenten vorhanden. Fügen Sie zuerst Komponenten hinzu.
          </p>
        ) : !selectedComponent ? (
          <div className="space-y-1">
            <p className="text-xs text-gray-400 italic mb-2">
              Klicke im Canvas auf ein Element, um es zu gestalten.
            </p>
            {step.components.map((comp) => (
              <button
                key={comp.id}
                onClick={() => onComponentSelect(comp.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-colors"
              >
                <span className="text-sm text-gray-700 flex-1 truncate">
                  {comp.label || comp.componentType}
                </span>
                <span className="text-gray-400 text-xs">›</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            {/* Breadcrumb */}
            <button
              onClick={() => onComponentSelect(null)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors mb-1"
            >
              <span>←</span>
              <span>Alle Elemente</span>
            </button>

            <div className="space-y-3 pt-2">
              {/* ── Typography ── */}
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Typografie</p>

              {/* Font Family */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Schriftart</label>
                <select
                  value={styleOverrides.fontFamily ?? ""}
                  onChange={(e) => updateStyleOverride("fontFamily", e.target.value)}
                  className={inputClass}
                >
                  {FONT_FAMILY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Schriftgröße</label>
                <select
                  value={styleOverrides.fontSize ?? ""}
                  onChange={(e) => updateStyleOverride("fontSize", e.target.value)}
                  className={inputClass}
                >
                  {FONT_SIZE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Letter Spacing */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Zeichenabstand</label>
                <select
                  value={styleOverrides.letterSpacing ?? ""}
                  onChange={(e) => updateStyleOverride("letterSpacing", e.target.value)}
                  className={inputClass}
                >
                  {LETTER_SPACING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* ── Colors ── */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Farben</p>

                <div className="space-y-3">
                  <ColorField
                    label="Schriftfarbe"
                    value={styleOverrides.textColor ?? ""}
                    placeholder="#111827"
                    onChange={(v) => updateStyleOverride("textColor", v)}
                  />

                  <ColorField
                    label="Hintergrundfarbe"
                    value={styleOverrides.backgroundColor ?? ""}
                    placeholder="#ffffff"
                    onChange={(v) => updateStyleOverride("backgroundColor", v)}
                  />

                  <ColorField
                    label="Rahmenfarbe"
                    value={styleOverrides.borderColor ?? ""}
                    placeholder="#e5e7eb"
                    onChange={(v) => updateStyleOverride("borderColor", v)}
                  />

                  {showLabelColor && (
                    <ColorField
                      label="Label-Farbe"
                      value={styleOverrides.labelColor ?? ""}
                      placeholder="#374151"
                      onChange={(v) => updateStyleOverride("labelColor", v)}
                    />
                  )}

                  {showDividerColor && (
                    <ColorField
                      label="Trennlinien-Farbe"
                      value={styleOverrides.dividerColor ?? ""}
                      placeholder="#d1d5db"
                      onChange={(v) => updateStyleOverride("dividerColor", v)}
                    />
                  )}
                </div>
              </div>

              {/* ── Icon Settings ── */}
              {showIconControls && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Icon</p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Icon-Größe</label>
                      <select
                        value={styleOverrides.iconSize ?? ""}
                        onChange={(e) => updateStyleOverride("iconSize", e.target.value)}
                        className={inputClass}
                      >
                        {ICON_SIZE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <div className="mt-1.5">
                        <label className="block text-[10px] text-gray-400 mb-0.5">oder eigene Größe</label>
                        <input
                          type="text"
                          value={!ICON_SIZE_OPTIONS.some(o => o.value === (styleOverrides.iconSize ?? "")) ? (styleOverrides.iconSize ?? "") : ""}
                          onChange={(e) => updateStyleOverride("iconSize", e.target.value)}
                          placeholder="z.B. 2rem, 48px"
                          className={`${inputClass} font-mono`}
                        />
                      </div>
                    </div>

                    <ColorField
                      label="Icon-Farbe"
                      value={styleOverrides.iconColor ?? ""}
                      placeholder="#6366f1"
                      onChange={(v) => updateStyleOverride("iconColor", v)}
                    />
                  </div>
                </div>
              )}

              {/* Reset button */}
              {Object.keys(styleOverrides).length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <button
                    onClick={() => {
                      onStepChange({
                        ...step,
                        components: step.components.map((c) =>
                          c.id === selectedComponent.id
                            ? { ...c, config: { ...c.config, styleOverrides: undefined } }
                            : c
                        ),
                      });
                    }}
                    className="w-full text-xs text-red-600 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
                  >
                    Design zurücksetzen
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

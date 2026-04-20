"use client";

import type { FlowStep, StepComponent } from "@opensoftware/openflow-core";

// ─── Text-formatting component types ─────────────────────────────────────────

const TEXT_COMPONENT_TYPES = new Set([
  "heading", "paragraph", "text-input", "text-area", "email-input",
  "phone-input", "number-input", "date-picker", "dropdown",
  "radio-group", "checkbox-group", "card-selector",
]);

const SPACING_OPTIONS = [
  { value: "0", label: "0" },
  { value: "1", label: "1 (0.25rem)" },
  { value: "2", label: "2 (0.5rem)" },
  { value: "4", label: "4 (1rem)" },
  { value: "8", label: "8 (2rem)" },
];

const WIDTH_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "full", label: "Volle Breite" },
  { value: "1/2", label: "1/2" },
  { value: "1/3", label: "1/3" },
  { value: "2/3", label: "2/3" },
];

const FONT_SIZE_OPTIONS = [
  { value: "", label: "Standard" },
  { value: "xs", label: "Extra Klein" },
  { value: "sm", label: "Klein" },
  { value: "base", label: "Normal" },
  { value: "lg", label: "Groß" },
  { value: "xl", label: "Sehr groß" },
  { value: "2xl", label: "Extragroß" },
  { value: "3xl", label: "XXL" },
  { value: "4xl", label: "XXXL" },
];

const LINE_HEIGHT_OPTIONS = [
  { value: "", label: "Standard" },
  { value: "none", label: "Keine (1)" },
  { value: "tight", label: "Eng (1.25)" },
  { value: "snug", label: "Knapp (1.375)" },
  { value: "normal", label: "Normal (1.5)" },
  { value: "relaxed", label: "Entspannt (1.625)" },
  { value: "loose", label: "Weit (2)" },
];

const TEXT_TRANSFORM_OPTIONS = [
  { value: "", label: "Standard" },
  { value: "none", label: "Normal" },
  { value: "uppercase", label: "GROSSBUCHSTABEN" },
  { value: "lowercase", label: "kleinbuchstaben" },
  { value: "capitalize", label: "Erster Groß" },
];

interface StyleOverrides {
  fontFamily?: string;
  fontSize?: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  letterSpacing?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: string;
  lineHeight?: string;
  textTransform?: string;
}

interface InspectorSettingsProps {
  step: FlowStep;
  onStepChange: (step: FlowStep) => void;
  selectedComponentId: string | null;
  onComponentSelect: (id: string | null) => void;
  pricingEnabled?: boolean;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors ${checked ? "bg-indigo-600" : "bg-gray-300"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function AlignmentButtons({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const options = [
    { value: "left", label: "≡", title: "Linksbündig" },
    { value: "center", label: "≡", title: "Zentriert" },
    { value: "right", label: "≡", title: "Rechtsbündig" },
    { value: "justify", label: "≡", title: "Blocksatz" },
  ];
  const labels: Record<string, string> = {
    left: "Links",
    center: "Mitte",
    right: "Rechts",
    justify: "Block",
  };
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(value === opt.value ? "" : opt.value)}
          title={opt.title}
          className={`flex-1 py-1.5 text-xs rounded border transition-colors font-medium ${
            value === opt.value
              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
              : "border-gray-200 text-gray-600 hover:border-gray-400"
          }`}
        >
          {labels[opt.value]}
        </button>
      ))}
    </div>
  );
}

export default function InspectorSettings({
  step,
  onStepChange,
  selectedComponentId,
  onComponentSelect,
  pricingEnabled = false,
}: InspectorSettingsProps) {
  const inputClass =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  function updateStepConfig(key: string, value: unknown) {
    onStepChange({ ...step, config: { ...step.config, [key]: value } });
  }

  function updateComponentConfig(componentId: string, key: string, value: unknown) {
    onStepChange({
      ...step,
      components: step.components.map((c) =>
        c.id === componentId ? { ...c, config: { ...c.config, [key]: value } } : c
      ),
    });
  }

  function updateStyleOverride(comp: StepComponent, key: keyof StyleOverrides, value: string) {
    const existing = (comp.config?.styleOverrides as StyleOverrides) ?? {};
    const updated: StyleOverrides = { ...existing };
    if (value === "") {
      delete updated[key];
    } else {
      updated[key] = value;
    }
    updateComponentConfig(comp.id, "styleOverrides", Object.keys(updated).length > 0 ? updated : undefined);
  }

  function updateComponentRequired(componentId: string, required: boolean) {
    onStepChange({
      ...step,
      components: step.components.map((c) =>
        c.id === componentId ? { ...c, required } : c
      ),
    });
  }

  const selectedComponent = step.components.find((c) => c.id === selectedComponentId);
  const styleOverrides: StyleOverrides = (selectedComponent?.config?.styleOverrides as StyleOverrides) ?? {};
  const isTextComponent = selectedComponent && TEXT_COMPONENT_TYPES.has(selectedComponent.componentType);

  return (
    <div className="flex flex-col gap-0 divide-y divide-gray-100">
      {/* ── Step Settings ── */}
      <div className="px-4 py-4 space-y-3">
        <p className="text-xs font-semibold text-gray-700">Seite</p>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Seitenname</label>
          <input
            value={step.label ?? ""}
            onChange={(e) => onStepChange({ ...step, label: e.target.value })}
            placeholder={(step.config as { title?: string }).title || "z.B. Kontaktdaten"}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Slug</label>
          <input
            value={(step.config as Record<string, unknown>)?.slug as string ?? ""}
            onChange={(e) => updateStepConfig("slug", e.target.value)}
            placeholder="z.B. persoenliche-daten"
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Layout</label>
          <select
            value={step.config?.layout ?? "single-column"}
            onChange={(e) => updateStepConfig("layout", e.target.value)}
            className={inputClass}
          >
            <option value="single-column">Einzelspalte</option>
            <option value="two-column">Zweispaltig</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-500">Fortschritt anzeigen</label>
          <Toggle
            checked={!!step.config?.showProgress}
            onChange={(v) => updateStepConfig("showProgress", v)}
          />
        </div>

        {/* Per-step price visibility — only when pricing is enabled globally */}
        {pricingEnabled && (
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs text-gray-500">Preis anzeigen</label>
              <p className="text-[11px] text-gray-400 mt-0.5">Preisanzeige auf dieser Seite</p>
            </div>
            <Toggle
              checked={!(step.config as Record<string, unknown>)?.hidePriceDisplay}
              onChange={(v) => updateStepConfig("hidePriceDisplay", !v)}
            />
          </div>
        )}
      </div>

      {/* ── Component Settings ── */}
      {selectedComponent ? (
        <div className="px-4 py-4 space-y-4">
          {/* breadcrumb */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Element:</span>
            <span className="text-xs font-semibold text-indigo-600">
              {selectedComponent.label || selectedComponent.componentType}
            </span>
          </div>

          {/* Required toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600 font-medium">Pflichtfeld</label>
            <Toggle
              checked={!!selectedComponent.required}
              onChange={(v) => updateComponentRequired(selectedComponent.id, v)}
            />
          </div>

          {/* Skip validation toggle — buttons only */}
          {selectedComponent.componentType === "button" && (
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs text-gray-600 font-medium">Validierung überspringen</label>
                <p className="text-[11px] text-gray-400 mt-0.5">Button navigiert ohne Pflichtfeld-Prüfung</p>
              </div>
              <Toggle
                checked={!!((selectedComponent.config as Record<string, unknown>)?.skipValidation)}
                onChange={(v) => updateComponentConfig(selectedComponent.id, "skipValidation", v)}
              />
            </div>
          )}

          {/* ── Text Formatting ── */}
          {isTextComponent && (
            <div className="space-y-3 pt-1">
              <p className="text-xs font-semibold text-gray-700">Textformatierung</p>

              {/* Bold / Italic / Underline */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Stil</label>
                <div className="flex gap-1.5">
                  <button
                    onClick={() =>
                      updateStyleOverride(
                        selectedComponent,
                        "fontWeight",
                        styleOverrides.fontWeight === "bold" ? "" : "bold"
                      )
                    }
                    className={`flex-1 py-1.5 text-sm font-bold rounded border transition-colors ${
                      styleOverrides.fontWeight === "bold"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    F
                  </button>
                  <button
                    onClick={() =>
                      updateStyleOverride(
                        selectedComponent,
                        "fontStyle",
                        styleOverrides.fontStyle === "italic" ? "" : "italic"
                      )
                    }
                    className={`flex-1 py-1.5 text-sm italic rounded border transition-colors ${
                      styleOverrides.fontStyle === "italic"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    K
                  </button>
                  <button
                    onClick={() =>
                      updateStyleOverride(
                        selectedComponent,
                        "textDecoration",
                        styleOverrides.textDecoration === "underline" ? "" : "underline"
                      )
                    }
                    className={`flex-1 py-1.5 text-sm underline rounded border transition-colors ${
                      styleOverrides.textDecoration === "underline"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    U
                  </button>
                  <button
                    onClick={() =>
                      updateStyleOverride(
                        selectedComponent,
                        "textDecoration",
                        styleOverrides.textDecoration === "line-through" ? "" : "line-through"
                      )
                    }
                    className={`flex-1 py-1.5 text-sm line-through rounded border transition-colors ${
                      styleOverrides.textDecoration === "line-through"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    D
                  </button>
                </div>
              </div>

              {/* Alignment */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Ausrichtung</label>
                <AlignmentButtons
                  value={styleOverrides.textAlign ?? ""}
                  onChange={(v) => updateStyleOverride(selectedComponent, "textAlign", v)}
                />
              </div>

              {/* Font size */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Schriftgröße</label>
                <select
                  value={styleOverrides.fontSize ?? ""}
                  onChange={(e) => updateStyleOverride(selectedComponent, "fontSize", e.target.value)}
                  className={inputClass}
                >
                  {FONT_SIZE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Line height */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Zeilenhöhe</label>
                <select
                  value={styleOverrides.lineHeight ?? ""}
                  onChange={(e) => updateStyleOverride(selectedComponent, "lineHeight", e.target.value)}
                  className={inputClass}
                >
                  {LINE_HEIGHT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Text transform */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Schreibweise</label>
                <select
                  value={styleOverrides.textTransform ?? ""}
                  onChange={(e) => updateStyleOverride(selectedComponent, "textTransform", e.target.value)}
                  className={inputClass}
                >
                  {TEXT_TRANSFORM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ── Spacing ── */}
          <div className="space-y-3 pt-1 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-700">Abstände</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Abstand oben</label>
              <select
                value={(selectedComponent.config?.marginTop as string) ?? "0"}
                onChange={(e) => updateComponentConfig(selectedComponent.id, "marginTop", e.target.value)}
                className={inputClass}
              >
                {SPACING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Abstand unten</label>
              <select
                value={(selectedComponent.config?.marginBottom as string) ?? "0"}
                onChange={(e) => updateComponentConfig(selectedComponent.id, "marginBottom", e.target.value)}
                className={inputClass}
              >
                {SPACING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Breite</label>
              <select
                value={(selectedComponent.config?.width as string) ?? "auto"}
                onChange={(e) => updateComponentConfig(selectedComponent.id, "width", e.target.value)}
                className={inputClass}
              >
                {WIDTH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4">
          <p className="text-xs text-gray-400 italic">
            Klicke im Canvas auf ein Element, um seine Einstellungen zu bearbeiten.
          </p>
          {step.components.length > 0 && (
            <div className="mt-3 space-y-1">
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
          )}
        </div>
      )}
    </div>
  );
}

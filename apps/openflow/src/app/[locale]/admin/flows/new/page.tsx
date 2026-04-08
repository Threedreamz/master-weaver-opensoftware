"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { num: 1, label: "Titel" },
  { num: 2, label: "Vorlage" },
  { num: 3, label: "Schriften" },
  { num: 4, label: "Farben" },
] as const;

const FONT_OPTIONS = [
  { value: "system-ui", label: "System UI" },
  { value: "'Inter', sans-serif", label: "Inter" },
  { value: "'Roboto', sans-serif", label: "Roboto" },
  { value: "'Open Sans', sans-serif", label: "Open Sans" },
  { value: "'Poppins', sans-serif", label: "Poppins" },
  { value: "'Montserrat', sans-serif", label: "Montserrat" },
  { value: "'Lato', sans-serif", label: "Lato" },
];

const TEMPLATES = [
  {
    id: "blank",
    title: "Leerer Flow",
    description: "Starte mit einem leeren Flow und baue alles selbst.",
    icon: (
      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
    available: true,
  },
  {
    id: "contact",
    title: "Kontaktformular",
    description: "Einfaches Kontaktformular mit Name, E-Mail und Nachricht.",
    icon: (
      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    available: false,
  },
  {
    id: "survey",
    title: "Umfrage",
    description: "Mehrstufige Umfrage mit verschiedenen Fragetypen.",
    icon: (
      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
    available: false,
  },
  {
    id: "request",
    title: "Anfrage",
    description: "Detailliertes Anfrageformular mit mehreren Schritten.",
    icon: (
      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    available: false,
  },
];

const COLOR_PRESETS = [
  {
    name: "Modern Blue",
    primary: "#4f46e5",
    background: "#ffffff",
    text: "#111827",
  },
  {
    name: "Warm Orange",
    primary: "#ea580c",
    background: "#fffbeb",
    text: "#1c1917",
  },
  {
    name: "Dark Elegant",
    primary: "#a78bfa",
    background: "#1e1b4b",
    text: "#e0e7ff",
  },
  {
    name: "Nature Green",
    primary: "#16a34a",
    background: "#f0fdf4",
    text: "#14532d",
  },
];

// ---------------------------------------------------------------------------
// Wizard state type
// ---------------------------------------------------------------------------

interface WizardState {
  name: string;
  slug: string;
  description: string;
  slugManuallyEdited: boolean;
  template: string;
  headingFont: string;
  bodyFont: string;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
}

// ---------------------------------------------------------------------------
// Phone preview component
// ---------------------------------------------------------------------------

function PhonePreview({ state, step }: { state: WizardState; step: number }) {
  const displayName = state.name || "Mein Flow";
  return (
    <div className="flex flex-col items-center">
      {/* Phone frame */}
      <div className="w-[260px] rounded-[2rem] border-[6px] border-gray-800 bg-gray-800 shadow-xl overflow-hidden">
        {/* Notch */}
        <div className="flex justify-center py-1.5 bg-gray-800">
          <div className="w-16 h-3 bg-gray-900 rounded-full" />
        </div>
        {/* Screen */}
        <div
          className="h-[420px] flex flex-col overflow-hidden transition-colors duration-300"
          style={{ backgroundColor: state.backgroundColor }}
        >
          {/* Header bar */}
          <div
            className="px-4 py-3 flex items-center gap-2 border-b transition-colors duration-300"
            style={{
              backgroundColor: state.primaryColor,
              borderColor: "rgba(0,0,0,0.1)",
            }}
          >
            <div className="w-2 h-2 rounded-full bg-white/60" />
            <span
              className="text-xs font-medium text-white truncate"
              style={{ fontFamily: state.headingFont }}
            >
              {displayName}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 px-5 py-6 flex flex-col gap-4">
            <h3
              className="text-base font-bold leading-tight transition-colors duration-300"
              style={{
                fontFamily: state.headingFont,
                color: state.textColor,
              }}
            >
              {step >= 1 ? displayName : "Willkommen"}
            </h3>
            <p
              className="text-xs leading-relaxed transition-colors duration-300"
              style={{
                fontFamily: state.bodyFont,
                color: state.textColor,
                opacity: 0.7,
              }}
            >
              {state.description || "Dies ist eine Vorschau deines Flows. Passe Schriften und Farben an, um das Ergebnis hier live zu sehen."}
            </p>

            {/* Mock form fields */}
            <div className="mt-2 space-y-3">
              <div>
                <label
                  className="block text-[10px] mb-1 font-medium transition-colors duration-300"
                  style={{ fontFamily: state.bodyFont, color: state.textColor, opacity: 0.6 }}
                >
                  Ihr Name
                </label>
                <div
                  className="h-7 rounded border px-2 flex items-center text-[10px] transition-colors duration-300"
                  style={{
                    borderColor: state.textColor + "33",
                    color: state.textColor,
                    opacity: 0.4,
                    fontFamily: state.bodyFont,
                  }}
                >
                  Max Mustermann
                </div>
              </div>
              <div>
                <label
                  className="block text-[10px] mb-1 font-medium transition-colors duration-300"
                  style={{ fontFamily: state.bodyFont, color: state.textColor, opacity: 0.6 }}
                >
                  E-Mail
                </label>
                <div
                  className="h-7 rounded border px-2 flex items-center text-[10px] transition-colors duration-300"
                  style={{
                    borderColor: state.textColor + "33",
                    color: state.textColor,
                    opacity: 0.4,
                    fontFamily: state.bodyFont,
                  }}
                >
                  max@beispiel.de
                </div>
              </div>
            </div>

            {/* Mock button */}
            <button
              className="mt-auto w-full py-2 rounded-lg text-xs font-semibold text-white transition-colors duration-300"
              style={{
                backgroundColor: state.primaryColor,
                fontFamily: state.bodyFont,
              }}
            >
              Weiter
            </button>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-gray-400">Live-Vorschau</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

function StepTitel({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
}) {
  function handleNameChange(value: string) {
    const updates: Partial<WizardState> = { name: value };
    if (!state.slugManuallyEdited) {
      updates.slug = generateSlug(value);
    }
    onChange(updates);
  }

  function handleSlugChange(value: string) {
    onChange({
      slugManuallyEdited: true,
      slug: value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-"),
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Wie soll dein Flow heissen?
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Gib deinem Flow einen Namen. Du kannst ihn jederzeit andern.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Flow-Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={state.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="z.B. Kontaktanfrage-Formular"
          autoFocus
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Slug
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">/embed/</span>
          <input
            type="text"
            value={state.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="kontaktanfrage-formular"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Automatisch generiert. Wird in der Embed-URL verwendet.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Beschreibung
        </label>
        <textarea
          value={state.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Kurze Beschreibung des Flows..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>
    </div>
  );
}

function StepVorlage({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Wahle eine Vorlage
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Starte mit einer Vorlage oder baue deinen Flow von Grund auf.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TEMPLATES.map((tpl) => {
          const selected = state.template === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              disabled={!tpl.available}
              onClick={() => tpl.available && onChange({ template: tpl.id })}
              className={`relative flex flex-col items-center text-center p-5 rounded-xl border-2 transition-all ${
                selected
                  ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                  : tpl.available
                    ? "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                    : "border-gray-100 bg-gray-50 cursor-not-allowed opacity-60"
              }`}
            >
              {!tpl.available && (
                <span className="absolute top-2 right-2 text-[10px] font-medium bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                  Bald verfugbar
                </span>
              )}
              <div className="mb-3">{tpl.icon}</div>
              <span className="text-sm font-semibold text-gray-900">
                {tpl.title}
              </span>
              <span className="text-xs text-gray-500 mt-1 leading-snug">
                {tpl.description}
              </span>
              {selected && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepSchriften({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Wahle deine Schriften
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Bestimme die Schriftarten fur Uberschriften und Fliesstext.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Uberschrift-Schrift
        </label>
        <select
          value={state.headingFont}
          onChange={(e) => onChange({ headingFont: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
              {f.label}
            </option>
          ))}
        </select>
        <div
          className="mt-2 p-3 rounded-lg border border-gray-200 bg-gray-50 text-lg font-bold"
          style={{ fontFamily: state.headingFont }}
        >
          Die schnelle braune Fuchs springt
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Text-Schrift
        </label>
        <select
          value={state.bodyFont}
          onChange={(e) => onChange({ bodyFont: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
              {f.label}
            </option>
          ))}
        </select>
        <div
          className="mt-2 p-3 rounded-lg border border-gray-200 bg-gray-50 text-sm"
          style={{ fontFamily: state.bodyFont }}
        >
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </div>
      </div>
    </div>
  );
}

function StepFarben({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Wahle deine Farben
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Definiere das Farbschema deines Flows oder wahle ein Preset.
        </p>
      </div>

      {/* Presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Schnellauswahl
        </label>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_PRESETS.map((preset) => {
            const active =
              state.primaryColor === preset.primary &&
              state.backgroundColor === preset.background &&
              state.textColor === preset.text;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() =>
                  onChange({
                    primaryColor: preset.primary,
                    backgroundColor: preset.background,
                    textColor: preset.text,
                  })
                }
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                  active
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex gap-1 shrink-0">
                  <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: preset.primary }} />
                  <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: preset.background }} />
                  <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: preset.text }} />
                </div>
                <span className="text-xs font-medium text-gray-700">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Individual pickers */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Primarfarbe
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={state.primaryColor}
              onChange={(e) => onChange({ primaryColor: e.target.value })}
              className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={state.primaryColor}
              onChange={(e) => onChange({ primaryColor: e.target.value })}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hintergrund
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={state.backgroundColor}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
              className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={state.backgroundColor}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Textfarbe
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={state.textColor}
              onChange={(e) => onChange({ textColor: e.target.value })}
              className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={state.textColor}
              onChange={(e) => onChange({ textColor: e.target.value })}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main wizard page
// ---------------------------------------------------------------------------

export default function NewFlowPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState<WizardState>({
    name: "",
    slug: "",
    description: "",
    slugManuallyEdited: false,
    template: "blank",
    headingFont: "system-ui",
    bodyFont: "system-ui",
    primaryColor: "#4f46e5",
    backgroundColor: "#ffffff",
    textColor: "#111827",
  });

  function updateState(partial: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  // Validation per step
  function canProceed(): boolean {
    switch (currentStep) {
      case 1:
        return state.name.trim().length > 0;
      case 2:
        return state.template.length > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  }

  function handleNext() {
    if (!canProceed()) return;
    if (currentStep < 4) {
      setCurrentStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  }

  async function handleCreate() {
    if (!state.name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Step 1: Create the flow
      const createRes = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name.trim(),
          slug: state.slug || generateSlug(state.name),
          description: state.description.trim() || undefined,
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error || "Flow konnte nicht erstellt werden");
      }

      const flow = await createRes.json();

      // Step 2: Save theme settings via PATCH
      const themeSettings = {
        theme: {
          headingFont: state.headingFont,
          bodyFont: state.bodyFont,
          primaryColor: state.primaryColor,
          backgroundColor: state.backgroundColor,
          textColor: state.textColor,
        },
      };

      const patchRes = await fetch(`/api/flows/${flow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: themeSettings }),
      });

      if (!patchRes.ok) {
        // Flow was created but theme failed -- still redirect
        console.error("Failed to save theme settings");
      }

      router.push(`/${locale}/flow/${flow.id}/build`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Etwas ist schiefgelaufen");
      setIsSubmitting(false);
    }
  }

  const isLastStep = currentStep === 4;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${locale}/admin/flows`}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          &larr; Flows
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-medium">Neuer Flow</span>
      </div>

      {/* Step indicator */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 mb-6">
        <div className="flex items-center gap-1">
          {STEPS.map((step, idx) => (
            <div key={step.num} className="flex items-center">
              {idx > 0 && (
                <div
                  className={`w-8 h-px mx-2 ${
                    currentStep > idx ? "bg-indigo-400" : "bg-gray-200"
                  }`}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  // Allow going back to completed steps
                  if (step.num < currentStep) setCurrentStep(step.num);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  step.num === currentStep
                    ? "bg-indigo-50 text-indigo-700 font-bold"
                    : step.num < currentStep
                      ? "text-indigo-600 font-medium cursor-pointer hover:bg-indigo-50"
                      : "text-gray-400 cursor-default"
                }`}
              >
                {step.num < currentStep ? (
                  <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                ) : (
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.num === currentStep
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {step.num}
                  </span>
                )}
                {step.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* Main content: form + preview */}
      <div className="flex gap-6">
        {/* Left: step content */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6">
          {currentStep === 1 && <StepTitel state={state} onChange={updateState} />}
          {currentStep === 2 && <StepVorlage state={state} onChange={updateState} />}
          {currentStep === 3 && <StepSchriften state={state} onChange={updateState} />}
          {currentStep === 4 && <StepFarben state={state} onChange={updateState} />}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Zuruck
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/${locale}/admin/flows`}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </Link>
              {isLastStep ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Wird erstellt..." : "Erstellen"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Weiter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="w-[310px] shrink-0">
          <div className="sticky top-6 bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Vorschau</h3>
            <PhonePreview state={state} step={currentStep} />
          </div>
        </div>
      </div>
    </div>
  );
}

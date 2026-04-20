"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, ChevronRight, Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";
import { extractColorsFromImage } from "@/lib/color-extract";

interface Step {
  question: string;
  options: string[];
  optionInput: string;
}

interface AIGenerateDialogProps {
  onClose: () => void;
  locale: string;
}

const INDUSTRIES = [
  { value: "", label: "Branche wählen..." },
  { value: "real-estate", label: "Immobilien" },
  { value: "health", label: "Gesundheit / Medizin" },
  { value: "finance", label: "Finanzen / Versicherung" },
  { value: "education", label: "Bildung" },
  { value: "saas", label: "SaaS / Software" },
  { value: "ecommerce", label: "E-Commerce" },
  { value: "consulting", label: "Beratung" },
  { value: "recruiting", label: "Recruiting / HR" },
  { value: "events", label: "Events" },
  { value: "other", label: "Sonstiges" },
];

const TONE_OPTIONS = [
  { value: "professional", label: "Professionell" },
  { value: "friendly", label: "Freundlich" },
  { value: "direct", label: "Direkt" },
  { value: "empathetic", label: "Empathisch" },
];

const COLOR_PRESETS = [
  { id: "blue",   label: "Modern",  primary: "#4f46e5", bg: "#ffffff",  text: "#111827" },
  { id: "orange", label: "Warm",    primary: "#ea580c", bg: "#fffbeb",  text: "#1c1917" },
  { id: "dark",   label: "Elegant", primary: "#a78bfa", bg: "#1e1b4b",  text: "#e0e7ff" },
  { id: "green",  label: "Natur",   primary: "#16a34a", bg: "#f0fdf4",  text: "#14532d" },
];

const RADIUS_OPTIONS = [
  { value: "0",      label: "Eckig"     },
  { value: "0.5rem", label: "Rund"      },
  { value: "1rem",   label: "Sehr rund" },
];

export default function AIGenerateDialog({ onClose, locale }: AIGenerateDialogProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"briefing" | "planning" | "review" | "generating" | "done">("briefing");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ flowId: string; flowName: string; steps: number; aiUsed: boolean } | null>(null);
  const [planText, setPlanText] = useState<string>("");

  // Topic
  const [goal, setGoal] = useState("");
  const [industry, setIndustry] = useState("");
  const [tone, setTone] = useState("professional");
  const [audience, setAudience] = useState("");
  const [conversionGoal, setConversionGoal] = useState("");

  // Design
  const [colorPreset, setColorPreset] = useState("blue");
  const [customPrimary, setCustomPrimary] = useState("#4f46e5");
  const [customBg, setCustomBg] = useState("#ffffff");
  const [borderRadius, setBorderRadius] = useState("0.5rem");

  // Style-import (inspiration)
  const [styleUrl, setStyleUrl] = useState("");
  const [styleImageDataUrl, setStyleImageDataUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [styleError, setStyleError] = useState<string | null>(null);

  function handleStyleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setStyleError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setStyleImageDataUrl(null);
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setStyleError("Datei zu groß (max. 3 MB).");
      setStyleImageDataUrl(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setStyleImageDataUrl(typeof reader.result === "string" ? reader.result : null);
    };
    reader.onerror = () => setStyleError("Datei konnte nicht gelesen werden.");
    reader.readAsDataURL(file);
  }

  async function handleExtractStyle() {
    setExtracting(true);
    setStyleError(null);
    try {
      if (styleUrl) {
        const res = await fetch("/api/ai/style-extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: styleUrl }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Stil-Extraktion fehlgeschlagen");
        }
        const data = await res.json();
        setColorPreset("custom");
        setCustomPrimary(data.primaryColor);
        setCustomBg(data.backgroundColor);
        setBorderRadius(data.borderRadius ?? "0.75rem");
      } else if (styleImageDataUrl) {
        const colors = await extractColorsFromImage(styleImageDataUrl);
        setColorPreset("custom");
        setCustomPrimary(colors.primary);
        setCustomBg(colors.background);
        setBorderRadius(borderRadius ?? "0.75rem");
      }
    } catch (err) {
      setStyleError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setExtracting(false);
    }
  }

  // Flow structure
  const [steps, setSteps] = useState<Step[]>([
    { question: "", options: [], optionInput: "" },
    { question: "", options: [], optionInput: "" },
  ]);

  function addStep() {
    setSteps((prev) => [...prev, { question: "", options: [], optionInput: "" }]);
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateStepQuestion(i: number, val: string) {
    setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, question: val } : s));
  }

  function updateOptionInput(i: number, val: string) {
    setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, optionInput: val } : s));
  }

  function addOption(i: number) {
    setSteps((prev) => prev.map((s, idx) => {
      if (idx !== i || !s.optionInput.trim()) return s;
      return { ...s, options: [...s.options, s.optionInput.trim()], optionInput: "" };
    }));
  }

  function removeOption(stepIdx: number, optIdx: number) {
    setSteps((prev) => prev.map((s, idx) => {
      if (idx !== stepIdx) return s;
      return { ...s, options: s.options.filter((_, oi) => oi !== optIdx) };
    }));
  }

  const activePreset = COLOR_PRESETS.find((p) => p.id === colorPreset);
  const theme = colorPreset === "custom"
    ? { primaryColor: customPrimary, backgroundColor: customBg, textColor: "#111827" }
    : { primaryColor: activePreset!.primary, backgroundColor: activePreset!.bg, textColor: activePreset!.text };

  function buildBriefing() {
    const desiredSteps = steps
      .filter((s) => s.question.trim())
      .map((s) =>
        s.options.length > 0
          ? `${s.question} (Optionen: ${s.options.join(", ")})`
          : s.question
      );

    return {
      goal: goal.trim(),
      audience: audience.trim() || undefined,
      conversionGoal: conversionGoal.trim() || undefined,
      industry: industry || undefined,
      tone,
      desiredSteps: desiredSteps.length > 0 ? desiredSteps : undefined,
      language: "de",
      theme: { ...theme, borderRadius },
    };
  }

  async function createPlan() {
    if (!goal.trim()) return;
    setPhase("planning");
    setError(null);

    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefing: buildBriefing() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Planung fehlgeschlagen");
      }

      const data = await res.json();
      setPlanText(data.plan ?? "");
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setPhase("briefing");
    }
  }

  async function generate() {
    if (!goal.trim()) return;
    setPhase("generating");
    setError(null);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          briefing: buildBriefing(),
          plan: planText,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Generierung fehlgeschlagen");
      }

      const data = await res.json();
      setResult(data);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setPhase("review");
    }
  }

  function openFlow() {
    if (result) {
      router.push(`/${locale}/flow/${result.flowId}/build`);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <Sparkles size={20} />
          <div>
            <h2 className="font-bold text-base">Flow mit KI generieren</h2>
            <p className="text-xs text-indigo-200">Beschreibe dein Ziel — wir bauen den Flow.</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* ── Briefing form ─────────────────────────────────────────── */}
        {phase === "briefing" && (
          <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                {error}
              </div>
            )}

            {/* Thema */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2.5">Thema</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">
                    Ziel des Flows <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="z.B. Interessenten für eine Immobilienbesichtigung qualifizieren"
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Branche</label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      {INDUSTRIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Zielgruppe</label>
                    <input
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      placeholder="z.B. Hausbesitzer 40–60"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Conversion-Ziel</label>
                    <input
                      value={conversionGoal}
                      onChange={(e) => setConversionGoal(e.target.value)}
                      placeholder="z.B. Termin buchen"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Tonalität</label>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {TONE_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          onClick={() => setTone(o.value)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                            tone === o.value
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Design */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2.5">Design</p>

              <div className="mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Inspiration (optional)</p>

                <label className="block text-xs text-gray-600 mb-1">Website-URL</label>
                <input
                  type="url"
                  value={styleUrl}
                  onChange={(e) => setStyleUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 mb-2"
                />

                <label className="block text-xs text-gray-600 mb-1">Logo oder Screenshot</label>
                <div className="flex items-center gap-2 mb-2">
                  <input type="file" accept="image/*" onChange={handleStyleImageSelect} className="text-xs flex-1" />
                  {styleImageDataUrl && <span className="text-[10px] text-green-600">✓ geladen</span>}
                </div>

                <button
                  onClick={handleExtractStyle}
                  disabled={extracting || (!styleUrl && !styleImageDataUrl)}
                  className="w-full py-1.5 text-xs font-medium rounded bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
                >
                  {extracting ? "Extrahiere..." : "✨ Stil übernehmen"}
                </button>

                {styleError && <p className="text-[11px] text-red-600 mt-1.5">{styleError}</p>}
              </div>

              <label className="block text-xs text-gray-600 mb-1.5">Farbschema</label>
              <div className="flex gap-2 flex-wrap mb-3">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setColorPreset(preset.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      colorPreset === preset.id
                        ? "border-indigo-500 ring-2 ring-indigo-200"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    style={{ backgroundColor: preset.bg }}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: preset.primary }} />
                    <span style={{ color: preset.text }}>{preset.label}</span>
                  </button>
                ))}
                <button
                  onClick={() => setColorPreset("custom")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    colorPreset === "custom"
                      ? "border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Eigene
                </button>
              </div>

              {colorPreset === "custom" && (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Hauptfarbe</label>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5">
                      <input type="color" value={customPrimary} onChange={(e) => setCustomPrimary(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent" />
                      <input type="text" value={customPrimary} onChange={(e) => setCustomPrimary(e.target.value)} className="flex-1 text-xs font-mono outline-none" maxLength={7} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Hintergrund</label>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5">
                      <input type="color" value={customBg} onChange={(e) => setCustomBg(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent" />
                      <input type="text" value={customBg} onChange={(e) => setCustomBg(e.target.value)} className="flex-1 text-xs font-mono outline-none" maxLength={7} />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-600 mb-1.5">Ecken</label>
                <div className="flex gap-2">
                  {RADIUS_OPTIONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setBorderRadius(r.value)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        borderRadius === r.value
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Flow-Struktur */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Flow-Struktur</p>
              <p className="text-[11px] text-gray-400 mb-2.5">Definiere die Seiten deines Flows. Füge Antwortmöglichkeiten hinzu, um Auswahlfelder zu erstellen.</p>

              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-2 bg-gray-50/40">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 shrink-0 w-4">{i + 1}.</span>
                      <input
                        value={step.question}
                        onChange={(e) => updateStepQuestion(i, e.target.value)}
                        placeholder={
                          ["Kundensituation", "Anforderungen", "Kontaktdaten", "Details"][i] ?? "Seitenname / Frage"
                        }
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      />
                      {steps.length > 1 && (
                        <button
                          onClick={() => removeStep(i)}
                          className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* Answer options */}
                    <div className="pl-6">
                      {step.options.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          {step.options.map((opt, oi) => (
                            <span
                              key={oi}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px]"
                            >
                              {opt}
                              <button onClick={() => removeOption(i, oi)} className="hover:text-indigo-900 leading-none">
                                <X size={9} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <input
                          value={step.optionInput}
                          onChange={(e) => updateOptionInput(i, e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(i); } }}
                          placeholder="Antwortmöglichkeit eingeben + Enter"
                          className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white placeholder-gray-300"
                        />
                        <button
                          onClick={() => addOption(i)}
                          disabled={!step.optionInput.trim()}
                          className="px-2 py-1 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 disabled:opacity-30 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addStep}
                  className="w-full py-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
                >
                  + Seite hinzufügen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Planning */}
        {phase === "planning" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 size={32} className="text-indigo-600 animate-spin" />
            <p className="text-sm font-medium text-gray-700">Planung wird erstellt...</p>
            <p className="text-xs text-gray-400">Wir entwerfen die Struktur — das dauert ca. 30 Sekunden.</p>
          </div>
        )}

        {/* Review */}
        {phase === "review" && (
          <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
            <div>
              <h3 className="text-base font-bold text-gray-900">Plan prüfen & anpassen</h3>
              <p className="text-xs text-gray-500 mt-1">
                Prüfe und passe die Struktur an. Die KI baut den Flow exakt aus dieser Outline.
              </p>
            </div>
            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                {error}
              </div>
            )}
            <textarea
              value={planText}
              onChange={(e) => setPlanText(e.target.value)}
              rows={14}
              className="w-full text-xs font-mono border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
            />
          </div>
        )}

        {/* Generating */}
        {phase === "generating" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 size={32} className="text-indigo-600 animate-spin" />
            <p className="text-sm font-medium text-gray-700">Flow wird generiert...</p>
            <p className="text-xs text-gray-400">Seiten, Felder und Design werden angelegt</p>
          </div>
        )}

        {/* Done */}
        {phase === "done" && result && (
          <div className="flex flex-col items-center py-12 gap-4 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <Sparkles size={24} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{result.flowName}</h3>
              <p className="text-sm text-gray-500 mt-1">{result.steps} Seiten generiert</p>
              {result.aiUsed && <p className="text-xs text-indigo-600 mt-1">✨ Mit KI optimiert</p>}
            </div>
            <button
              onClick={openFlow}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors mt-2"
            >
              Flow öffnen <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Footer */}
        {phase === "briefing" && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Abbrechen
            </button>
            <button
              onClick={createPlan}
              disabled={!goal.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              <Sparkles size={14} />
              Plan erstellen
            </button>
          </div>
        )}

        {phase === "review" && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
            <button
              onClick={() => { setError(null); setPhase("briefing"); }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft size={14} />
              Zurück
            </button>
            <button
              onClick={generate}
              disabled={!planText.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              <Sparkles size={14} />
              Flow generieren
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

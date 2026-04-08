"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, ChevronRight, Loader2 } from "lucide-react";

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

const COMMON_FIELDS = ["name", "email", "phone", "company", "message", "address", "budget", "date"];

export default function AIGenerateDialog({ onClose, locale }: AIGenerateDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<"briefing" | "generating" | "done">("briefing");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ flowId: string; flowName: string; steps: number; aiUsed: boolean } | null>(null);

  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [conversionGoal, setConversionGoal] = useState("");
  const [industry, setIndustry] = useState("");
  const [tone, setTone] = useState("professional");
  const [selectedFields, setSelectedFields] = useState<string[]>(["name", "email"]);
  const [customSteps, setCustomSteps] = useState("");

  function toggleField(field: string) {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  }

  async function generate() {
    if (!goal.trim()) return;

    setStep("generating");
    setError(null);

    try {
      const desiredSteps = customSteps.trim()
        ? customSteps.split("\n").map((s) => s.trim()).filter(Boolean)
        : undefined;

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          briefing: {
            goal: goal.trim(),
            audience: audience.trim() || undefined,
            conversionGoal: conversionGoal.trim() || undefined,
            industry: industry || undefined,
            tone,
            fields: selectedFields.length > 0 ? selectedFields : undefined,
            desiredSteps,
            language: "de",
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Generierung fehlgeschlagen");
      }

      const data = await res.json();
      setResult(data);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setStep("briefing");
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
            <h2 className="font-bold text-base">Flow mit AI generieren</h2>
            <p className="text-xs text-indigo-200">Beschreibe dein Ziel — wir bauen den Flow.</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>

        {step === "briefing" && (
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                {error}
              </div>
            )}

            {/* Goal */}
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

            {/* Industry + Tone */}
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
                <label className="block text-xs text-gray-600 mb-1">Tonalität</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {TONE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Audience + Conversion goal */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Zielgruppe</label>
                <input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="z.B. Hausbesitzer 40-60"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Conversion-Ziel</label>
                <input
                  value={conversionGoal}
                  onChange={(e) => setConversionGoal(e.target.value)}
                  placeholder="z.B. Termin buchen"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* Fields */}
            <div>
              <label className="block text-xs text-gray-600 mb-1.5">Formularfelder einschließen</label>
              <div className="flex flex-wrap gap-2">
                {COMMON_FIELDS.map((field) => (
                  <button
                    key={field}
                    onClick={() => toggleField(field)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedFields.includes(field)
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    {field}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom steps */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Gewünschte Schritte <span className="text-gray-400">(optional, ein Schritt pro Zeile)</span>
              </label>
              <textarea
                value={customSteps}
                onChange={(e) => setCustomSteps(e.target.value)}
                placeholder={"Schritt 1: Situation\nSchritt 2: Anforderungen\nSchritt 3: Kontakt"}
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
              />
            </div>

            {!process.env.NEXT_PUBLIC_AI_AVAILABLE && (
              <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <Sparkles size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  Kein ANTHROPIC_API_KEY konfiguriert — Flow wird mit intelligenten Vorlagen generiert.
                </p>
              </div>
            )}
          </div>
        )}

        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 size={32} className="text-indigo-600 animate-spin" />
            <p className="text-sm font-medium text-gray-700">Flow wird generiert...</p>
            <p className="text-xs text-gray-400">Seiten, Felder und Logik werden angelegt</p>
          </div>
        )}

        {step === "done" && result && (
          <div className="flex flex-col items-center py-12 gap-4 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <Sparkles size={24} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{result.flowName}</h3>
              <p className="text-sm text-gray-500 mt-1">{result.steps} Schritte generiert</p>
              {result.aiUsed && (
                <p className="text-xs text-indigo-600 mt-1">✨ Mit AI optimiert</p>
              )}
            </div>
            <button
              onClick={openFlow}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors mt-2"
            >
              Flow öffnen
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Footer */}
        {step === "briefing" && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Abbrechen
            </button>
            <button
              onClick={generate}
              disabled={!goal.trim()}
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

"use client";

import { useState, useCallback } from "react";
import { Sparkles, X, ChevronRight, Loader2, RefreshCw, Copy, Check } from "lucide-react";
import type { FlowStep } from "@opensoftware/openflow-core";

type SuggestContext = "headline" | "cta" | "step" | "component";

interface Suggestion {
  type: string;
  label: string;
  value: string;
  description?: string;
}

interface AIAssistantProps {
  flowId: string;
  flowGoal?: string;
  selectedStep?: FlowStep | null;
  selectedComponentType?: string | null;
  onApplySuggestion?: (value: string, type: string) => void;
  onClose: () => void;
}

const CONTEXT_OPTIONS: { id: SuggestContext; label: string; description: string }[] = [
  { id: "headline", label: "Überschrift", description: "Vorschläge für Seitenüberschriften" },
  { id: "cta", label: "Button-Text", description: "Call-to-Action Formulierungen" },
  { id: "step", label: "Seiten-Tipps", description: "Optimierungshinweise für den aktuellen Schritt" },
  { id: "component", label: "Element-Inhalt", description: "Inhaltsvorschläge für das ausgewählte Element" },
];

function SuggestionCard({ suggestion, onApply }: { suggestion: Suggestion; onApply: (s: Suggestion) => void }) {
  const [copied, setCopied] = useState(false);

  function copyToClipboard() {
    navigator.clipboard.writeText(suggestion.value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="group border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
      <p className="text-sm text-gray-800 leading-snug">{suggestion.value || suggestion.label}</p>
      {suggestion.description && (
        <p className="text-xs text-gray-500 mt-1 italic">{suggestion.description}</p>
      )}
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {suggestion.value && (
          <button
            onClick={() => onApply(suggestion)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <ChevronRight size={10} />
            Übernehmen
          </button>
        )}
        {suggestion.value && (
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? "Kopiert" : "Kopieren"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AIAssistant({ flowId, flowGoal, selectedStep, selectedComponentType, onApplySuggestion, onClose }: AIAssistantProps) {
  const [context, setContext] = useState<SuggestContext>("headline");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);
  const [currentText, setCurrentText] = useState("");

  const fetchSuggestions = useCallback(async (ctx: SuggestContext) => {
    setLoading(true);
    setSuggestions([]);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: ctx,
          step: ctx === "step" ? selectedStep : undefined,
          componentType: ctx === "component" ? selectedComponentType : undefined,
          currentText: currentText || undefined,
          flowGoal,
          language: "de",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
        setAiUsed(data.aiUsed ?? false);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedStep, selectedComponentType, currentText, flowGoal]);

  function selectContext(ctx: SuggestContext) {
    setContext(ctx);
    fetchSuggestions(ctx);
  }

  function handleApply(suggestion: Suggestion) {
    onApplySuggestion?.(suggestion.value, suggestion.type);
  }

  return (
    <div className="fixed right-4 top-16 bottom-4 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
        <Sparkles size={15} className="text-indigo-600" />
        <span className="text-sm font-semibold text-gray-900 flex-1">AI-Assistent</span>
        {aiUsed && <span className="text-[10px] text-indigo-500 font-medium">✨ AI</span>}
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
          <X size={14} />
        </button>
      </div>

      {/* Context selector */}
      <div className="px-3 py-2 border-b border-gray-100 shrink-0">
        <div className="grid grid-cols-2 gap-1">
          {CONTEXT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => selectContext(opt.id)}
              className={`px-2 py-1.5 rounded text-xs font-medium text-left transition-colors ${
                context === opt.id
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">
          {CONTEXT_OPTIONS.find((o) => o.id === context)?.description}
        </p>
      </div>

      {/* Optional: current text input */}
      {(context === "headline" || context === "cta") && (
        <div className="px-3 py-2 border-b border-gray-100 shrink-0">
          <input
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            placeholder={context === "headline" ? "Aktueller Text (optional)" : "Aktueller Button-Text"}
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      )}

      {/* Suggestions */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 size={20} className="text-indigo-500 animate-spin" />
            <p className="text-xs text-gray-400">Generiere Vorschläge...</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <Sparkles size={24} className="text-gray-300" />
            <p className="text-xs text-gray-400">Wähle einen Kontext und hol dir Vorschläge.</p>
            <button
              onClick={() => fetchSuggestions(context)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Sparkles size={12} />
              Vorschläge laden
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <SuggestionCard key={i} suggestion={s} onApply={handleApply} />
            ))}
          </div>
        )}
      </div>

      {/* Footer: Refresh */}
      {suggestions.length > 0 && (
        <div className="border-t border-gray-100 px-3 py-2 shrink-0">
          <button
            onClick={() => fetchSuggestions(context)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Weitere Vorschläge
          </button>
        </div>
      )}
    </div>
  );
}

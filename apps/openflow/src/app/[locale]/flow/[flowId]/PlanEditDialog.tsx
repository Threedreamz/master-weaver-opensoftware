"use client";

import { useState } from "react";
import { FileText, X, Loader2, Save, RefreshCw, AlertTriangle } from "lucide-react";

interface PlanEditDialogProps {
  flowId: string;
  initialPlan: string;
  initialBriefing: string; // serialized JSON
  onClose: () => void;
  onRegenerated: () => void;
}

export default function PlanEditDialog({
  flowId,
  initialPlan,
  initialBriefing,
  onClose,
  onRegenerated,
}: PlanEditDialogProps) {
  const [planText, setPlanText] = useState<string>(initialPlan);
  const [phase, setPhase] = useState<"edit" | "saving" | "regenerating" | "confirm-regen">("edit");
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  async function handleSavePlan() {
    setPhase("saving");
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/flows/${flowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiPlan: planText }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Speichern fehlgeschlagen");
      }

      setSaveSuccess(true);
      setPhase("edit");
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setPhase("edit");
    }
  }

  async function handleRegenerate() {
    setPhase("regenerating");
    setError(null);

    try {
      let briefing: unknown;
      try {
        briefing = JSON.parse(initialBriefing);
      } catch {
        throw new Error("Ursprungs-Briefing konnte nicht gelesen werden.");
      }

      const res = await fetch(`/api/ai/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowId,
          plan: planText,
          briefing,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Neu-Generierung fehlgeschlagen");
      }

      onRegenerated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setPhase("edit");
    }
  }

  const busy = phase === "saving" || phase === "regenerating";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <FileText size={20} />
          <div>
            <h2 className="font-bold text-base">Start-Prompt bearbeiten</h2>
            <p className="text-xs text-indigo-200">
              Passe die Outline an — speichere nur den Plan oder regeneriere den ganzen Flow.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="ml-auto p-1 rounded hover:bg-white/20 transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="relative">
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                {error}
              </div>
            )}
            {saveSuccess && (
              <div className="px-4 py-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200">
                Plan gespeichert.
              </div>
            )}
            <textarea
              value={planText}
              onChange={(e) => setPlanText(e.target.value)}
              rows={16}
              disabled={busy}
              className="w-full text-xs font-mono border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 disabled:opacity-60"
            />

            {phase === "confirm-regen" && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                  <p>Der aktuelle Flow wird ersetzt. Fortfahren?</p>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setPhase("edit")}
                    className="px-3 py-1.5 text-xs rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleRegenerate}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                  >
                    <RefreshCw size={12} />
                    Ja, Flow ersetzen
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Spinner overlay when busy */}
          {busy && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3">
              <Loader2 size={28} className="text-indigo-600 animate-spin" />
              <p className="text-sm font-medium text-gray-700">
                {phase === "saving"
                  ? "Plan wird gespeichert..."
                  : "Flow wird neu generiert..."}
              </p>
              {phase === "regenerating" && (
                <p className="text-xs text-gray-500">
                  Der Flow wird komplett ersetzt — das dauert einen Moment.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-40"
          >
            Abbrechen
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSavePlan}
              disabled={busy || !planText.trim() || phase === "confirm-regen"}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-700 text-sm font-semibold hover:bg-indigo-50 disabled:opacity-40 transition-colors"
            >
              <Save size={14} />
              Plan speichern
            </button>
            <button
              onClick={() => setPhase("confirm-regen")}
              disabled={busy || !planText.trim() || phase === "confirm-regen"}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={14} />
              Flow neu generieren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

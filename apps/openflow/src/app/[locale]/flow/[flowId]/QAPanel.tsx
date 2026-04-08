"use client";

import { useState, useCallback } from "react";
import { ShieldCheck, AlertTriangle, AlertCircle, Info, ChevronRight, RefreshCw, X, CheckCircle } from "lucide-react";
import type { FlowStep } from "@opensoftware/openflow-core";

interface QAFinding {
  id: string;
  flowId: string;
  stepId?: string | null;
  componentId?: string | null;
  category: "color" | "typography" | "spacing" | "theme" | "accessibility" | "structure";
  severity: "error" | "warning" | "info";
  message: string;
  suggestion?: string | null;
  dismissed: boolean;
}

interface QAPanelProps {
  flowId: string;
  steps: FlowStep[];
  onClose: () => void;
  onNavigateToStep?: (stepId: string) => void;
  onNavigateToComponent?: (stepId: string, componentId: string) => void;
}

const CATEGORY_LABELS: Record<QAFinding["category"], string> = {
  color: "Farben",
  typography: "Typografie",
  spacing: "Abstände",
  theme: "Theme-Abweichung",
  accessibility: "Barrierefreiheit",
  structure: "Struktur",
};

const SEVERITY_CONFIG = {
  error: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Fehler" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "Warnung" },
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", label: "Info" },
};

function SeverityBadge({ severity }: { severity: QAFinding["severity"] }) {
  const cfg = SEVERITY_CONFIG[severity];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

export default function QAPanel({ flowId, steps, onClose, onNavigateToStep, onNavigateToComponent }: QAPanelProps) {
  const [findings, setFindings] = useState<QAFinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [groupBy, setGroupBy] = useState<"severity" | "category">("severity");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["error", "warning"]));

  const runQA = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/flows/${flowId}/qa`, { method: "POST" });
      if (res.ok) {
        setFindings(await res.json());
        setRan(true);
        setExpandedGroups(new Set(["error", "warning"]));
      }
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  async function dismiss(finding: QAFinding) {
    const res = await fetch(`/api/flows/${flowId}/qa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss", findingId: finding.id }),
    });
    if (res.ok) {
      setFindings((prev) => prev.filter((f) => f.id !== finding.id));
    }
  }

  function getStepLabel(stepId: string | null | undefined): string | undefined {
    if (!stepId) return undefined;
    return steps.find((s) => s.id === stepId)?.label;
  }

  function getComponentLabel(stepId: string | null | undefined, componentId: string | null | undefined): string | undefined {
    if (!stepId || !componentId) return undefined;
    const step = steps.find((s) => s.id === stepId);
    const comp = step?.components.find((c) => c.id === componentId);
    return comp ? (comp.label || comp.componentType) : undefined;
  }

  // Group findings
  const groupedFindings = findings.reduce((acc, f) => {
    const key = groupBy === "severity" ? f.severity : f.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {} as Record<string, QAFinding[]>);

  const severityOrder = ["error", "warning", "info"];
  const groupKeys = groupBy === "severity"
    ? severityOrder.filter((k) => groupedFindings[k])
    : Object.keys(CATEGORY_LABELS).filter((k) => groupedFindings[k]);

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-600" />
          <span className="text-sm font-semibold text-gray-900">Design QA</span>
          {ran && (
            <span className="text-xs text-gray-400">{findings.length} Befunde</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={runQA}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            {loading ? "Prüfen..." : ran ? "Erneut prüfen" : "Prüfung starten"}
          </button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Score bar */}
      {ran && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
          {findings.length === 0 ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle size={16} />
              <span className="text-sm font-semibold">Keine Probleme gefunden — Top!</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span className="font-medium">Qualitätscheck</span>
                <span>{errorCount} Fehler · {warningCount} Warnungen</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${errorCount > 0 ? "bg-red-500" : warningCount > 0 ? "bg-amber-400" : "bg-green-500"}`}
                  style={{ width: `${Math.max(5, 100 - errorCount * 20 - warningCount * 7)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Group controls */}
      {ran && findings.length > 0 && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 shrink-0">
          <span className="text-xs text-gray-500 mr-1">Gruppieren:</span>
          {(["severity", "category"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${groupBy === g ? "bg-indigo-50 text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              {g === "severity" ? "Schweregrad" : "Kategorie"}
            </button>
          ))}
        </div>
      )}

      {/* Findings */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!ran ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
            <ShieldCheck size={32} className="text-gray-300" />
            <p className="text-sm text-gray-500">Starte die QA-Prüfung, um Inkonsistenzen in deinem Flow zu finden.</p>
            <p className="text-xs text-gray-400">Farben · Typografie · Barrierefreiheit · Struktur</p>
            <button
              onClick={runQA}
              disabled={loading}
              className="mt-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Jetzt prüfen
            </button>
          </div>
        ) : findings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
            <CheckCircle size={32} className="text-green-500" />
            <p className="text-sm font-semibold text-green-700">Alles in Ordnung!</p>
            <p className="text-xs text-gray-400">Keine Qualitätsprobleme gefunden.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {groupKeys.map((groupKey) => {
              const group = groupedFindings[groupKey];
              const isOpen = expandedGroups.has(groupKey);
              const label = groupBy === "severity"
                ? SEVERITY_CONFIG[groupKey as QAFinding["severity"]].label
                : CATEGORY_LABELS[groupKey as QAFinding["category"]];

              return (
                <div key={groupKey}>
                  <button
                    onClick={() => setExpandedGroups((prev) => {
                      const next = new Set(prev);
                      if (next.has(groupKey)) next.delete(groupKey);
                      else next.add(groupKey);
                      return next;
                    })}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {groupBy === "severity" && <SeverityBadge severity={groupKey as QAFinding["severity"]} />}
                      {groupBy === "category" && <span className="text-xs font-medium text-gray-700">{label}</span>}
                      <span className="text-xs text-gray-400">{group.length}</span>
                    </div>
                    <ChevronRight size={14} className={`text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="bg-gray-50 divide-y divide-gray-100">
                      {group.map((finding) => {
                        const cfg = SEVERITY_CONFIG[finding.severity];
                        const Icon = cfg.icon;
                        const stepLabel = getStepLabel(finding.stepId);
                        const compLabel = getComponentLabel(finding.stepId, finding.componentId);

                        return (
                          <div key={finding.id} className="px-4 py-3 group">
                            <div className="flex items-start gap-2">
                              <Icon size={14} className={`${cfg.color} mt-0.5 shrink-0`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-800 leading-snug">{finding.message}</p>
                                {finding.suggestion && (
                                  <p className="text-xs text-gray-500 mt-1 italic">→ {finding.suggestion}</p>
                                )}
                                {(stepLabel || compLabel) && (
                                  <button
                                    onClick={() => {
                                      if (finding.componentId && finding.stepId) {
                                        onNavigateToComponent?.(finding.stepId, finding.componentId);
                                      } else if (finding.stepId) {
                                        onNavigateToStep?.(finding.stepId);
                                      }
                                    }}
                                    className="mt-1.5 text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                                  >
                                    <ChevronRight size={10} />
                                    {compLabel ? `${stepLabel} › ${compLabel}` : stepLabel}
                                  </button>
                                )}
                              </div>
                              <button
                                onClick={() => dismiss(finding)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-gray-600 transition-opacity"
                                title="Ignorieren"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

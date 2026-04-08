"use client";

import { useState, useCallback } from "react";
import { Zap, AlertCircle, AlertTriangle, Info, RefreshCw, Image, Box, Code, Type, Layout } from "lucide-react";

interface PerformanceFinding {
  category: "images" | "components" | "structure" | "scripts" | "fonts";
  severity: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
  value?: string | number;
}

interface PerformanceReport {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  findings: PerformanceFinding[];
  stats: {
    totalSteps: number;
    totalComponents: number;
    totalImages: number;
    estimatedImageBytes: number;
    hasCustomJS: boolean;
    hasCustomCSS: boolean;
    hasTracking: boolean;
    fontsLoaded: string[];
    componentTypeDistribution: Record<string, number>;
  };
}

const GRADE_COLORS: Record<string, { text: string; ring: string; bg: string }> = {
  A: { text: "text-green-600", ring: "stroke-green-500", bg: "bg-green-50" },
  B: { text: "text-lime-600", ring: "stroke-lime-500", bg: "bg-lime-50" },
  C: { text: "text-amber-600", ring: "stroke-amber-500", bg: "bg-amber-50" },
  D: { text: "text-orange-600", ring: "stroke-orange-500", bg: "bg-orange-50" },
  F: { text: "text-red-600", ring: "stroke-red-500", bg: "bg-red-50" },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  images: Image,
  components: Box,
  scripts: Code,
  fonts: Type,
  structure: Layout,
};

const CATEGORY_LABELS: Record<string, string> = {
  images: "Bilder",
  components: "Elemente",
  scripts: "Skripte",
  fonts: "Schriftarten",
  structure: "Struktur",
};

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const colors = GRADE_COLORS[grade] ?? GRADE_COLORS["C"];
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="64" cy="64" r={radius} fill="none"
            strokeWidth="10" strokeLinecap="round"
            className={colors.ring}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black ${colors.text}`}>{score}</span>
          <span className="text-xs text-gray-400">/100</span>
        </div>
      </div>
      <span className={`px-3 py-1 rounded-full text-sm font-bold border ${colors.bg} ${colors.text}`}>
        Note {grade}
      </span>
    </div>
  );
}

export default function PerformancePanel({ flowId }: { flowId: string }) {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/flows/${flowId}/performance`);
      if (res.ok) setReport(await res.json());
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  const severityIcon = (s: string) => {
    if (s === "error") return <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />;
    if (s === "warning") return <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />;
    return <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />;
  };

  const grouped = report?.findings.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {} as Record<string, PerformanceFinding[]>) ?? {};

  return (
    <div className="space-y-6">
      {/* Run button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Performance-Analyse</h2>
          <p className="text-sm text-gray-500">Ladezeit, Assets, Struktur und Optimierungspotenzial</p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Analysiere..." : report ? "Erneut analysieren" : "Analyse starten"}
        </button>
      </div>

      {!report && !loading && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 flex flex-col items-center gap-3 text-center">
          <Zap size={32} className="text-gray-300" />
          <p className="text-sm text-gray-500">Starte die Analyse, um Performance-Probleme zu identifizieren.</p>
          <p className="text-xs text-gray-400">Bilder · Skripte · Struktur · Mobile Performance</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-16">
          <RefreshCw size={28} className="text-indigo-500 animate-spin" />
          <p className="text-sm text-gray-500">Analysiere Flow...</p>
        </div>
      )}

      {report && !loading && (
        <>
          {/* Score + summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-8">
            <ScoreGauge score={report.score} grade={report.grade} />
            <div className="flex-1">
              <p className="text-base font-semibold text-gray-800 mb-3">{report.summary}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Schritte", value: report.stats.totalSteps },
                  { label: "Elemente", value: report.stats.totalComponents },
                  { label: "Bilder", value: report.stats.totalImages },
                  { label: "Bildgröße (est.)", value: report.stats.estimatedImageBytes > 0 ? `${Math.round(report.stats.estimatedImageBytes / 1024)}KB` : "0KB" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="text-sm font-bold text-gray-800">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {report.stats.hasCustomJS && <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200">Custom JS</span>}
                {report.stats.hasTracking && <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200">Tracking</span>}
                {report.stats.fontsLoaded.length > 0 && <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200">{report.stats.fontsLoaded.length} Font(s)</span>}
              </div>
            </div>
          </div>

          {/* Findings by category */}
          {Object.keys(grouped).length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <p className="text-green-700 font-semibold">Keine Performance-Probleme gefunden 🎉</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Befunde</h3>
              {Object.entries(grouped).map(([category, catFindings]) => {
                const Icon = CATEGORY_ICONS[category] ?? Box;
                return (
                  <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <Icon size={14} className="text-gray-500" />
                      <span className="text-xs font-semibold text-gray-700">{CATEGORY_LABELS[category] ?? category}</span>
                      <span className="text-xs text-gray-400 ml-1">{catFindings.length}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {catFindings.map((f, i) => (
                        <div key={i} className="flex items-start gap-3 px-4 py-3">
                          {severityIcon(f.severity)}
                          <div>
                            <p className="text-sm text-gray-800">{f.message}</p>
                            {f.suggestion && <p className="text-xs text-gray-500 mt-0.5 italic">→ {f.suggestion}</p>}
                          </div>
                          {f.value !== undefined && (
                            <span className="ml-auto text-xs font-mono text-gray-400 shrink-0">{f.value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Monitor,
  Smartphone,
  Tablet,
  ChevronDown,
  RotateCcw,
  Calendar,
} from "lucide-react";
import PerformancePanel from "../PerformancePanel";

/* ---------- Types ---------- */

interface AnalyticsData {
  visits: number;
  submissions: number;
  completionRate: number;
  avgDuration: number;
  dailyStats: { date: string; visits: number; submissions: number }[];
  stepStats: {
    stepId: string;
    label: string;
    views: number;
    exits: number;
    exitRate: number;
  }[];
  deviceStats: { desktop: number; mobile: number; tablet: number };
}

interface Submission {
  id: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  answers: Record<string, unknown>;
}

type MainTab = "analytics" | "antworten" | "performance";
type ChartMetric = "visits" | "submissions" | "avgDuration";

const DAYS_OF_WEEK = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/* ---------- Helpers ---------- */

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function formatDateTime(dt: string | null): string {
  if (!dt) return "--";
  return new Date(dt).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(
  startedAt: string | null,
  completedAt: string | null
): string {
  if (!startedAt || !completedAt) return "--";
  const ms =
    new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return "--";
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

/* ---------- Component ---------- */

export default function ResultsPage() {
  const params = useParams();
  const flowId = params.flowId as string;

  const [mainTab, setMainTab] = useState<MainTab>("analytics");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("visits");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState(7);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showDatePicker, setShowDatePicker] = useState(false);

  /* -- Fetch analytics -- */
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const now = new Date();
      const from = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);
      const fromStr = from.toISOString().split("T")[0];
      const toStr = now.toISOString().split("T")[0];

      const res = await fetch(
        `/api/flows/${flowId}/analytics?from=${fromStr}&to=${toStr}`
      );
      if (!res.ok) throw new Error("Failed to load analytics");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, [flowId, range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  /* -- Fetch submissions -- */
  const fetchSubmissions = useCallback(async () => {
    setSubmissionsLoading(true);
    try {
      const res = await fetch(`/api/submissions?flowId=${flowId}`);
      if (!res.ok) throw new Error("Failed to load submissions");
      const result = await res.json();
      setSubmissions(
        Array.isArray(result) ? result : result.submissions ?? []
      );
    } catch {
      setSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  }, [flowId]);

  useEffect(() => {
    if (mainTab === "antworten") fetchSubmissions();
  }, [mainTab, fetchSubmissions]);

  /* -- Helpers -- */
  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCSV() {
    if (submissions.length === 0) return;
    const allKeys = new Set<string>();
    submissions.forEach((s) => {
      if (s.answers) Object.keys(s.answers).forEach((k) => allKeys.add(k));
    });
    const answerKeys = Array.from(allKeys).sort();
    const headers = [
      "ID",
      "Status",
      "Gestartet",
      "Abgeschlossen",
      ...answerKeys,
    ];
    const rows = submissions.map((s) => [
      s.id,
      s.status,
      s.startedAt ?? "",
      s.completedAt ?? "",
      ...answerKeys.map((k) => String(s.answers?.[k] ?? "")),
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submissions-${flowId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* -- Derived data -- */
  const totalDeviceVisits = data
    ? data.deviceStats.desktop + data.deviceStats.mobile + data.deviceStats.tablet
    : 0;

  const devicePercentages = useMemo(() => {
    if (!data || totalDeviceVisits === 0)
      return { desktop: 0, mobile: 0, tablet: 0 };
    return {
      desktop: Math.round(
        (data.deviceStats.desktop / totalDeviceVisits) * 100
      ),
      mobile: Math.round(
        (data.deviceStats.mobile / totalDeviceVisits) * 100
      ),
      tablet: Math.round(
        (data.deviceStats.tablet / totalDeviceVisits) * 100
      ),
    };
  }, [data, totalDeviceVisits]);

  // Generate heatmap data (mock distribution based on available data)
  const heatmapData = useMemo(() => {
    const grid: number[][] = [];
    for (let d = 0; d < 7; d++) {
      const row: number[] = [];
      for (let h = 0; h < 24; h++) {
        // Create a plausible distribution — higher during business hours
        const intensity =
          h >= 8 && h <= 18
            ? Math.random() * 0.8 + 0.2
            : Math.random() * 0.3;
        row.push(intensity);
      }
      grid.push(row);
    }
    return grid;
  }, []);

  const chartDataKey =
    chartMetric === "avgDuration" ? "submissions" : chartMetric;
  const chartColor =
    chartMetric === "visits"
      ? "#4C5FD5"
      : chartMetric === "submissions"
      ? "#10b981"
      : "#f59e0b";

  /* -- Date range label -- */
  const dateRangeLabel = useMemo(() => {
    const now = new Date();
    const from = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);
    return `${from.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })} - ${now.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
  }, [range]);

  /* ---------- Render ---------- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-7rem)]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#4C5FD5] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Lade Ergebnisse...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-7rem)]">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">Fehler</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="text-sm text-[#4C5FD5] hover:underline"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Top Tab Bar */}
      <div className="flex gap-0 border-b border-gray-200 px-6 bg-white">
        <button
          onClick={() => setMainTab("analytics")}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
            mainTab === "analytics"
              ? "text-[#4C5FD5] border-[#4C5FD5]"
              : "text-gray-500 border-transparent hover:text-gray-700"
          }`}
        >
          Analytics
        </button>
        <button
          onClick={() => setMainTab("antworten")}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
            mainTab === "antworten"
              ? "text-[#4C5FD5] border-[#4C5FD5]"
              : "text-gray-500 border-transparent hover:text-gray-700"
          }`}
        >
          Antworten
        </button>
        <button
          onClick={() => setMainTab("performance")}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
            mainTab === "performance"
              ? "text-[#4C5FD5] border-[#4C5FD5]"
              : "text-gray-500 border-transparent hover:text-gray-700"
          }`}
        >
          Performance
        </button>
      </div>

      {/* Analytics Tab */}
      {mainTab === "analytics" && data && (
        <div className="p-6 space-y-6">
          {/* Filter Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{dateRangeLabel}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
                {showDatePicker && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
                    {[7, 14, 30, 90].map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          setRange(d);
                          setShowDatePicker(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${
                          range === d
                            ? "text-[#4C5FD5] font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        Letzte {d} Tage
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700">
                Geräte
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700">
                UTM-Parameters
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>
            </div>

            <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
              <RotateCcw className="w-3 h-3" />
              Analysedaten zurücksetzen
            </button>
          </div>

          {/* KPI Row */}
          <div className="flex gap-4">
            <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 font-medium">Besuche</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.visits}
              </p>
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 font-medium">Antworten</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.submissions}
              </p>
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 font-medium">Antwortzeit</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.avgDuration > 0
                  ? `${Math.round(data.avgDuration)}s`
                  : "--"}
              </p>
            </div>
            <div className="w-48 bg-[#4C5FD5] rounded-lg p-4 text-white flex flex-col justify-center">
              <p className="text-xs font-medium opacity-80">Conversion Rate</p>
              <p className="text-3xl font-bold mt-1">
                {data.completionRate}%
              </p>
            </div>
          </div>

          {/* Chart Sub-nav */}
          <div className="flex gap-0 border-b border-gray-200">
            {(
              [
                { key: "visits", label: "Besuche" },
                { key: "submissions", label: "Antworten" },
                { key: "avgDuration", label: "Antwortzeit" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setChartMetric(tab.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  chartMetric === tab.key
                    ? "text-[#4C5FD5] border-[#4C5FD5]"
                    : "text-gray-500 border-transparent hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button className="px-4 py-2 text-sm font-medium text-gray-400 border-b-2 border-transparent cursor-not-allowed">
              A/B Test
            </button>
          </div>

          {/* Time Series Chart */}
          {data.dailyStats.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.dailyStats}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    labelFormatter={(label) => formatDate(label as string)}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Bar
                    dataKey={chartDataKey}
                    name={
                      chartMetric === "visits"
                        ? "Besuche"
                        : chartMetric === "submissions"
                        ? "Antworten"
                        : "Antwortzeit"
                    }
                    fill={chartColor}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-sm text-gray-500">
                Noch keine Daten für den ausgewählten Zeitraum.
              </p>
            </div>
          )}

          {/* Pages table + Side panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pages Table */}
            <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Seiten</h2>
              </div>
              {data.stepStats.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                      <th className="px-6 py-3 font-medium">Seiten</th>
                      <th className="px-6 py-3 font-medium text-right">
                        Seitenaufrufe
                      </th>
                      <th className="px-6 py-3 font-medium text-right">
                        Ausstiege
                      </th>
                      <th className="px-6 py-3 font-medium text-right">
                        Ausstiegsrate
                      </th>
                      <th className="px-6 py-3 font-medium text-right">
                        Verweildauer
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.stepStats.map((step) => (
                      <tr key={step.stepId} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {step.label}
                        </td>
                        <td className="px-6 py-3 text-right text-gray-600">
                          {step.views}
                        </td>
                        <td className="px-6 py-3 text-right text-gray-600">
                          {step.exits}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              step.exitRate > 50
                                ? "bg-red-100 text-red-700"
                                : step.exitRate > 25
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {step.exitRate}%
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-gray-600">
                          --
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-6 py-8 text-center text-sm text-gray-400">
                  Keine Seitendaten vorhanden.
                </div>
              )}
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              {/* Besuche nach Gerät */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Besuche nach Gerät
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Monitor className="w-4 h-4" />
                      Desktop
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {devicePercentages.desktop}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-[#4C5FD5] h-1.5 rounded-full transition-all"
                      style={{ width: `${devicePercentages.desktop}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Smartphone className="w-4 h-4" />
                      Mobil
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {devicePercentages.mobile}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-amber-400 h-1.5 rounded-full transition-all"
                      style={{ width: `${devicePercentages.mobile}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Tablet className="w-4 h-4" />
                      Tablet
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {devicePercentages.tablet}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-emerald-400 h-1.5 rounded-full transition-all"
                      style={{ width: `${devicePercentages.tablet}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Besuche nach Tageszeit */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Besuche nach Tageszeit
                </h3>
                <div className="overflow-x-auto">
                  <div className="min-w-[260px]">
                    {/* Hour labels */}
                    <div className="flex mb-1">
                      <div className="w-7 shrink-0" />
                      {HOURS.filter((h) => h % 4 === 0).map((h) => (
                        <div
                          key={h}
                          className="text-[9px] text-gray-400 text-center"
                          style={{ width: `${(4 / 24) * 100}%` }}
                        >
                          {h}:00
                        </div>
                      ))}
                    </div>
                    {/* Grid */}
                    {DAYS_OF_WEEK.map((day, di) => (
                      <div key={day} className="flex items-center gap-0 mb-0.5">
                        <div className="w-7 shrink-0 text-[10px] text-gray-400 font-medium">
                          {day}
                        </div>
                        <div className="flex-1 flex gap-[1px]">
                          {HOURS.map((h) => {
                            const val = heatmapData[di]?.[h] ?? 0;
                            const opacity = Math.max(0.08, val);
                            return (
                              <div
                                key={h}
                                className="flex-1 h-3 rounded-[2px]"
                                style={{
                                  backgroundColor: `rgba(76, 95, 213, ${opacity})`,
                                }}
                                title={`${day} ${h}:00 — ${Math.round(val * 100)}%`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Empty state */}
          {data.visits === 0 &&
            data.submissions === 0 &&
            data.dailyStats.length === 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <p className="text-gray-500 text-sm">
                  Noch keine Analytics-Daten vorhanden. Sobald Besucher den Flow
                  nutzen, erscheinen hier Statistiken.
                </p>
              </div>
            )}
        </div>
      )}

      {/* Performance Tab */}
      {mainTab === "performance" && (
        <div className="p-6">
          <PerformancePanel flowId={flowId} />
        </div>
      )}

      {/* Antworten Tab */}
      {mainTab === "antworten" && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Antworten ({submissions.length})
            </h2>
            <button
              onClick={exportCSV}
              disabled={submissions.length === 0}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              CSV Export
            </button>
          </div>

          {submissionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-4 border-[#4C5FD5] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500 text-sm">
                Noch keine Antworten vorhanden.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs uppercase tracking-wide bg-gray-50">
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Gestartet</th>
                    <th className="px-4 py-3 font-medium">Abgeschlossen</th>
                    <th className="px-4 py-3 font-medium">Dauer</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Antworten
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submissions.map((sub) => (
                    <>
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">
                          {sub.id.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              sub.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : sub.status === "in_progress"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {sub.status === "completed"
                              ? "Abgeschlossen"
                              : sub.status === "in_progress"
                              ? "In Bearbeitung"
                              : sub.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {formatDateTime(sub.startedAt)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {formatDateTime(sub.completedAt)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {formatDuration(sub.startedAt, sub.completedAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => toggleRow(sub.id)}
                            className="text-xs text-[#4C5FD5] hover:text-[#3d4eb8] font-medium"
                          >
                            {expandedRows.has(sub.id)
                              ? "Zuklappen"
                              : "Details"}
                          </button>
                        </td>
                      </tr>
                      {expandedRows.has(sub.id) && (
                        <tr key={`${sub.id}-details`}>
                          <td colSpan={6} className="px-4 py-3 bg-gray-50">
                            {sub.answers &&
                            Object.keys(sub.answers).length > 0 ? (
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(sub.answers).map(
                                  ([key, value]) => {
                                    const isFileList =
                                      Array.isArray(value) &&
                                      value.length > 0 &&
                                      typeof value[0] === "object" &&
                                      value[0] !== null &&
                                      "url" in (value[0] as Record<string, unknown>);
                                    return (
                                      <div key={key} className="flex gap-2">
                                        <span className="font-medium text-gray-500 min-w-[120px]">
                                          {key}:
                                        </span>
                                        <span className="text-gray-800">
                                          {isFileList ? (
                                            <span className="flex flex-col gap-0.5">
                                              {(value as Array<{ url: string; name: string; size?: number }>).map(
                                                (f, i) => (
                                                  <a
                                                    key={i}
                                                    href={f.url}
                                                    target="_blank"
                                                    rel="noopener"
                                                    className="text-indigo-600 hover:underline"
                                                  >
                                                    {f.name}
                                                    {typeof f.size === "number"
                                                      ? ` (${
                                                          f.size < 1024
                                                            ? `${f.size} B`
                                                            : f.size < 1024 * 1024
                                                            ? `${(f.size / 1024).toFixed(1)} KB`
                                                            : `${(f.size / 1024 / 1024).toFixed(1)} MB`
                                                        })`
                                                      : ""}
                                                  </a>
                                                )
                                              )}
                                            </span>
                                          ) : (
                                            String(value)
                                          )}
                                        </span>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">
                                Keine Antworten vorhanden.
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

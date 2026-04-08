"use client";

import { useState, useCallback, useRef } from "react";

const COUNTRIES = [
  { code: "MT", name: "Malta", flag: "\u{1F1F2}\u{1F1F9}", smes: 28000 },
  { code: "LU", name: "Luxembourg", flag: "\u{1F1F1}\u{1F1FA}", smes: 32000 },
  { code: "CY", name: "Cyprus", flag: "\u{1F1E8}\u{1F1FE}", smes: 52000 },
  { code: "EE", name: "Estonia", flag: "\u{1F1EA}\u{1F1EA}", smes: 83000 },
  { code: "LV", name: "Latvia", flag: "\u{1F1F1}\u{1F1FB}", smes: 93000 },
  { code: "SI", name: "Slovenia", flag: "\u{1F1F8}\u{1F1EE}", smes: 143000 },
  { code: "LT", name: "Lithuania", flag: "\u{1F1F1}\u{1F1F9}", smes: 86000 },
  { code: "HR", name: "Croatia", flag: "\u{1F1ED}\u{1F1F7}", smes: 150000 },
  { code: "BG", name: "Bulgaria", flag: "\u{1F1E7}\u{1F1EC}", smes: 347000 },
  { code: "DK", name: "Denmark", flag: "\u{1F1E9}\u{1F1F0}", smes: 296000 },
  { code: "FI", name: "Finland", flag: "\u{1F1EB}\u{1F1EE}", smes: 283000 },
  { code: "IE", name: "Ireland", flag: "\u{1F1EE}\u{1F1EA}", smes: 284000 },
  { code: "SK", name: "Slovakia", flag: "\u{1F1F8}\u{1F1F0}", smes: 416000 },
  { code: "AT", name: "Austria", flag: "\u{1F1E6}\u{1F1F9}", smes: 354000 },
  { code: "HU", name: "Hungary", flag: "\u{1F1ED}\u{1F1FA}", smes: 577000 },
  { code: "CH", name: "Switzerland", flag: "\u{1F1E8}\u{1F1ED}", smes: 604000 },
  { code: "PT", name: "Portugal", flag: "\u{1F1F5}\u{1F1F9}", smes: 845000 },
  { code: "RO", name: "Romania", flag: "\u{1F1F7}\u{1F1F4}", smes: 536000 },
  { code: "GR", name: "Greece", flag: "\u{1F1EC}\u{1F1F7}", smes: 714000 },
  { code: "SE", name: "Sweden", flag: "\u{1F1F8}\u{1F1EA}", smes: 741000 },
  { code: "CZ", name: "Czechia", flag: "\u{1F1E8}\u{1F1FF}", smes: 1084000 },
  { code: "BE", name: "Belgium", flag: "\u{1F1E7}\u{1F1EA}", smes: 591000 },
  { code: "NL", name: "Netherlands", flag: "\u{1F1F3}\u{1F1F1}", smes: 1185000 },
  { code: "PL", name: "Poland", flag: "\u{1F1F5}\u{1F1F1}", smes: 2083000 },
  { code: "ES", name: "Spain", flag: "\u{1F1EA}\u{1F1F8}", smes: 2863000 },
  { code: "IT", name: "Italy", flag: "\u{1F1EE}\u{1F1F9}", smes: 3718000 },
  { code: "FR", name: "France", flag: "\u{1F1EB}\u{1F1F7}", smes: 3067000 },
  { code: "DE", name: "Germany", flag: "\u{1F1E9}\u{1F1EA}", smes: 3148000 },
];

type Status = "not_started" | "running" | "completed" | "failed" | "paused";

interface CountryProgress {
  status: Status;
  totalPLZ: number;
  completedPLZ: number;
  companiesFound: number;
  newCompanies: number;
  errors: number;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function Badge({ status }: { status: Status }) {
  const s: Record<Status, string> = {
    not_started: "bg-gray-100 text-gray-600",
    running: "bg-blue-100 text-blue-700 animate-pulse",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    paused: "bg-yellow-100 text-yellow-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s[status]}`}>{status.replace("_", " ")}</span>;
}

export default function ResearchPage() {
  const [progress, setProgress] = useState<Record<string, CountryProgress>>({});
  const [active, setActive] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const totalFound = Object.values(progress).reduce((s, p) => s + p.companiesFound, 0);
  const done = Object.values(progress).filter((p) => p.status === "completed").length;

  const start = useCallback(async (code: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setActive(code);
    setProgress((p) => ({ ...p, [code]: { status: "running", totalPLZ: 0, completedPLZ: 0, companiesFound: 0, newCompanies: 0, errors: 0 } }));

    try {
      const res = await fetch("/api/market-map/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "research", countryCode: code }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      setProgress((p) => ({
        ...p,
        [code]: {
          status: data.summary?.status ?? "completed",
          totalPLZ: data.summary?.totalPLZ ?? 0,
          completedPLZ: data.summary?.completedPLZ ?? 0,
          companiesFound: data.summary?.totalCompaniesFound ?? 0,
          newCompanies: data.summary?.newCompanies ?? 0,
          errors: data.summary?.errors ?? 0,
        },
      }));
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setProgress((p) => ({ ...p, [code]: { ...p[code], status: "failed" } }));
      }
    }
    setActive(null);
  }, []);

  const pause = useCallback(() => {
    abortRef.current?.abort();
    if (active) setProgress((p) => ({ ...p, [active]: { ...p[active], status: "paused" } }));
    setActive(null);
  }, [active]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">SME Research Dashboard</h1>
          <p className="text-gray-500 mt-1">Discover and register SMEs across 28 countries — smallest to largest</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Countries", value: `${done}/28` },
            { label: "Companies Found", value: fmt(totalFound) },
            { label: "Active", value: active ?? "\u2014" },
            { label: "Errors", value: Object.values(progress).reduce((s, p) => s + p.errors, 0) },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-gray-500 text-sm">{s.label}</div>
              <div className="text-2xl font-bold mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Country List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-700">Countries — Smallest to Largest</h2>
          </div>
          <div className="divide-y">
            {COUNTRIES.map((c) => {
              const p = progress[c.code];
              const pct = p && p.totalPLZ > 0 ? Math.round((p.completedPLZ / p.totalPLZ) * 100) : 0;
              return (
                <div key={c.code} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50">
                  <span className="text-2xl">{c.flag}</span>
                  <div className="w-40">
                    <div className="font-medium text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-400">{fmt(c.smes)} SMEs</div>
                  </div>
                  <Badge status={p?.status ?? "not_started"} />
                  <div className="flex-1 mx-4">
                    {p && p.totalPLZ > 0 ? (
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{p.completedPLZ}/{p.totalPLZ} PLZ</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ) : (
                      <div className="h-2 bg-gray-100 rounded-full" />
                    )}
                  </div>
                  <div className="w-24 text-right">
                    {p ? (
                      <div>
                        <div className="font-medium">{p.companiesFound}</div>
                        <div className="text-xs text-gray-400">found</div>
                      </div>
                    ) : <span className="text-gray-300">{"\u2014"}</span>}
                  </div>
                  <div className="w-24 flex justify-end">
                    {active === c.code ? (
                      <button onClick={pause} className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200">Pause</button>
                    ) : p?.status === "completed" ? (
                      <button onClick={() => start(c.code)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200">Retry</button>
                    ) : (
                      <button onClick={() => start(c.code)} disabled={!!active} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">Start</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

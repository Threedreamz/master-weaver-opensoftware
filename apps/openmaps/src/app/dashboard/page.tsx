"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import Link from "next/link";
import {
  BarChart3,
  PieChart as PieChartIcon,
  Globe2,
  Users,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

/* ---------- types ---------- */
interface TopCountry {
  code: string;
  name: string;
  score: number;
  smes: number;
  gdpEur?: number;
  region?: string;
  population?: number;
  smeEmployees?: number;
}

interface RegionData {
  count: number;
  smes: number;
  score: number;
}

interface StatsResponse {
  totalCountries: number;
  totalSMEs: number;
  totalEmployees: number;
  totalGDP: number;
  avgMarketScore: number;
  topCountries: TopCountry[];
  byRegion: Record<string, RegionData>;
}

/* ---------- constants ---------- */
const REGION_COLORS: Record<string, string> = {
  Western: "#3b82f6",
  Eastern: "#f59e0b",
  Nordic: "#06b6d4",
  Southern: "#ef4444",
};

/* ---------- helpers ---------- */
function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function countryFlag(code: string): string {
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)),
  );
}

function scoreColorClass(score: number): string {
  if (score >= 75) return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400";
  if (score >= 50) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400";
}

/* ---------- KPI card ---------- */
function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm">
      <span className="text-zinc-400">{icon}</span>
      <div>
        <div className="text-xs text-zinc-500">{label}</div>
        <div className="text-lg font-bold text-white">{value}</div>
      </div>
    </div>
  );
}

/* ---------- page ---------- */
export default function MarketMapDashboardPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market-map/stats")
      .then((r) => r.json())
      .then((d: StatsResponse) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-950">
        <div className="text-zinc-400 animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-950">
        <div className="text-red-400">Failed to load market data.</div>
      </div>
    );
  }

  /* Prepare chart data */
  const topByScore = [...data.topCountries]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const topBySmes = [...data.topCountries]
    .sort((a, b) => b.smes - a.smes)
    .slice(0, 10);

  const regionPieData = Object.entries(data.byRegion).map(([region, rd]) => ({
    name: region,
    value: rd.smes,
    score: rd.score,
  }));

  return (
    <div className="h-full overflow-y-auto bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        {/* ---- Header ---- */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Market Dashboard
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              EU SME market overview across {data.totalCountries} countries
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NavLink href="/" label="Market Map" />
            <NavLink href="/leads" label="Leads" />
          </div>
        </div>

        {/* ---- KPI cards ---- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={<Globe2 className="w-5 h-5" />}
            label="Total Countries"
            value={data.totalCountries}
          />
          <KpiCard
            icon={<Users className="w-5 h-5" />}
            label="Total SMEs"
            value={formatNumber(data.totalSMEs)}
          />
          <KpiCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Avg Market Score"
            value={data.avgMarketScore}
          />
          <KpiCard
            icon={<Users className="w-5 h-5" />}
            label="Total Employees"
            value={formatNumber(data.totalEmployees)}
          />
        </div>

        {/* ---- Charts row ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Top 10 by market score (horizontal bars) */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Top 10 Countries by Market Score
            </h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={topByScore}
                layout="vertical"
                margin={{ top: 0, right: 20, bottom: 0, left: 60 }}
              >
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}`, "Score"]}
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="score" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2: SMEs by region (pie) */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-blue-500" />
              SMEs by Region
            </h2>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={regionPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={60}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {regionPieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={REGION_COLORS[entry.name] ?? "#6b7280"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [formatNumber(value), "SMEs"]}
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: SME count by country (top 10) */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            SME Count by Country (Top 10)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={topBySmes}
              margin={{ top: 0, right: 20, bottom: 0, left: 20 }}
            >
              <XAxis dataKey="code" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v: number) => formatNumber(v)}
              />
              <Tooltip
                formatter={(value: number) => [formatNumber(value), "SMEs"]}
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Bar dataKey="smes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 4: Stats table — all 27 countries */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-blue-500" />
              All {data.totalCountries} EU Countries
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-800/50 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Country</th>
                  <th className="px-5 py-3 text-right">SMEs</th>
                  <th className="px-5 py-3 text-right">GDP (EUR bn)</th>
                  <th className="px-5 py-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.topCountries
                  .sort((a, b) => b.score - a.score)
                  .map((c) => (
                    <tr
                      key={c.code}
                      className="hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-5 py-3 flex items-center gap-2 text-white font-medium">
                        <span className="text-lg">{countryFlag(c.code)}</span>
                        {c.name}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-400">
                        {formatNumber(c.smes)}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-400">
                        {c.gdpEur != null ? c.gdpEur.toLocaleString() : "\u2014"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${scoreColorClass(c.score)}`}
                        >
                          {c.score}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- nav link ---------- */
function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 transition-colors"
    >
      {label}
      <ArrowRight className="w-3 h-3" />
    </Link>
  );
}

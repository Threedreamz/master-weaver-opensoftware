"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@opensoftware/ui";
import { Users, Wallet, TrendingUp, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getDashboardStats, getMonthlyPayrollSummary, type DashboardStats, type MonthlyPayrollSummary } from "./actions";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

function KpiCard({ title, value, icon, color }: KpiCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<MonthlyPayrollSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, c] = await Promise.all([
          getDashboardStats(),
          getMonthlyPayrollSummary(),
        ]);
        setStats(s);
        setChartData(c);
      } catch {
        // Ignore errors on initial load (empty DB)
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Payroll overview and key metrics"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard
          title="Aktive Mitarbeiter"
          value={String(stats?.activeEmployees ?? 0)}
          icon={<Users className="w-6 h-6 text-white" />}
          color="bg-indigo-500"
        />
        <KpiCard
          title="Monatliche Lohnsumme"
          value={formatCurrency(stats?.monthlyTotal ?? 0)}
          icon={<Wallet className="w-6 h-6 text-white" />}
          color="bg-purple-500"
        />
        <KpiCard
          title="Durchschnittliches Gehalt"
          value={formatCurrency(stats?.avgSalary ?? 0)}
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          color="bg-violet-500"
        />
        <KpiCard
          title="Naechste Abrechnung"
          value={stats?.nextPayrollDate ?? "-"}
          icon={<Calendar className="w-6 h-6 text-white" />}
          color="bg-fuchsia-500"
        />
      </div>

      {/* Bar Chart — Last 6 Months Payroll */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Lohnsumme der letzten 6 Monate
        </h3>
        {chartData.every((d) => d.total === 0) ? (
          <div className="text-center py-12 text-gray-400">
            Noch keine Abrechnungsdaten vorhanden. Berechnen Sie die erste Lohnabrechnung.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v: number) =>
                  new Intl.NumberFormat("de-DE", { notation: "compact", currency: "EUR", style: "currency" }).format(v)
                }
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value)), "Lohnsumme"]}
                contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }}
              />
              <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}

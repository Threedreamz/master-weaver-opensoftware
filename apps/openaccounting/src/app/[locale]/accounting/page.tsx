"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@opensoftware/ui";
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  ArrowLeftRight,
  FolderOpen,
  Bell,
  CalendarClock,
  Loader2,
} from "lucide-react";
import { getDashboardStats, getRevenueChart, getRecentBookings } from "./actions";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardStats {
  revenue: number;
  openInvoices: number;
  unmatchedTransactions: number;
  documentsToProcess: number;
  openReminders: number;
  upcomingDueDates: number;
}

interface RevenueData {
  month: string;
  label: string;
  revenue: number;
}

interface BookingEntry {
  id: number;
  datum: string;
  betrag: number;
  sollHaben: string;
  konto: string;
  gegenkonto: string;
  buchungstext: string;
  status: string | null;
  createdAt: string | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<RevenueData[]>([]);
  const [recentBookings, setRecentBookings] = useState<BookingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardStats(), getRevenueChart(), getRecentBookings()]).then(
      ([s, c, b]) => {
        setStats(s);
        setChartData(c);
        setRecentBookings(b as BookingEntry[]);
        setLoading(false);
      }
    );
  }, []);

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" description="Financial overview and key metrics" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      </>
    );
  }

  const kpiCards = [
    {
      label: "Revenue (this month)",
      value: formatCurrency(stats?.revenue ?? 0),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      label: "Open Invoices",
      value: String(stats?.openInvoices ?? 0),
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Unmatched Transactions",
      value: String(stats?.unmatchedTransactions ?? 0),
      icon: ArrowLeftRight,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
    {
      label: "Documents to Process",
      value: String(stats?.documentsToProcess ?? 0),
      icon: FolderOpen,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950",
    },
    {
      label: "Open Reminders",
      value: String(stats?.openReminders ?? 0),
      icon: Bell,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950",
    },
    {
      label: "Upcoming Due Dates",
      value: String(stats?.upcomingDueDates ?? 0),
      icon: CalendarClock,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950",
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Financial overview and key metrics"
        actions={
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <LayoutDashboard className="w-4 h-4" />
            <span>OpenAccounting</span>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPI Cards - 2 rows of 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {card.label}
                </span>
                <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            Monthly Revenue (Last 6 Months)
          </h2>
          {chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    axisLine={{ stroke: "#d1d5db" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    axisLine={{ stroke: "#d1d5db" }}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat("de-DE", {
                        notation: "compact",
                        compactDisplay: "short",
                      }).format(v)
                    }
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">
              No revenue data yet. Paid invoices will appear here.
            </p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Recent Booking Entries
            </h2>
          </div>
          {recentBookings.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentBookings.map((entry) => (
                <div key={entry.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        entry.sollHaben === "S"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      }`}
                    >
                      {entry.sollHaben}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {entry.buchungstext}
                      </p>
                      <p className="text-xs text-gray-500">
                        {entry.konto} / {entry.gegenkonto} &middot; {entry.datum}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-mono font-medium ${
                      entry.sollHaben === "S"
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {formatCurrency(entry.betrag)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-6 text-sm text-gray-500 text-center">
              No booking entries yet. Create bookings to see recent activity.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

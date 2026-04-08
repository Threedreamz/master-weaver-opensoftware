"use client";

import { PageHeader } from "@opensoftware/ui";
import { Package, AlertTriangle, ShoppingCart, PackageCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getDashboardStats, type DashboardStats } from "./actions";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function KpiCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" description="Bestandsuebersicht und Kennzahlen" />
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-gray-500">Laden...</div>
        </div>
      </>
    );
  }

  const data = stats ?? {
    totalArticles: 0,
    lowStockAlerts: 0,
    openOrders: 0,
    pendingGoodsReceipt: 0,
    stockByCategory: [],
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Bestandsuebersicht und Kennzahlen"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="Artikel gesamt"
          value={data.totalArticles}
          icon={<Package className="w-6 h-6 text-white" />}
          color="bg-amber-500"
        />
        <KpiCard
          title="Mindestbestand unterschritten"
          value={data.lowStockAlerts}
          icon={<AlertTriangle className="w-6 h-6 text-white" />}
          color={data.lowStockAlerts > 0 ? "bg-red-500" : "bg-gray-400"}
        />
        <KpiCard
          title="Offene Bestellungen"
          value={data.openOrders}
          icon={<ShoppingCart className="w-6 h-6 text-white" />}
          color="bg-blue-500"
        />
        <KpiCard
          title="Wareneingang offen"
          value={data.pendingGoodsReceipt}
          icon={<PackageCheck className="w-6 h-6 text-white" />}
          color="bg-purple-500"
        />
      </div>

      {/* Stock Value by Category Chart */}
      {data.stockByCategory.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Lagerwert nach Kategorie
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.stockByCategory}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="category"
                  className="text-xs"
                  tick={{ fill: "#9ca3af" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "#9ca3af" }}
                  tickFormatter={(v) => `${v.toLocaleString("de-DE")} EUR`}
                />
                <Tooltip
                  formatter={(value) => [`${Number(value).toLocaleString("de-DE")} EUR`, "Lagerwert"]}
                  contentStyle={{
                    backgroundColor: "var(--color-gray-800, #1f2937)",
                    border: "1px solid var(--color-gray-700, #374151)",
                    borderRadius: "0.5rem",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Noch keine Daten</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Beginnen Sie mit dem Anlegen von Artikeln, Lieferanten und Bestellungen.
          </p>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@opensoftware/ui";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { getGuvData, type GuvData } from "./actions";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function GuvPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<GuvData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getGuvData(year, month);
    setData(result);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      <PageHeader
        title="GuV"
        description="Gewinn- und Verlustrechnung - Profit & Loss Statement"
      />

      <div className="p-6 space-y-6">
        {/* Period Selector */}
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              >
                {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map(
                  (y) => (
                    <option key={y} value={y}>{y}</option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleString("en", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : data && data.lines.length > 0 ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Total Revenue</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(data.totalErtraege)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Total Expenses</span>
                  <TrendingDown className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(data.totalAufwendungen)}
                </p>
              </div>
              <div
                className={`rounded-lg border p-5 ${
                  data.gewinnVerlust >= 0
                    ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800"
                    : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    {data.gewinnVerlust >= 0 ? "Profit" : "Loss"}
                  </span>
                  {data.gewinnVerlust >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <p
                  className={`text-2xl font-bold ${
                    data.gewinnVerlust >= 0
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {formatCurrency(data.gewinnVerlust)}
                </p>
              </div>
            </div>

            {/* Detail Table */}
            <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  GuV Detail - {data.period}
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">
                      Position
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 w-40">
                      Amount (EUR)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((line, i) => {
                    if (line.isSeparator && !line.label) {
                      return (
                        <tr key={i} className="border-b-2 border-gray-200 dark:border-gray-700">
                          <td colSpan={2} className="py-1" />
                        </tr>
                      );
                    }
                    if (line.isSeparator && line.label) {
                      return (
                        <tr key={i} className="bg-gray-50 dark:bg-gray-900">
                          <td
                            colSpan={2}
                            className="py-2 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500"
                          >
                            {line.label}
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr
                        key={i}
                        className={`border-b border-gray-100 dark:border-gray-800 ${
                          line.isTotal ? "bg-gray-50 dark:bg-gray-900 font-semibold" : ""
                        }`}
                      >
                        <td
                          className="py-3 px-4 text-gray-900 dark:text-white"
                          style={{
                            paddingLeft: line.indent
                              ? `${line.indent * 1.5 + 1}rem`
                              : undefined,
                          }}
                        >
                          {line.label}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono ${
                            line.amount < 0
                              ? "text-red-600 dark:text-red-400"
                              : line.amount > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-gray-500"
                          }`}
                        >
                          {formatCurrency(line.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-gray-500">
            No data for this period. Add bookings to generate the P&L statement.
          </div>
        )}
      </div>
    </>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@opensoftware/ui";
import { BarChart3, Download, Loader2 } from "lucide-react";
import { getBwaData, type BwaData } from "./actions";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function BwaPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<BwaData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getBwaData(year, month);
    setData(result);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportCsv = () => {
    if (!data) return;
    const rows = data.lines
      .filter((l) => !l.isSeparator)
      .map((l) => `"${l.label}","${l.amount.toFixed(2)}"`);
    const csv = `"Position","Betrag (EUR)"\n${rows.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BWA_${data.period.replace("/", "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="BWA"
        description="Betriebswirtschaftliche Auswertung - Monthly business performance analysis"
        actions={
          data && data.lines.length > 0 ? (
            <button
              onClick={handleExportCsv}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          ) : undefined
        }
      />

      <div className="p-6 space-y-6">
        {/* Period Selector */}
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Year
              </label>
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
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Month
              </label>
              <div className="flex flex-wrap gap-1">
                {MONTH_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setMonth(i + 1)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                      month === i + 1
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                        : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
                    }`}
                  >
                    {label.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* BWA Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : data && data.lines.length > 0 ? (
          <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                BWA - {data.period}
              </h3>
            </div>
            <div className="overflow-x-auto">
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
                    if (line.isSeparator) {
                      return (
                        <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                          <td colSpan={2} className="py-1" />
                        </tr>
                      );
                    }
                    return (
                      <tr
                        key={i}
                        className={`border-b border-gray-100 dark:border-gray-800 ${
                          line.isTotal
                            ? "bg-gray-50 dark:bg-gray-900 font-semibold"
                            : ""
                        }`}
                      >
                        <td
                          className="py-3 px-4 text-gray-900 dark:text-white"
                          style={{ paddingLeft: line.indent ? `${line.indent * 1.5 + 1}rem` : undefined }}
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
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            No booking entries found for this period. Add bookings to generate the BWA.
          </div>
        )}
      </div>
    </>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@opensoftware/ui";
import { Calculator, Loader2, Download } from "lucide-react";
import { getSusaData, type SusaData, type SusaLine } from "./actions";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function SusaPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<SusaData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getSusaData(year, month);
    setData(result);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportCsv = () => {
    if (!data) return;
    const header = `"Konto","Bezeichnung","Soll","Haben","Saldo"`;
    const rows = data.lines.map(
      (l) =>
        `"${l.konto}","${l.bezeichnung}","${l.sollTotal.toFixed(2)}","${l.habenTotal.toFixed(2)}","${l.saldo.toFixed(2)}"`
    );
    const csv = `${header}\n${rows.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SUSA_${data.period.replace("/", "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="SUSA"
        description="Summen- und Saldenliste - Account totals and balances"
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
          <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                SUSA - {data.period}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 w-24">
                      Konto
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">
                      Bezeichnung
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 w-36">
                      Soll
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 w-36">
                      Haben
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 w-36">
                      Saldo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((line) => (
                    <tr
                      key={line.konto}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-400">
                        {line.konto}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {line.bezeichnung}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatCurrency(line.sollTotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatCurrency(line.habenTotal)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-medium ${
                          line.saldo > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : line.saldo < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-500"
                        }`}
                      >
                        {formatCurrency(line.saldo)}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-gray-50 dark:bg-gray-900 font-semibold border-t-2 border-gray-300 dark:border-gray-600">
                    <td className="py-4 px-4" />
                    <td className="py-4 px-4 text-gray-900 dark:text-white">
                      Summe
                    </td>
                    <td className="py-4 px-4 text-right font-mono">
                      {formatCurrency(data.totalSoll)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono">
                      {formatCurrency(data.totalHaben)}
                    </td>
                    <td
                      className={`py-4 px-4 text-right font-mono ${
                        data.totalSoll - data.totalHaben !== 0
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(data.totalSoll - data.totalHaben)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Balance Check */}
            {data.totalSoll !== data.totalHaben && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950 border-t border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
                Soll and Haben totals do not balance. Difference:{" "}
                {formatCurrency(Math.abs(data.totalSoll - data.totalHaben))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            No data for this period. Add bookings to generate the SUSA report.
          </div>
        )}
      </div>
    </>
  );
}

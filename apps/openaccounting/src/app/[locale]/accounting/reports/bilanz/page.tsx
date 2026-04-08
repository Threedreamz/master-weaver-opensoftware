"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@opensoftware/ui";
import { Scale, Loader2 } from "lucide-react";
import { getBilanzData, type BilanzData, type BilanzItem } from "./actions";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function BilanzTable({
  title,
  items,
  colorClass,
}: {
  title: string;
  items: BilanzItem[];
  colorClass: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
      <div className={`p-4 border-b border-gray-200 dark:border-gray-800 ${colorClass}`}>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {items.map((item, i) => (
            <tr
              key={i}
              className={`border-b border-gray-100 dark:border-gray-800 ${
                item.isTotal ? "bg-gray-50 dark:bg-gray-900 font-semibold" : ""
              }`}
            >
              <td
                className="py-3 px-4 text-gray-900 dark:text-white"
                style={{
                  paddingLeft: item.indent ? `${item.indent * 1.5 + 1}rem` : undefined,
                }}
              >
                {item.label}
              </td>
              <td className="py-3 px-4 text-right font-mono w-40">
                {formatCurrency(item.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BilanzPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<BilanzData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getBilanzData(year, month);
    setData(result);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      <PageHeader
        title="Bilanz"
        description="Balance Sheet - Assets and liabilities overview"
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
        ) : data && (data.aktiva.length > 0 || data.passiva.length > 0) ? (
          <>
            {/* Balance check */}
            {data.totalAktiva !== data.totalPassiva && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                Balance difference: {formatCurrency(data.totalAktiva - data.totalPassiva)}.
                Aktiva and Passiva should be equal. Check your bookings.
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BilanzTable
                title="Aktiva (Assets)"
                items={data.aktiva}
                colorClass="text-blue-700 dark:text-blue-300"
              />
              <BilanzTable
                title="Passiva (Liabilities & Equity)"
                items={data.passiva}
                colorClass="text-purple-700 dark:text-purple-300"
              />
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-gray-500">
            No data for this period. Add bookings to generate the balance sheet.
          </div>
        )}
      </div>
    </>
  );
}

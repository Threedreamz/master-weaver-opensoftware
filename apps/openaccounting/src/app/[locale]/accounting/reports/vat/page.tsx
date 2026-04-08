"use client";

import { useState, useCallback, useEffect } from "react";
import { PageHeader } from "@opensoftware/ui";
import {
  FileText,
  FileCode2,
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Calculator,
} from "lucide-react";
import { SessionGuard } from "@/components/auth/SessionGuard";
import { getUStVAData, exportElsterXml, exportUStVASummary } from "./actions";
import type { UStVAData } from "@/lib/vat";

type PeriodMode = "monthly" | "quarterly";

function getPeriodRange(year: number, mode: PeriodMode, index: number) {
  if (mode === "quarterly") {
    const startMonth = (index - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const from = `${year}-${String(startMonth).padStart(2, "0")}-01`;
    const lastDay = new Date(year, endMonth, 0).getDate();
    const to = `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`;
    return { from, to };
  } else {
    const from = `${year}-${String(index).padStart(2, "0")}-01`;
    const lastDay = new Date(year, index, 0).getDate();
    const to = `${year}-${String(index).padStart(2, "0")}-${lastDay}`;
    return { from, to };
  }
}

const QUARTER_LABELS = ["Q1 (Jan-Mar)", "Q2 (Apr-Jun)", "Q3 (Jul-Sep)", "Q4 (Oct-Dec)"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function VatReturnPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [mode, setMode] = useState<PeriodMode>("quarterly");
  const [selectedIndex, setSelectedIndex] = useState(() =>
    Math.ceil((now.getMonth() + 1) / 3)
  );
  const [data, setData] = useState<UStVAData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"elster" | "summary" | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const period = getPeriodRange(year, mode, selectedIndex);
    const result = await getUStVAData(period);
    setData(result);
    setLoading(false);
  }, [year, mode, selectedIndex]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportElster = useCallback(async () => {
    setExporting("elster");
    const period = getPeriodRange(year, mode, selectedIndex);
    const result = await exportElsterXml(period);
    downloadFile(result.content, result.filename, "text/xml");
    setExporting(null);
  }, [year, mode, selectedIndex]);

  const handleExportSummary = useCallback(async () => {
    setExporting("summary");
    const period = getPeriodRange(year, mode, selectedIndex);
    const result = await exportUStVASummary(period);
    downloadFile(result.content, result.filename, "text/html");
    setExporting(null);
  }, [year, mode, selectedIndex]);

  return (
    <SessionGuard requiredRole="viewer">
      <PageHeader
        title="VAT Return (UStVA)"
        description="Umsatzsteuervoranmeldung - Prepare your VAT return"
        actions={
          data ? (
            <div className="flex gap-2">
              <button
                onClick={handleExportSummary}
                disabled={exporting !== null}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 flex items-center gap-2 disabled:opacity-50"
              >
                {exporting === "summary" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                PDF Summary
              </button>
              <button
                onClick={handleExportElster}
                disabled={exporting !== null}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
              >
                {exporting === "elster" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileCode2 className="w-4 h-4" />
                )}
                ELSTER XML
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="p-6 space-y-6">
        {/* Period Selector */}
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex flex-wrap items-end gap-6">
            {/* Year */}
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
                    <option key={y} value={y}>
                      {y}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Mode */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Period
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMode("monthly");
                    setSelectedIndex(now.getMonth() + 1);
                  }}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                    mode === "monthly"
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                      : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => {
                    setMode("quarterly");
                    setSelectedIndex(Math.ceil((now.getMonth() + 1) / 3));
                  }}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                    mode === "quarterly"
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                      : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  Quarterly
                </button>
              </div>
            </div>

            {/* Period Selection */}
            <div className="flex-1">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                {mode === "quarterly" ? "Quarter" : "Month"}
              </label>
              <div className="flex flex-wrap gap-2">
                {(mode === "quarterly" ? QUARTER_LABELS : MONTH_LABELS).map(
                  (label, i) => {
                    const idx = i + 1;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                          selectedIndex === idx
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
                        }`}
                      >
                        {mode === "quarterly"
                          ? label
                          : label.substring(0, 3)}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        )}

        {/* VAT Data */}
        {!loading && data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Output VAT</span>
                  <TrendingUp className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(data.steuer19 + data.steuer7)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  19%: {formatCurrency(data.steuer19)} | 7%:{" "}
                  {formatCurrency(data.steuer7)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Input Tax (Vorsteuer)</span>
                  <TrendingDown className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(data.vorsteuer)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Deductible VAT paid</p>
              </div>
              <div
                className={`rounded-lg border p-6 ${
                  data.verbleibendeUst > 0
                    ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                    : data.verbleibendeUst < 0
                      ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800"
                      : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    Kz 83: Remaining VAT
                  </span>
                  {data.verbleibendeUst > 0 ? (
                    <TrendingUp className="w-4 h-4 text-red-500" />
                  ) : data.verbleibendeUst < 0 ? (
                    <TrendingDown className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Minus className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <p
                  className={`text-2xl font-bold ${
                    data.verbleibendeUst > 0
                      ? "text-red-700 dark:text-red-300"
                      : data.verbleibendeUst < 0
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-gray-900 dark:text-white"
                  }`}
                >
                  {formatCurrency(data.verbleibendeUst)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.verbleibendeUst > 0
                    ? "Amount payable to tax office"
                    : data.verbleibendeUst < 0
                      ? "Refund from tax office"
                      : "No payment due"}
                </p>
              </div>
            </div>

            {/* Detailed Breakdown Table */}
            <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    UStVA Detail — {data.zeitraum}
                  </h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-500 w-20">
                        Kz
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">
                        Description
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 w-40">
                        Tax Base
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 w-40">
                        Tax Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Taxable Revenue 19% */}
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4 font-mono text-gray-600">81</td>
                      <td className="py-3 px-4">
                        Steuerpflichtige Umsaetze 19%
                        <br />
                        <span className="text-xs text-gray-500">
                          Taxable supplies at standard rate
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatCurrency(data.steuerpflichtigeUmsaetze19)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatCurrency(data.steuer19)}
                      </td>
                    </tr>

                    {/* Taxable Revenue 7% */}
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4 font-mono text-gray-600">86</td>
                      <td className="py-3 px-4">
                        Steuerpflichtige Umsaetze 7%
                        <br />
                        <span className="text-xs text-gray-500">
                          Taxable supplies at reduced rate
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatCurrency(data.steuerpflichtigeUmsaetze7)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatCurrency(data.steuer7)}
                      </td>
                    </tr>

                    {/* Tax-exempt Revenue */}
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4 font-mono text-gray-600">43</td>
                      <td className="py-3 px-4">
                        Steuerfreie Umsaetze
                        <br />
                        <span className="text-xs text-gray-500">
                          Tax-exempt supplies
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatCurrency(data.steuerfreieUmsaetze)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-400">
                        -
                      </td>
                    </tr>

                    {/* Intra-community Supplies */}
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4 font-mono text-gray-600">41</td>
                      <td className="py-3 px-4">
                        Innergemeinschaftliche Lieferungen
                        <br />
                        <span className="text-xs text-gray-500">
                          Intra-community supplies (EU)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatCurrency(data.innergemeinschaftlich)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-400">
                        -
                      </td>
                    </tr>

                    {/* Separator */}
                    <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                      <td colSpan={4} className="py-1" />
                    </tr>

                    {/* Input Tax */}
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4 font-mono text-gray-600">66</td>
                      <td className="py-3 px-4">
                        Vorsteuerbetraege
                        <br />
                        <span className="text-xs text-gray-500">
                          Deductible input tax
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-400">
                        -
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600">
                        {formatCurrency(data.vorsteuer)}
                      </td>
                    </tr>

                    {/* Remaining VAT */}
                    <tr className="bg-gray-50 dark:bg-gray-900 font-semibold">
                      <td className="py-4 px-4 font-mono text-gray-600">83</td>
                      <td className="py-4 px-4">
                        Verbleibende Umsatzsteuer
                        <br />
                        <span className="text-xs font-normal text-gray-500">
                          Remaining VAT (payable/refund)
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-gray-400">
                        -
                      </td>
                      <td
                        className={`py-4 px-4 text-right font-mono ${
                          data.verbleibendeUst > 0
                            ? "text-red-600"
                            : data.verbleibendeUst < 0
                              ? "text-emerald-600"
                              : ""
                        }`}
                      >
                        {formatCurrency(data.verbleibendeUst)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Info Note */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> This is a preparation tool. The official
              UStVA must be submitted via ELSTER (
              <a
                href="https://www.elster.de"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                elster.de
              </a>
              ) or through your tax advisor. Export the ELSTER XML above to use
              as a basis for your submission.
            </div>
          </>
        )}
      </div>
    </SessionGuard>
  );
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

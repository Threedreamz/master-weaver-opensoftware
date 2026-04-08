"use client";

import { useState, useCallback, useEffect } from "react";
import { PageHeader, DataTable, type Column } from "@opensoftware/ui";
import {
  Download,
  FileSpreadsheet,
  FileCode2,
  Loader2,
  CheckCircle2,
  ArrowRightLeft,
} from "lucide-react";
import { SessionGuard } from "@/components/auth/SessionGuard";
import { exportDatev, getAccountMappingPreview } from "./actions";
import type { DatevExportOptions } from "@/lib/datev";

interface AccountMapping {
  kontonummer: string;
  bezeichnung: string;
  skrName: string;
  category: string;
}

export default function DatevExportPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [dateTo, setDateTo] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split("T")[0];
  });
  const [format, setFormat] = useState<"csv" | "xml">("csv");
  const [kontenrahmen, setKontenrahmen] = useState<"SKR03" | "SKR04">("SKR03");
  const [beraterNummer, setBeraterNummer] = useState("");
  const [mandantenNummer, setMandantenNummer] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<{
    filename: string;
    entryCount: number;
  } | null>(null);
  const [accountMappings, setAccountMappings] = useState<AccountMapping[]>([]);
  const [showMappings, setShowMappings] = useState(false);

  useEffect(() => {
    if (showMappings) {
      getAccountMappingPreview(kontenrahmen).then(setAccountMappings);
    }
  }, [showMappings, kontenrahmen]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setLastExport(null);

    const options: DatevExportOptions = {
      dateFrom,
      dateTo,
      format,
      kontenrahmen,
      beraterNummer: beraterNummer || undefined,
      mandantenNummer: mandantenNummer || undefined,
    };

    try {
      const result = await exportDatev(options);

      // Trigger download
      const blob = new Blob([result.content], {
        type: format === "xml" ? "text/xml" : "text/csv",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastExport({
        filename: result.filename,
        entryCount: result.entryCount,
      });
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, [dateFrom, dateTo, format, kontenrahmen, beraterNummer, mandantenNummer]);

  const mappingColumns: Column<AccountMapping>[] = [
    { key: "kontonummer", header: "Account No.", className: "w-28" },
    { key: "bezeichnung", header: "Internal Name" },
    {
      key: "skrName",
      header: `${kontenrahmen} Name`,
      render: (row) => (
        <span
          className={
            row.skrName === "(unmapped)"
              ? "text-amber-600 italic"
              : "text-gray-900 dark:text-white"
          }
        >
          {row.skrName}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            row.category === "Aktiv"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              : row.category === "Passiv"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                : row.category === "Aufwand"
                  ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  : row.category === "Ertrag"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          {row.category}
        </span>
      ),
      className: "w-28",
    },
  ];

  return (
    <SessionGuard requiredRole="editor">
      <PageHeader
        title="DATEV Export"
        description="Export bookings in DATEV format for your tax advisor"
        actions={
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isExporting ? "Exporting..." : "Export"}
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Export Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date Range */}
          <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Date Range
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Format & Kontenrahmen */}
          <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Export Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Format
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setFormat("csv")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                      format === "csv"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                        : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    DATEV CSV (Buchungsstapel)
                  </button>
                  <button
                    onClick={() => setFormat("xml")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                      format === "xml"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                        : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
                    }`}
                  >
                    <FileCode2 className="w-4 h-4" />
                    DATEV XML
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Kontenrahmen
                </label>
                <div className="flex gap-3">
                  {(["SKR03", "SKR04"] as const).map((skr) => (
                    <button
                      key={skr}
                      onClick={() => setKontenrahmen(skr)}
                      className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                        kontenrahmen === skr
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                          : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
                      }`}
                    >
                      {skr}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Berater / Mandanten Nummern */}
          <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6 md:col-span-2">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              DATEV Identification (Optional)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Berater-Nr. (Tax Advisor No.)
                </label>
                <input
                  type="text"
                  value={beraterNummer}
                  onChange={(e) => setBeraterNummer(e.target.value)}
                  placeholder="e.g. 1234567"
                  maxLength={7}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Mandanten-Nr. (Client No.)
                </label>
                <input
                  type="text"
                  value={mandantenNummer}
                  onChange={(e) => setMandantenNummer(e.target.value)}
                  placeholder="e.g. 10001"
                  maxLength={5}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Account Mapping Review */}
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setShowMappings(!showMappings)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Account Mapping Review
                </p>
                <p className="text-sm text-gray-500">
                  See how your accounts map to {kontenrahmen}
                </p>
              </div>
            </div>
            <span className="text-gray-400">{showMappings ? "Hide" : "Show"}</span>
          </button>
          {showMappings && (
            <div className="border-t border-gray-200 dark:border-gray-800">
              <DataTable
                columns={mappingColumns}
                data={accountMappings}
                keyExtractor={(row) => row.kontonummer}
                emptyMessage="No accounts configured. Add accounts in the Kontenplan section."
              />
            </div>
          )}
        </div>

        {/* Last Export Status */}
        {lastExport && (
          <div className="p-6 bg-emerald-50 dark:bg-emerald-950 rounded-lg flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-800 dark:text-emerald-200">
                Export downloaded: {lastExport.filename}
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {lastExport.entryCount} booking
                {lastExport.entryCount !== 1 ? "s" : ""} exported
              </p>
            </div>
          </div>
        )}
      </div>
    </SessionGuard>
  );
}

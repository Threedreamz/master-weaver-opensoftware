"use client";

import { useState, useEffect } from "react";
import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCode2,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { getExportHistory, createCsvExport } from "./actions";
import Link from "next/link";
import { useParams } from "next/navigation";

interface ExportRecord {
  id: number;
  exportType: string;
  fromDate: string | null;
  toDate: string | null;
  transactionsCount: number | null;
  status: string | null;
  filePath: string | null;
  createdAt: string | null;
}

interface ExportCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  action?: "csv" | "agenda";
  color: string;
  bg: string;
}

export default function ExportPage() {
  const params = useParams();
  const locale = params.locale as string;

  const [history, setHistory] = useState<ExportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [csvExporting, setCsvExporting] = useState(false);
  const [lastExport, setLastExport] = useState<{ filename: string; count: number } | null>(null);

  // CSV export date range
  const [csvFrom, setCsvFrom] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [csvTo, setCsvTo] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split("T")[0];
  });
  const [showCsvForm, setShowCsvForm] = useState(false);

  useEffect(() => {
    getExportHistory().then((data) => {
      setHistory(data as ExportRecord[]);
      setLoading(false);
    });
  }, []);

  const handleCsvExport = async () => {
    setCsvExporting(true);
    setLastExport(null);
    const result = await createCsvExport({ fromDate: csvFrom, toDate: csvTo });
    if (result.success && "content" in result) {
      const blob = new Blob([result.content!], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename!;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLastExport({ filename: result.filename!, count: result.entryCount! });
      // Refresh history
      const updatedHistory = await getExportHistory();
      setHistory(updatedHistory as ExportRecord[]);
    }
    setCsvExporting(false);
  };

  const exportCards: ExportCard[] = [
    {
      title: "DATEV Export",
      description: "Export in DATEV format (CSV or XML) for your tax advisor.",
      icon: <FileSpreadsheet className="w-6 h-6" />,
      href: `/${locale}/accounting/export/datev`,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      title: "CSV Export",
      description: "Export booking entries as CSV for spreadsheet applications.",
      icon: <FileText className="w-6 h-6" />,
      action: "csv",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Agenda Export",
      description: "Export in Agenda format for Agenda accounting software.",
      icon: <FileCode2 className="w-6 h-6" />,
      action: "agenda",
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950",
    },
  ];

  const historyColumns: Column<ExportRecord>[] = [
    {
      key: "createdAt",
      header: "Date",
      render: (row) => (
        <span className="text-sm">
          {row.createdAt
            ? new Date(row.createdAt).toLocaleDateString("de-DE")
            : "-"}
        </span>
      ),
      className: "w-28",
    },
    {
      key: "exportType",
      header: "Type",
      render: (row) => (
        <span className="uppercase text-xs font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
          {row.exportType}
        </span>
      ),
      className: "w-24",
    },
    {
      key: "period",
      header: "Period",
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.fromDate && row.toDate
            ? `${row.fromDate} - ${row.toDate}`
            : "-"}
        </span>
      ),
    },
    {
      key: "transactionsCount",
      header: "Entries",
      render: (row) => (
        <span className="font-mono text-sm">{row.transactionsCount ?? 0}</span>
      ),
      className: "w-20",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status ?? "draft"} />,
      className: "w-28",
    },
  ];

  return (
    <>
      <PageHeader
        title="Export"
        description="Export data for DATEV, tax advisors, and external systems"
      />

      <div className="p-6 space-y-6">
        {/* Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {exportCards.map((card) => {
            const content = (
              <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}
                  >
                    <span className={card.color}>{card.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {card.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {card.description}
                    </p>
                  </div>
                </div>
              </div>
            );

            if (card.href) {
              return (
                <Link key={card.title} href={card.href}>
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={card.title}
                onClick={() => {
                  if (card.action === "csv") setShowCsvForm(!showCsvForm);
                }}
              >
                {content}
              </div>
            );
          })}
        </div>

        {/* CSV Export Form */}
        {showCsvForm && (
          <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              CSV Export
            </h3>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={csvFrom}
                  onChange={(e) => setCsvFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={csvTo}
                  onChange={(e) => setCsvTo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <button
                onClick={handleCsvExport}
                disabled={csvExporting}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                {csvExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {csvExporting ? "Exporting..." : "Download CSV"}
              </button>
            </div>
          </div>
        )}

        {/* Last Export Status */}
        {lastExport && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg flex items-center gap-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-800 dark:text-emerald-200">
                Exported: {lastExport.filename}
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {lastExport.count} entries exported
              </p>
            </div>
          </div>
        )}

        {/* Export History */}
        <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Export History
            </h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            </div>
          ) : (
            <DataTable
              columns={historyColumns}
              data={history}
              keyExtractor={(row) => row.id}
              emptyMessage="No exports yet. Use the export options above to generate your first export."
            />
          )}
        </div>
      </div>
    </>
  );
}

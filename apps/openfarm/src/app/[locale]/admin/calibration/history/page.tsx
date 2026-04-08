"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  History,
  Loader2,
  ChevronDown,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Crosshair,
  Printer,
} from "lucide-react";

/* ---------- Types ---------- */

interface PrinterOption {
  id: string;
  name: string;
}

interface HistoryEntry {
  id: string;
  procedureName: string;
  procedureType: string;
  materialName: string | null;
  status: string;
  result: string | null;
  createdAt: string;
  completedAt: string | null;
}

/* ---------- Constants ---------- */

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  completed: { className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "Completed" },
  applied: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", label: "Applied" },
  failed: { className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", label: "Failed" },
  cancelled: { className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", label: "Cancelled" },
  initiated: { className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", label: "In Progress" },
  printing: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", label: "Printing" },
  cooling: { className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", label: "Cooling" },
  measuring: { className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", label: "Measuring" },
  calculating: { className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400", label: "Calculating" },
  review: { className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", label: "Review" },
};

const RESULT_ICON: Record<string, React.ReactNode> = {
  pass: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  fail: <XCircle className="w-4 h-4 text-red-500" />,
  marginal: <Clock className="w-4 h-4 text-amber-500" />,
};

/* ---------- Component ---------- */

export default function CalibrationHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [printers, setPrinters] = useState<PrinterOption[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>("");
  const [procedureFilter, setProcedureFilter] = useState<string>("");
  const [materialFilter, setMaterialFilter] = useState<string>("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch printers
  useEffect(() => {
    setLoading(true);
    fetch("/api/printers?technology=sls")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.printers ?? [];
        setPrinters(list);
        if (list.length === 1) setSelectedPrinterId(list[0].id);
      })
      .catch(() => setPrinters([]))
      .finally(() => setLoading(false));
  }, []);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!selectedPrinterId) {
      setHistory([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams({ printerId: selectedPrinterId });
      if (procedureFilter) params.set("procedure", procedureFilter);
      if (materialFilter) params.set("material", materialFilter);
      const res = await fetch(`/api/calibration/history?${params}`);
      const data = await res.json().catch(() => []);
      setHistory(Array.isArray(data) ? data : data.history ?? []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedPrinterId, procedureFilter, materialFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Unique procedure names and materials for filters
  const procedureNames = [...new Set(history.map((h) => h.procedureName))].sort();
  const materialNames = [...new Set(history.filter((h) => h.materialName).map((h) => h.materialName!))].sort();

  // Filter locally for immediate responsiveness
  const filtered = history.filter((h) => {
    if (procedureFilter && h.procedureName !== procedureFilter) return false;
    if (materialFilter && h.materialName !== materialFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div>
        <Link
          href={`/${locale}/admin/calibration`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calibration History</h1>
        <p className="text-sm text-gray-500 mt-1">View past calibration sessions and results</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Printer */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Printer</label>
            <div className="relative">
              <select
                value={selectedPrinterId}
                onChange={(e) => setSelectedPrinterId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Printer --</option>
                {printers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Procedure */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Procedure</label>
            <div className="relative">
              <select
                value={procedureFilter}
                onChange={(e) => setProcedureFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Procedures</option>
                {procedureNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Material */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Material</label>
            <div className="relative">
              <select
                value={materialFilter}
                onChange={(e) => setMaterialFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Materials</option>
                {materialNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading || loadingHistory ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading...
        </div>
      ) : !selectedPrinterId ? (
        <div className="text-center py-12 text-gray-500">
          <Printer className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Select a printer to view calibration history.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No calibration history found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Procedure</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Material</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Result</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const badge = STATUS_BADGE[entry.status] ?? STATUS_BADGE.initiated;
                return (
                  <tr
                    key={entry.id}
                    onClick={() => router.push(`/${locale}/admin/calibration/${entry.id}`)}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Crosshair className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">{entry.procedureName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {entry.materialName ?? "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {entry.result ? RESULT_ICON[entry.result] ?? null : null}
                        <span className="text-gray-600 dark:text-gray-400 capitalize">
                          {entry.result ?? "\u2014"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

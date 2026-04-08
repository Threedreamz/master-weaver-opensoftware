"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Crosshair,
  ChevronDown,
  Play,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  History,
  Loader2,
  Printer,
} from "lucide-react";

/* ---------- Types ---------- */

interface PrinterOption {
  id: string;
  name: string;
  technology: string;
  status: string;
}

interface CalibrationProcedure {
  id: string;
  name: string;
  description: string;
  tier: "core" | "mechanical" | "maintenance" | "service" | "software";
  procedureType: string;
  intervalHours: number | null;
  lastCalibratedAt: string | null;
  status: "up_to_date" | "due" | "overdue" | "never";
}

interface CalibrationSession {
  id: string;
  procedureId: string;
  printerId: string;
  status: string;
  createdAt: string;
}

/* ---------- Constants ---------- */

const TIER_CONFIG: Record<string, { label: string; border: string; bg: string; icon: string }> = {
  core: { label: "Core Calibrations", border: "border-blue-300 dark:border-blue-700", bg: "bg-blue-50/50 dark:bg-blue-950/10", icon: "text-blue-500" },
  mechanical: { label: "Mechanical Calibrations", border: "border-amber-300 dark:border-amber-700", bg: "bg-amber-50/50 dark:bg-amber-950/10", icon: "text-amber-500" },
  maintenance: { label: "Maintenance", border: "border-green-300 dark:border-green-700", bg: "bg-green-50/50 dark:bg-green-950/10", icon: "text-green-500" },
  service: { label: "Service", border: "border-gray-300 dark:border-gray-600", bg: "bg-gray-50/50 dark:bg-gray-800/30", icon: "text-gray-500" },
  software: { label: "Software", border: "border-purple-300 dark:border-purple-700", bg: "bg-purple-50/50 dark:bg-purple-950/10", icon: "text-purple-500" },
};

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  up_to_date: { className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "Up to date" },
  due: { className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", label: "Due" },
  overdue: { className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", label: "Overdue" },
  never: { className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", label: "Never calibrated" },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  up_to_date: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  due: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  overdue: <XCircle className="w-4 h-4 text-red-500" />,
  never: <Clock className="w-4 h-4 text-gray-400" />,
};

/* ---------- Component ---------- */

export default function CalibrationDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [printers, setPrinters] = useState<PrinterOption[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>("");
  const [procedures, setProcedures] = useState<CalibrationProcedure[]>([]);
  const [sessions, setSessions] = useState<CalibrationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProcedures, setLoadingProcedures] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  // Fetch SLS printers
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

  // Fetch procedures and sessions when printer selected
  const fetchCalibrationData = useCallback(async () => {
    if (!selectedPrinterId) return;
    setLoadingProcedures(true);
    try {
      const [procRes, sessRes] = await Promise.all([
        fetch(`/api/calibration/procedures?printerId=${selectedPrinterId}`),
        fetch(`/api/calibration/sessions?printerId=${selectedPrinterId}`),
      ]);
      const procData = await procRes.json().catch(() => []);
      const sessData = await sessRes.json().catch(() => []);
      setProcedures(Array.isArray(procData) ? procData : procData.procedures ?? []);
      setSessions(Array.isArray(sessData) ? sessData : sessData.sessions ?? []);
    } catch {
      setProcedures([]);
      setSessions([]);
    } finally {
      setLoadingProcedures(false);
    }
  }, [selectedPrinterId]);

  useEffect(() => {
    fetchCalibrationData();
  }, [fetchCalibrationData]);

  // Start a calibration session
  const handleStartCalibration = async (procedureId: string) => {
    setStarting(procedureId);
    try {
      const res = await fetch("/api/calibration/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procedureId, printerId: selectedPrinterId }),
      });
      if (res.ok) {
        const session = await res.json();
        router.push(`/${locale}/admin/calibration/${session.id}`);
      }
    } catch {
      // silently fail
    } finally {
      setStarting(null);
    }
  };

  // Log a mechanical calibration
  const handleLogCompletion = async (procedureId: string) => {
    setStarting(procedureId);
    try {
      const res = await fetch("/api/calibration/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procedureId, printerId: selectedPrinterId, autoComplete: true }),
      });
      if (res.ok) {
        await fetchCalibrationData();
      }
    } catch {
      // silently fail
    } finally {
      setStarting(null);
    }
  };

  // Group procedures by tier
  const grouped = procedures.reduce<Record<string, CalibrationProcedure[]>>((acc, p) => {
    (acc[p.tier] ??= []).push(p);
    return acc;
  }, {});

  // Find active session for a procedure
  const getActiveSession = (procedureId: string) =>
    sessions.find((s) => s.procedureId === procedureId && !["completed", "failed", "cancelled"].includes(s.status));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SLS Calibration</h1>
          <p className="text-sm text-gray-500 mt-1">Fuse 1 calibration procedures and tracking</p>
        </div>
        <Link
          href={`/${locale}/admin/calibration/history`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <History className="w-4 h-4" />
          History
        </Link>
      </div>

      {/* Printer Selector */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select SLS Printer
        </label>
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading printers...
          </div>
        ) : printers.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Printer className="w-4 h-4" />
            <span>No SLS printers found. Add one in <Link href={`/${locale}/admin/printers`} className="text-blue-600 hover:underline">Printers</Link>.</span>
          </div>
        ) : (
          <div className="relative">
            <select
              value={selectedPrinterId}
              onChange={(e) => setSelectedPrinterId(e.target.value)}
              className="w-full max-w-md appearance-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Printer --</option>
              {printers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Procedures Grid */}
      {selectedPrinterId && loadingProcedures && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading calibration data...
        </div>
      )}

      {selectedPrinterId && !loadingProcedures && procedures.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Crosshair className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No calibration procedures found for this printer.</p>
        </div>
      )}

      {selectedPrinterId && !loadingProcedures && Object.keys(grouped).length > 0 && (
        <div className="space-y-8">
          {(["core", "mechanical", "maintenance", "service", "software"] as const).map((tier) => {
            const items = grouped[tier];
            if (!items || items.length === 0) return null;
            const tierConf = TIER_CONFIG[tier];

            return (
              <section key={tier}>
                <div className="flex items-center gap-2 mb-4">
                  <Crosshair className={`w-4 h-4 ${tierConf.icon}`} />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {tierConf.label}
                  </h2>
                  <span className="text-xs text-gray-400 ml-1">{items.length}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {items.map((proc) => {
                    const badge = STATUS_BADGE[proc.status] ?? STATUS_BADGE.never;
                    const activeSession = getActiveSession(proc.id);
                    const isStarting = starting === proc.id;
                    const isActionable = tier === "core" || tier === "mechanical";

                    return (
                      <div
                        key={proc.id}
                        className={`rounded-xl border ${tierConf.border} ${tierConf.bg} p-4 transition-all hover:shadow-md`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{proc.name}</h3>
                          {STATUS_ICON[proc.status]}
                        </div>

                        {/* Description */}
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                          {proc.description}
                        </p>

                        {/* Status Badge + Last Calibrated */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        {proc.lastCalibratedAt && (
                          <p className="text-xs text-gray-400 mb-3">
                            Last: {new Date(proc.lastCalibratedAt).toLocaleDateString()}
                          </p>
                        )}

                        {/* Action Button */}
                        {activeSession ? (
                          <Link
                            href={`/${locale}/admin/calibration/${activeSession.id}`}
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Play className="w-4 h-4" />
                            Continue Session
                          </Link>
                        ) : tier === "core" ? (
                          <button
                            onClick={() => handleStartCalibration(proc.id)}
                            disabled={isStarting}
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            Start Calibration
                          </button>
                        ) : tier === "mechanical" ? (
                          <button
                            onClick={() => handleLogCompletion(proc.id)}
                            disabled={isStarting}
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                          >
                            {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                            Log Completion
                          </button>
                        ) : tier === "maintenance" ? (
                          <div className="text-xs text-gray-400 italic">Tracked automatically</div>
                        ) : (
                          <div className="text-xs text-gray-400 italic">Read-only</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

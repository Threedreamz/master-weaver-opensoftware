"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  Thermometer,
  Ruler,
  Eye,
  Calculator,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  ExternalLink,
} from "lucide-react";

/* ---------- Types ---------- */

interface SessionStep {
  stepNumber: number;
  title: string;
  description: string;
  status: "pending" | "active" | "completed";
}

interface SessionResult {
  key: string;
  label: string;
  value: string | number;
  unit?: string;
}

interface CalibrationSession {
  id: string;
  procedureId: string;
  procedureName: string;
  procedureType: string;
  printerId: string;
  printerName: string;
  status: string;
  steps: SessionStep[];
  results: SessionResult[];
  printJobId?: string;
  materialName?: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------- Constants ---------- */

const SESSION_STATUSES = [
  "initiated",
  "printing",
  "cooling",
  "measuring",
  "calculating",
  "review",
  "applied",
  "completed",
] as const;

const STATUS_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  initiated: { label: "Ready to Start", icon: <Play className="w-4 h-4" />, color: "text-blue-500" },
  printing: { label: "Printing", icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-blue-500" },
  cooling: { label: "Cooling Down", icon: <Thermometer className="w-4 h-4" />, color: "text-amber-500" },
  measuring: { label: "Measuring", icon: <Ruler className="w-4 h-4" />, color: "text-purple-500" },
  calculating: { label: "Calculating Results", icon: <Calculator className="w-4 h-4 animate-spin" />, color: "text-indigo-500" },
  review: { label: "Review Results", icon: <Eye className="w-4 h-4" />, color: "text-amber-500" },
  applied: { label: "Corrections Applied", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-500" },
  completed: { label: "Completed", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-600" },
  failed: { label: "Failed", icon: <Circle className="w-4 h-4" />, color: "text-red-500" },
  cancelled: { label: "Cancelled", icon: <Circle className="w-4 h-4" />, color: "text-gray-500" },
};

/* ---------- Component ---------- */

export default function CalibrationSessionPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<CalibrationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/calibration/sessions/${sessionId}`);
      if (!res.ok) throw new Error("Session not found");
      const data = await res.json();
      setSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Poll for status updates during printing/calculating
  useEffect(() => {
    if (!session) return;
    if (session.status === "printing" || session.status === "calculating") {
      const interval = setInterval(fetchSession, 5000);
      return () => clearInterval(interval);
    }
  }, [session?.status, fetchSession]);

  const advanceStatus = async (newStatus: string, body?: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/calibration/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...body }),
      });
      if (res.ok) {
        await fetchSession();
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  };

  const triggerPrint = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/calibration/sessions/${sessionId}/trigger-print`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchSession();
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading session...
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="text-center py-24">
        <p className="text-red-500 mb-4">{error ?? "Session not found"}</p>
        <Link href={`/${locale}/admin/calibration`} className="text-blue-600 hover:underline">
          Back to Calibration Dashboard
        </Link>
      </div>
    );
  }

  const currentStatusIndex = SESSION_STATUSES.indexOf(session.status as typeof SESSION_STATUSES[number]);
  const statusConf = STATUS_LABELS[session.status] ?? STATUS_LABELS.initiated;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/admin/calibration`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <Link
          href={`/${locale}/admin/calibration/history`}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          History
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{session.procedureName}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {session.printerName} {session.materialName && <span>/ {session.materialName}</span>}
            </p>
          </div>
          <div className={`flex items-center gap-2 ${statusConf.color}`}>
            {statusConf.icon}
            <span className="font-medium text-sm">{statusConf.label}</span>
          </div>
        </div>

        {/* Status Progress Bar */}
        <div className="flex items-center gap-1 mb-2">
          {SESSION_STATUSES.map((s, i) => {
            const isCurrent = s === session.status;
            const isPast = i < currentStatusIndex;
            return (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  isPast
                    ? "bg-green-500"
                    : isCurrent
                    ? "bg-blue-500"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-400 px-1">
          <span>Start</span>
          <span>Complete</span>
        </div>
      </div>

      {/* Vertical Stepper */}
      {session.steps && session.steps.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">
            Procedure Steps
          </h2>
          <div className="space-y-0">
            {session.steps.map((step, i) => {
              const isCompleted = step.status === "completed";
              const isActive = step.status === "active";
              return (
                <div key={step.stepNumber} className="flex gap-4">
                  {/* Stepper Line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                        isCompleted
                          ? "bg-green-500 border-green-500 text-white"
                          : isActive
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        step.stepNumber
                      )}
                    </div>
                    {i < session.steps.length - 1 && (
                      <div
                        className={`w-0.5 flex-1 min-h-[24px] ${
                          isCompleted ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    )}
                  </div>
                  {/* Step Content */}
                  <div className={`pb-6 ${isActive ? "" : "opacity-70"}`}>
                    <h3 className={`font-medium ${isActive ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status-Specific Actions */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">
          Actions
        </h2>

        {session.status === "initiated" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ready to start. This will send the calibration print job to your printer.
            </p>
            <button
              onClick={triggerPrint}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start Print
            </button>
          </div>
        )}

        {session.status === "printing" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-blue-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Print job in progress...</span>
            </div>
            {session.printJobId && (
              <Link
                href={`/${locale}/admin/jobs/${session.printJobId}`}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                View Print Job <ExternalLink className="w-3 h-3" />
              </Link>
            )}
            <button
              onClick={() => advanceStatus("cooling")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Mark Print Complete
            </button>
          </div>
        )}

        {session.status === "cooling" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-500">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">Allow parts to cool before measuring.</span>
            </div>
            <button
              onClick={() => advanceStatus("measuring")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Thermometer className="w-4 h-4" />}
              Cooling Complete
            </button>
          </div>
        )}

        {session.status === "measuring" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter measurements in OpenSlicer.
            </p>
            <a
              href={`http://localhost:4175/${locale}/openfarm/calibration/sls/${sessionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Ruler className="w-4 h-4" />
              Enter Measurements in OpenSlicer
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {session.status === "calculating" && (
          <div className="flex items-center gap-2 text-indigo-500">
            <Calculator className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Computing calibration results...</span>
          </div>
        )}

        {session.status === "review" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Review the computed results below and apply or reject them.
            </p>
            {session.results && session.results.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-2">
                {session.results.map((r) => (
                  <div key={r.key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{r.label}</span>
                    <span className="font-mono font-medium text-gray-900 dark:text-white">
                      {r.value}{r.unit ? ` ${r.unit}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => advanceStatus("applied")}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                Apply Corrections
              </button>
              <button
                onClick={() => advanceStatus("completed", { rejected: true })}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 transition-colors"
              >
                <ThumbsDown className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        )}

        {session.status === "applied" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Corrections have been applied.</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={triggerPrint}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Run Verification Print
              </button>
              <button
                onClick={() => advanceStatus("completed")}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Complete
              </button>
            </div>
          </div>
        )}

        {session.status === "completed" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Calibration completed successfully.</span>
            </div>
            {session.results && session.results.length > 0 && (
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 space-y-2">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">Final Results</h3>
                {session.results.map((r) => (
                  <div key={r.key} className="flex items-center justify-between text-sm">
                    <span className="text-green-700 dark:text-green-400">{r.label}</span>
                    <span className="font-mono font-medium text-green-900 dark:text-green-200">
                      {r.value}{r.unit ? ` ${r.unit}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="text-xs text-gray-400 flex items-center gap-4">
        <span>Session: {session.id}</span>
        <span>Created: {new Date(session.createdAt).toLocaleString()}</span>
        <span>Updated: {new Date(session.updatedAt).toLocaleString()}</span>
      </div>
    </div>
  );
}

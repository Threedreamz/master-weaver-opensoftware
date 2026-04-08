import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  ArrowLeft,
  Printer,
  Box,
  Beaker,
  SlidersHorizontal,
  Clock,
  AlertCircle,
  CheckCircle2,
  Pause,
  Play,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { getJobById } from "@/db/queries/jobs";
import { db } from "@/db";
import { farmJobLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { updateJobStatus } from "../actions";

export const dynamic = "force-dynamic";

interface JobDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

const STATUS_STEPS = ["queued", "preparing", "printing", "completed"] as const;

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  queued: { color: "text-gray-500", label: "Queued" },
  slicing: { color: "text-yellow-600", label: "Slicing" },
  post_processing: { color: "text-yellow-600", label: "Post-Processing" },
  ready: { color: "text-blue-600", label: "Ready" },
  sending: { color: "text-blue-600", label: "Sending" },
  printing: { color: "text-green-600", label: "Printing" },
  paused: { color: "text-amber-600", label: "Paused" },
  washing: { color: "text-purple-600", label: "Washing" },
  curing: { color: "text-purple-600", label: "Curing" },
  cooling: { color: "text-blue-400", label: "Cooling" },
  depowdering: { color: "text-orange-600", label: "Depowdering" },
  completed: { color: "text-green-700", label: "Completed" },
  failed: { color: "text-red-600", label: "Failed" },
  cancelled: { color: "text-gray-400", label: "Cancelled" },
};

function getStepIndex(status: string): number {
  const preparingStatuses = ["slicing", "post_processing", "ready", "sending"];
  const printingStatuses = ["printing", "paused", "washing", "curing", "cooling", "depowdering"];
  if (status === "queued") return 0;
  if (preparingStatuses.includes(status)) return 1;
  if (printingStatuses.includes(status)) return 2;
  if (status === "completed") return 3;
  return -1; // failed/cancelled
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const job = await getJobById(id);
  if (!job) notFound();

  const statusConf = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.queued;
  const currentStep = getStepIndex(job.status);

  // Fetch job logs
  const logs = await db.query.farmJobLogs.findMany({
    where: eq(farmJobLogs.jobId, id),
    orderBy: [desc(farmJobLogs.createdAt)],
    limit: 50,
  });

  const elapsed = job.printStartedAt
    ? Math.floor((Date.now() - new Date(job.printStartedAt).getTime()) / 1000)
    : undefined;

  const isFailed = job.status === "failed";
  const isCancelled = job.status === "cancelled";
  const isCompleted = job.status === "completed";
  const isPaused = job.status === "paused";
  const isPrinting = job.status === "printing";
  const isQueued = job.status === "queued";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/jobs`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{job.name}</h1>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            job.status === "printing"
              ? "bg-green-100 text-green-700"
              : job.status === "completed"
              ? "bg-blue-100 text-blue-700"
              : job.status === "failed"
              ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {statusConf.label}
        </span>
      </div>

      {/* Status Timeline */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Status Timeline</h2>
        <div className="flex items-center justify-between">
          {STATUS_STEPS.map((step, idx) => {
            const isActive = idx <= currentStep && currentStep >= 0;
            const isCurrent = idx === currentStep;
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isCurrent
                        ? "border-amber-500 bg-amber-500 text-white"
                        : isActive
                        ? "border-green-500 bg-green-50 text-green-600"
                        : "border-gray-200 bg-gray-50 text-gray-400"
                    }`}
                  >
                    {isActive && !isCurrent ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <span className={`text-xs mt-2 font-medium capitalize ${isCurrent ? "text-amber-600" : isActive ? "text-green-600" : "text-gray-400"}`}>
                    {step === "preparing" ? "Preparing" : step}
                  </span>
                </div>
                {idx < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${idx < currentStep ? "bg-green-400" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>
        {(isFailed || isCancelled) && (
          <div className={`mt-4 p-3 rounded-lg ${isFailed ? "bg-red-50 border border-red-200" : "bg-gray-50 border border-gray-200"}`}>
            <div className="flex items-center gap-2">
              {isFailed ? <AlertCircle className="w-4 h-4 text-red-500" /> : <XCircle className="w-4 h-4 text-gray-500" />}
              <span className={`text-sm font-medium ${isFailed ? "text-red-700" : "text-gray-600"}`}>
                {isFailed ? "Job Failed" : "Job Cancelled"}
              </span>
            </div>
            {job.errorMessage && (
              <p className="text-sm text-red-600 mt-1">{job.errorMessage}</p>
            )}
          </div>
        )}
        {/* Progress bar for printing */}
        {isPrinting && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm font-bold text-gray-900">{job.progressPercent ?? 0}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${job.progressPercent ?? 0}%` }}
              />
            </div>
            {elapsed !== undefined && (
              <p className="text-xs text-gray-500 mt-1">Elapsed: {formatDuration(elapsed)}</p>
            )}
            {job.currentLayer && job.totalLayers && (
              <p className="text-xs text-gray-500">Layer {job.currentLayer} / {job.totalLayers}</p>
            )}
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Printer Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <Printer className="w-5 h-5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Printer</h3>
          </div>
          {job.printer ? (
            <div>
              <p className="font-medium text-gray-900">{job.printer.name}</p>
              <p className="text-xs text-gray-500 mt-1">{job.printer.technology.toUpperCase()} &middot; {job.printer.status}</p>
              {job.printer.ipAddress && (
                <p className="text-xs text-gray-400 font-mono mt-1">{job.printer.ipAddress}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Not assigned</p>
          )}
        </div>

        {/* Model Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <Box className="w-5 h-5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Model</h3>
          </div>
          {job.model ? (
            <div>
              <p className="font-medium text-gray-900">{job.model.name}</p>
              <p className="text-xs text-gray-500 mt-1">{job.model.filename}</p>
              {job.model.boundingBoxX && job.model.boundingBoxY && job.model.boundingBoxZ && (
                <p className="text-xs text-gray-400 mt-1">
                  {job.model.boundingBoxX} x {job.model.boundingBoxY} x {job.model.boundingBoxZ} mm
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No model</p>
          )}
        </div>

        {/* Profile Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="w-5 h-5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Profile</h3>
          </div>
          {job.profile ? (
            <div>
              <p className="font-medium text-gray-900">{job.profile.name}</p>
              <p className="text-xs text-gray-500 mt-1">{job.profile.technology.toUpperCase()} &middot; {job.profile.slicerEngine}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No profile</p>
          )}
        </div>

        {/* Material Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <Beaker className="w-5 h-5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Material</h3>
          </div>
          {job.material ? (
            <div>
              <p className="font-medium text-gray-900">{job.material.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {job.material.colorHex && (
                  <div
                    className="w-3 h-3 rounded-full border border-gray-200"
                    style={{ backgroundColor: job.material.colorHex }}
                  />
                )}
                <p className="text-xs text-gray-500">{job.material.color ?? ""} &middot; {job.material.type}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No material</p>
          )}
        </div>
      </div>

      {/* Notes */}
      {job.notes && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Notes</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.notes}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {isPrinting && (
            <form action={updateJobStatus}>
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="status" value="paused" />
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            </form>
          )}

          {isPaused && (
            <form action={updateJobStatus}>
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="status" value="printing" />
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
            </form>
          )}

          {(isPrinting || isPaused) && (
            <form action={updateJobStatus}>
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="status" value="cancelled" />
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
            </form>
          )}

          {(isFailed || isCancelled || isCompleted) && (
            <form action={updateJobStatus}>
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="status" value="queued" />
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Re-queue
              </button>
            </form>
          )}

          {isQueued && (
            <form action={updateJobStatus}>
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="status" value="printing" />
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
              >
                <Play className="w-4 h-4" />
                Start Printing
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Job Logs */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Job Logs</h2>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400">No log entries yet.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`flex items-start gap-3 px-3 py-2 rounded-lg text-sm ${
                  log.level === "error"
                    ? "bg-red-50 text-red-700"
                    : log.level === "warning"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                <span className="text-xs text-gray-400 font-mono whitespace-nowrap mt-0.5">
                  {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : "—"}
                </span>
                <span className="text-xs font-medium uppercase w-12">{log.level}</span>
                <span className="flex-1">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Timestamps</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Queued</dt>
            <dd className="text-gray-900 font-medium">
              {job.queuedAt ? new Date(job.queuedAt).toLocaleString() : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Print Started</dt>
            <dd className="text-gray-900 font-medium">
              {job.printStartedAt ? new Date(job.printStartedAt).toLocaleString() : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Completed</dt>
            <dd className="text-gray-900 font-medium">
              {job.printCompletedAt ? new Date(job.printCompletedAt).toLocaleString() : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Estimated Print Time</dt>
            <dd className="text-gray-900 font-medium">
              {job.estimatedPrintTime ? formatDuration(job.estimatedPrintTime) : "—"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

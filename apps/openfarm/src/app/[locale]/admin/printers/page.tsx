import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPrinters } from "@/db/queries/printers";
import { db } from "@/db";
import { farmPrintJobs } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  Printer,
  Plus,
  Wifi,
  WifiOff,
  Thermometer,
  Clock,
  MoreVertical,
  Settings,
  Trash2,
  Wrench,
  Box,
  Cloud,
} from "lucide-react";
import { deletePrinter } from "./actions";

export const dynamic = "force-dynamic";

interface PrintersPageProps {
  params: Promise<{ locale: string }>;
}

const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; label: string; labelDe: string }> = {
  online: { dot: "bg-green-500", bg: "border-green-200 bg-green-50/50 dark:bg-green-950/10", text: "text-green-700", label: "Idle", labelDe: "Bereit" },
  printing: { dot: "bg-blue-500 animate-pulse", bg: "border-blue-200 bg-blue-50/50 dark:bg-blue-950/10", text: "text-blue-700", label: "Printing", labelDe: "Druckt" },
  paused: { dot: "bg-amber-500", bg: "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10", text: "text-amber-700", label: "Paused", labelDe: "Pausiert" },
  error: { dot: "bg-red-500 animate-pulse", bg: "border-red-200 bg-red-50/50 dark:bg-red-950/10", text: "text-red-700", label: "Error", labelDe: "Fehler" },
  maintenance: { dot: "bg-purple-500", bg: "border-purple-200 bg-purple-50/50 dark:bg-purple-950/10", text: "text-purple-700", label: "Maintenance", labelDe: "Wartung" },
  offline: { dot: "bg-gray-400", bg: "border-gray-200 bg-gray-50/50 dark:bg-gray-800/50", text: "text-gray-500", label: "Offline", labelDe: "Offline" },
};

const TECH_BADGE: Record<string, { bg: string; label: string }> = {
  fdm: { bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", label: "FDM" },
  sla: { bg: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", label: "SLA" },
  sls: { bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "SLS" },
};

const PROTOCOL_BADGE: Record<string, { bg: string; label: string }> = {
  bambu_cloud: { bg: "bg-green-100 text-green-700", label: "Bambu Cloud" },
  bambu_mqtt: { bg: "bg-green-100 text-green-700", label: "Bambu LAN" },
  moonraker: { bg: "bg-sky-100 text-sky-700", label: "Moonraker" },
  octoprint: { bg: "bg-indigo-100 text-indigo-700", label: "OctoPrint" },
  formlabs_local: { bg: "bg-orange-100 text-orange-700", label: "Formlabs" },
  formlabs_cloud: { bg: "bg-orange-100 text-orange-700", label: "Formlabs Cloud" },
  sls4all: { bg: "bg-blue-100 text-blue-700", label: "SLS4All" },
  manual: { bg: "bg-gray-100 text-gray-600", label: "Manuell" },
};

function PrinterIcon({ technology }: { technology: string }) {
  const colors: Record<string, string> = {
    fdm: "from-amber-400 to-amber-600",
    sla: "from-purple-400 to-purple-600",
    sls: "from-blue-400 to-blue-600",
  };
  return (
    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${colors[technology] ?? "from-gray-400 to-gray-600"} flex items-center justify-center shadow-sm`}>
      <Printer className="w-8 h-8 text-white" />
    </div>
  );
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default async function PrintersPage({ params }: PrintersPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("printers");
  const allPrinters = await getPrinters();

  // Fetch active jobs for printing printers
  const printingPrinterIds = allPrinters
    .filter((p) => p.status === "printing")
    .map((p) => p.id);

  let activeJobs: Record<string, { name: string; progress: number; printStartedAt: Date | null; estimatedPrintTime: number | null }> = {};
  if (printingPrinterIds.length > 0) {
    const jobs = await db.query.farmPrintJobs.findMany({
      where: and(
        inArray(farmPrintJobs.printerId, printingPrinterIds),
        eq(farmPrintJobs.status, "printing")
      ),
    });
    for (const job of jobs) {
      if (job.printerId) {
        activeJobs[job.printerId] = {
          name: job.name,
          progress: job.progressPercent ?? 0,
          printStartedAt: job.printStartedAt,
          estimatedPrintTime: job.estimatedPrintTime,
        };
      }
    }
  }

  // Group printers
  const connectedPrinters = allPrinters.filter((p) => p.status === "printing" || p.status === "paused");
  const localPrinters = allPrinters;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {allPrinters.length} {allPrinters.length === 1 ? "Drucker" : "Drucker"} &middot; {connectedPrinters.length} aktiv
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/admin/settings`}
            className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
            title="Import all Bambu printers via Bambu Cloud"
          >
            <Cloud className="w-4 h-4" />
            Bambu Cloud
          </Link>
          <Link
            href={`/${locale}/admin/printers/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t("addPrinter")}
          </Link>
        </div>
      </div>

      {/* Connected / Active Printers */}
      {connectedPrinters.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Aktive Drucker
            </h2>
            <span className="text-xs text-gray-400 ml-1">{connectedPrinters.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {connectedPrinters.map((printer) => {
              const status = STATUS_CONFIG[printer.status] ?? STATUS_CONFIG.offline;
              const tech = TECH_BADGE[printer.technology] ?? TECH_BADGE.fdm;
              const job = activeJobs[printer.id];
              const elapsed = job?.printStartedAt
                ? Math.floor((Date.now() - new Date(job.printStartedAt).getTime()) / 1000)
                : undefined;

              return (
                <div
                  key={printer.id}
                  className={`rounded-xl border-2 ${status.bg} p-4 transition-all hover:shadow-lg relative group`}
                >
                  {/* Header row */}
                  <div className="flex items-start gap-3 mb-3">
                    <PrinterIcon technology={printer.technology} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{printer.name}</h3>
                      <p className="text-xs text-gray-500 font-mono">{printer.ipAddress ?? "—"}</p>
                      <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${tech.bg}`}>
                        {tech.label}
                      </span>
                    </div>
                    <Link
                      href={`/${locale}/admin/printers/${printer.id}`}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                    >
                      Details
                    </Link>
                  </div>

                  {/* Progress bar (for printing jobs) */}
                  {printer.status === "printing" && (
                    <div className="mb-3">
                      {job && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-1.5">{job.name}</p>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                            style={{ width: `${job?.progress ?? 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                          {job?.progress ?? 0}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Status footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${status.dot}`} />
                      <span className={`text-sm font-medium ${status.text}`}>{status.labelDe}</span>
                    </div>
                    {elapsed !== undefined && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span className="font-mono tabular-nums">{formatDuration(elapsed)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* All Printers Grid */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Printer className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Alle Drucker
          </h2>
        </div>

        {allPrinters.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 p-12 text-center">
            <Printer className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">{t("noPrinters")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {allPrinters.map((printer) => {
              const status = STATUS_CONFIG[printer.status] ?? STATUS_CONFIG.offline;
              const tech = TECH_BADGE[printer.technology] ?? TECH_BADGE.fdm;
              const job = activeJobs[printer.id];
              const elapsed = job?.printStartedAt
                ? Math.floor((Date.now() - new Date(job.printStartedAt).getTime()) / 1000)
                : undefined;

              return (
                <div
                  key={printer.id}
                  className={`rounded-xl border ${status.bg} p-4 transition-all hover:shadow-md relative group`}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <PrinterIcon technology={printer.technology} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{printer.name}</h3>
                      <p className="text-xs text-gray-500 font-mono">{printer.ipAddress ?? "—"}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tech.bg}`}>
                          {tech.label}
                        </span>
                        {PROTOCOL_BADGE[printer.protocol] && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PROTOCOL_BADGE[printer.protocol].bg}`}>
                            {PROTOCOL_BADGE[printer.protocol].label}
                          </span>
                        )}
                        {printer.make && printer.model && (
                          <span className="text-xs text-gray-400">{printer.make} {printer.model}</span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/${locale}/admin/printers/${printer.id}`}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                    >
                      Details
                    </Link>
                  </div>

                  {/* Build volume info */}
                  {printer.buildVolumeX && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                      <Box className="w-3 h-3" />
                      <span>
                        {printer.buildVolumeX}{"×"}{printer.buildVolumeY}{"×"}{printer.buildVolumeZ} mm
                      </span>
                      {printer.nozzleDiameter && (
                        <span className="ml-2">Nozzle: {printer.nozzleDiameter}mm</span>
                      )}
                    </div>
                  )}

                  {/* Progress bar (for printing jobs) */}
                  {printer.status === "printing" && (
                    <div className="mb-3">
                      {job && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-1.5">{job.name}</p>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                            style={{ width: `${job?.progress ?? 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                          {job?.progress ?? 0}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Status footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${status.dot}`} />
                      <span className={`text-sm font-medium ${status.text}`}>{status.labelDe}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {elapsed !== undefined && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span className="font-mono tabular-nums">{formatDuration(elapsed)}</span>
                        </div>
                      )}
                      {printer.status !== "printing" && (
                        <form action={deletePrinter} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <input type="hidden" name="id" value={printer.id} />
                          <button
                            type="submit"
                            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

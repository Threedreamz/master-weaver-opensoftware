import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { farmPrinters, farmPrintJobs, farmMaterials, farmMaintenanceTasks } from "@/db/schema";
import { eq, sql, and, gte, desc, inArray } from "drizzle-orm";
import {
  Printer,
  PlayCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Plus,
  ArrowRight,
  Wrench,
  Box,
  ClipboardList,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface AdminDashboardProps {
  params: Promise<{ locale: string }>;
}

const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; labelDe: string }> = {
  online:      { dot: "bg-green-500",              bg: "bg-green-50 border-green-200",   text: "text-green-700",  labelDe: "Bereit" },
  printing:    { dot: "bg-blue-500 animate-pulse",  bg: "bg-blue-50 border-blue-200",    text: "text-blue-700",   labelDe: "Druckt" },
  paused:      { dot: "bg-amber-500",               bg: "bg-amber-50 border-amber-200",  text: "text-amber-700",  labelDe: "Pausiert" },
  error:       { dot: "bg-red-500 animate-pulse",   bg: "bg-red-50 border-red-200",      text: "text-red-700",    labelDe: "Fehler" },
  maintenance: { dot: "bg-purple-500",              bg: "bg-purple-50 border-purple-200",text: "text-purple-700", labelDe: "Wartung" },
  offline:     { dot: "bg-gray-400",                bg: "bg-gray-50 border-gray-200",    text: "text-gray-500",   labelDe: "Offline" },
};

const JOB_STATUS_STYLE: Record<string, string> = {
  printing:  "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  queued:    "bg-gray-100 text-gray-600",
  failed:    "bg-red-100 text-red-700",
  paused:    "bg-amber-100 text-amber-700",
  cancelled: "bg-gray-100 text-gray-400",
  slicing:   "bg-purple-100 text-purple-700",
};

const JOB_STATUS_LABEL: Record<string, string> = {
  printing:  "Druckt",
  completed: "Fertig",
  queued:    "Warteschlange",
  failed:    "Fehler",
  paused:    "Pausiert",
  cancelled: "Abgebrochen",
  slicing:   "Slicing",
};

const MAINTENANCE_STATUS_STYLE: Record<string, string> = {
  due:      "bg-amber-100 text-amber-700",
  overdue:  "bg-red-100 text-red-700",
  planned:  "bg-gray-100 text-gray-600",
};

const MAINTENANCE_STATUS_LABEL: Record<string, string> = {
  due:     "Fällig",
  overdue: "Überfällig",
  planned: "Geplant",
};

function formatRelativeTime(dateOrTs: Date | number | null | undefined): string {
  if (!dateOrTs) return "—";
  const ts = typeof dateOrTs === "number" ? dateOrTs * 1000 : new Date(dateOrTs).getTime();
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days === 1 ? "" : "en"}`;
}

export default async function AdminDashboardPage({ params }: AdminDashboardProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("dashboard");

  const todayStart = Math.floor(new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000);

  const [
    totalPrintersResult,
    activePrintersResult,
    activeJobsResult,
    queuedJobsResult,
    completedTodayResult,
    materialWarningsResult,
    allPrinters,
    recentJobs,
    dueTasks,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(farmPrinters),
    db.select({ count: sql<number>`count(*)` }).from(farmPrinters).where(eq(farmPrinters.status, "printing")),
    db.select({ count: sql<number>`count(*)` }).from(farmPrintJobs).where(eq(farmPrintJobs.status, "printing")),
    db.select({ count: sql<number>`count(*)` }).from(farmPrintJobs).where(eq(farmPrintJobs.status, "queued")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(farmPrintJobs)
      .where(
        and(
          eq(farmPrintJobs.status, "completed"),
          gte(farmPrintJobs.printCompletedAt, sql`${todayStart}`)
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(farmMaterials)
      .where(sql`${farmMaterials.totalQuantity} - ${farmMaterials.usedQuantity} < 100`),
    db.query.farmPrinters.findMany({
      orderBy: [desc(farmPrinters.status)],
    }),
    db.query.farmPrintJobs.findMany({
      orderBy: [desc(farmPrintJobs.queuedAt)],
      limit: 6,
      with: { printer: true },
    }),
    db.query.farmMaintenanceTasks.findMany({
      where: inArray(farmMaintenanceTasks.status, ["due", "overdue"]),
      orderBy: [desc(farmMaintenanceTasks.dueAt)],
      limit: 4,
      with: { printer: true },
    }),
  ]);

  const stats = [
    {
      label: t("totalPrinters"),
      value: totalPrintersResult[0]?.count ?? 0,
      color: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Printer size={20} />,
      href: `/${locale}/admin/printers`,
    },
    {
      label: t("activePrinters"),
      value: activePrintersResult[0]?.count ?? 0,
      color: "bg-green-50 text-green-700 border-green-200",
      icon: <Zap size={20} />,
      href: `/${locale}/admin/monitoring`,
    },
    {
      label: t("activeJobs"),
      value: activeJobsResult[0]?.count ?? 0,
      color: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <PlayCircle size={20} />,
      href: `/${locale}/admin/jobs`,
    },
    {
      label: t("queuedJobs"),
      value: queuedJobsResult[0]?.count ?? 0,
      color: "bg-purple-50 text-purple-700 border-purple-200",
      icon: <Clock size={20} />,
      href: `/${locale}/admin/jobs`,
    },
    {
      label: t("completedToday"),
      value: completedTodayResult[0]?.count ?? 0,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircle2 size={20} />,
      href: `/${locale}/admin/jobs`,
    },
    {
      label: t("materialWarnings"),
      value: materialWarningsResult[0]?.count ?? 0,
      color: "bg-red-50 text-red-700 border-red-200",
      icon: <AlertTriangle size={20} />,
      href: `/${locale}/admin/materials`,
    },
  ];

  const quickActions = [
    { label: "Drucker hinzufügen", href: `/${locale}/admin/printers/new`, icon: <Printer size={16} />, color: "border-amber-200 text-amber-700 hover:bg-amber-50" },
    { label: "Job erstellen",      href: `/${locale}/admin/jobs/new`,     icon: <PlayCircle size={16} />, color: "border-blue-200 text-blue-700 hover:bg-blue-50" },
    { label: "Modell hochladen",   href: `/${locale}/admin/models`,       icon: <Box size={16} />,        color: "border-purple-200 text-purple-700 hover:bg-purple-50" },
    { label: "Batch erstellen",    href: `/${locale}/admin/batch/new`,    icon: <ClipboardList size={16} />, color: "border-green-200 text-green-700 hover:bg-green-50" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-500 mt-1">3D Print Farm Management</p>
      </div>

      {/* Maintenance Alerts */}
      {dueTasks.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">
                {dueTasks.length} Wartungsaufgabe{dueTasks.length !== 1 ? "n" : ""} ausstehend
              </span>
            </div>
            <Link
              href={`/${locale}/admin/maintenance`}
              className="text-xs text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1"
            >
              Alle anzeigen <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {dueTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                      MAINTENANCE_STATUS_STYLE[task.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {MAINTENANCE_STATUS_LABEL[task.status] ?? task.status}
                  </span>
                  <span className="text-amber-900 font-medium truncate">{task.name}</span>
                  {task.printer && (
                    <span className="text-amber-600 text-xs shrink-0">— {task.printer.name}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`rounded-xl border p-5 ${stat.color} hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{stat.label}</p>
              <span className="opacity-60">{stat.icon}</span>
            </div>
            <p className="text-3xl font-bold mt-2">{stat.value}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Schnellzugriff
        </h2>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${action.color}`}
            >
              {action.icon}
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Printer Status Overview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Drucker-Status
            </h2>
            <Link
              href={`/${locale}/admin/printers`}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              Alle <ArrowRight size={12} />
            </Link>
          </div>
          {allPrinters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <Printer size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-400 mb-3">Noch keine Drucker konfiguriert</p>
              <Link
                href={`/${locale}/admin/printers/new`}
                className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-800 font-medium"
              >
                <Plus size={14} /> Drucker hinzufügen
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {allPrinters.map((printer) => {
                const status = STATUS_CONFIG[printer.status] ?? STATUS_CONFIG.offline;
                return (
                  <Link
                    key={printer.id}
                    href={`/${locale}/admin/printers/${printer.id}`}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 ${status.bg} hover:shadow-sm transition-shadow`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2.5 h-2.5 shrink-0 rounded-full ${status.dot}`} />
                      <span className="text-sm font-medium text-gray-900 truncate">{printer.name}</span>
                      <span className="text-xs text-gray-400 uppercase shrink-0">{printer.technology}</span>
                    </div>
                    <span className={`text-xs font-medium shrink-0 ${status.text}`}>
                      {status.labelDe}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Jobs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Aktuelle Jobs
            </h2>
            <Link
              href={`/${locale}/admin/jobs`}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              Alle <ArrowRight size={12} />
            </Link>
          </div>
          {recentJobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <PlayCircle size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-400 mb-3">Noch keine Druckaufträge</p>
              <Link
                href={`/${locale}/admin/jobs/new`}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus size={14} /> Job erstellen
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="divide-y divide-gray-100">
                {recentJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/${locale}/admin/jobs/${job.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{job.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {job.printer?.name ?? "Kein Drucker"} &middot;{" "}
                        {formatRelativeTime(job.queuedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      {job.status === "printing" && job.progressPercent != null && (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${job.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 tabular-nums w-8">{job.progressPercent}%</span>
                        </div>
                      )}
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          JOB_STATUS_STYLE[job.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {JOB_STATUS_LABEL[job.status] ?? job.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

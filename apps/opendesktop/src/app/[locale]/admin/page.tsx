import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import {
  deskWorkstations,
  deskWorkflowRuns,
  deskIssues,
  deskEquipment,
  deskPrinterLinks,
  deskVorgaenge,
  deskTasks,
  deskFlows,
  deskModules,
} from "@/db/schema";
import { eq, sql, or } from "drizzle-orm";
import {
  Monitor,
  Zap,
  PlayCircle,
  AlertTriangle,
  Wrench,
  Printer,
  FolderKanban,
  ClipboardCheck,
  Workflow,
  Boxes,
} from "lucide-react";

interface AdminDashboardProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminDashboardPage({ params }: AdminDashboardProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("dashboard");

  const [
    activeVorgaengeResult,
    openTasksResult,
    liveFlowsResult,
    totalModulesResult,
    totalWorkstationsResult,
    activeWorkstationsResult,
    runningWorkflowsResult,
    openIssuesResult,
    equipmentWarningsResult,
    connectedPrintersResult,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(deskVorgaenge)
      .where(eq(deskVorgaenge.globalStatus, "aktiv")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(deskTasks)
      .where(eq(deskTasks.status, "offen")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(deskFlows)
      .where(eq(deskFlows.status, "live")),
    db.select({ count: sql<number>`count(*)` }).from(deskModules),
    db.select({ count: sql<number>`count(*)` }).from(deskWorkstations),
    db
      .select({ count: sql<number>`count(*)` })
      .from(deskWorkstations)
      .where(eq(deskWorkstations.status, "active")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(deskWorkflowRuns)
      .where(eq(deskWorkflowRuns.status, "running")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(deskIssues)
      .where(eq(deskIssues.status, "open")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(deskEquipment)
      .where(
        or(
          eq(deskEquipment.status, "broken"),
          eq(deskEquipment.status, "maintenance")
        )
      ),
    db.select({ count: sql<number>`count(*)` }).from(deskPrinterLinks),
  ]);

  const stats = [
    {
      label: t("activeVorgaenge"),
      value: activeVorgaengeResult[0]?.count ?? 0,
      color: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: <FolderKanban size={20} />,
    },
    {
      label: t("openTasks"),
      value: openTasksResult[0]?.count ?? 0,
      color: "bg-violet-50 text-violet-700 border-violet-200",
      icon: <ClipboardCheck size={20} />,
    },
    {
      label: t("liveFlows"),
      value: liveFlowsResult[0]?.count ?? 0,
      color: "bg-cyan-50 text-cyan-700 border-cyan-200",
      icon: <Workflow size={20} />,
    },
    {
      label: t("totalModules"),
      value: totalModulesResult[0]?.count ?? 0,
      color: "bg-teal-50 text-teal-700 border-teal-200",
      icon: <Boxes size={20} />,
    },
    {
      label: t("totalWorkstations"),
      value: totalWorkstationsResult[0]?.count ?? 0,
      color: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: <Monitor size={20} />,
    },
    {
      label: t("activeWorkstations"),
      value: activeWorkstationsResult[0]?.count ?? 0,
      color: "bg-green-50 text-green-700 border-green-200",
      icon: <Zap size={20} />,
    },
    {
      label: t("runningWorkflows"),
      value: runningWorkflowsResult[0]?.count ?? 0,
      color: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <PlayCircle size={20} />,
    },
    {
      label: t("openIssues"),
      value: openIssuesResult[0]?.count ?? 0,
      color: "bg-red-50 text-red-700 border-red-200",
      icon: <AlertTriangle size={20} />,
    },
    {
      label: t("equipmentWarnings"),
      value: equipmentWarningsResult[0]?.count ?? 0,
      color: "bg-orange-50 text-orange-700 border-orange-200",
      icon: <Wrench size={20} />,
    },
    {
      label: t("connectedPrinters"),
      value: connectedPrintersResult[0]?.count ?? 0,
      color: "bg-purple-50 text-purple-700 border-purple-200",
      icon: <Printer size={20} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Arbeitsplatz-Verwaltung & Workflow-Management
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border p-5 ${stat.color}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{stat.label}</p>
              <span className="opacity-60">{stat.icon}</span>
            </div>
            <p className="text-3xl font-bold mt-2">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

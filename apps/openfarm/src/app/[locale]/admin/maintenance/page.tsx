import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getMaintenanceTasks, getDueTasks, getSpareParts, getLowStockParts } from "@/db/queries/maintenance";
import Link from "next/link";
import { Wrench, AlertTriangle, Package, Clock, CheckCircle, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  planned: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  due: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  skipped: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  routine: <Clock className="w-4 h-4" />,
  preventive: <Wrench className="w-4 h-4" />,
  corrective: <AlertCircle className="w-4 h-4" />,
  calibration: <CheckCircle className="w-4 h-4" />,
};

export default async function MaintenancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("maintenance");

  const allTasks = await getMaintenanceTasks();
  const dueTasks = await getDueTasks();
  const spareParts = await getSpareParts();
  const lowStock = await getLowStockParts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/${locale}/admin/maintenance/tasks/new`}
            className="px-4 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium rounded-lg hover:opacity-90"
          >
            {t("addTask")}
          </Link>
          <Link
            href={`/${locale}/admin/maintenance/parts`}
            className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Package className="w-4 h-4 inline mr-1" />
            {t("spareParts")}
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {(dueTasks.length > 0 || lowStock.length > 0) && (
        <div className="space-y-2">
          {dueTasks.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <span className="text-sm text-amber-800 dark:text-amber-300">
                {t("dueTasksAlert", { count: dueTasks.length })}
              </span>
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-800 dark:text-red-300">
                {t("lowStockAlert", { count: lowStock.length })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Task list */}
      {allTasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t("noTasks")}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t("taskName")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t("printer")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t("type")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t("status")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t("dueDate")}</th>
              </tr>
            </thead>
            <tbody>
              {allTasks.map((task) => (
                <tr key={task.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {TYPE_ICONS[task.type] ?? <Wrench className="w-4 h-4" />}
                      <span className="font-medium text-gray-900 dark:text-white">{task.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {(task as any).printer?.name ?? "\u2014"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="capitalize text-gray-600 dark:text-gray-400">{task.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[task.status] ?? STATUS_STYLES.planned}`}>
                      {t(`statuses.${task.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

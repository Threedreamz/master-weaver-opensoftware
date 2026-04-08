import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { deskTasks } from "@/db/schema";
import { desc } from "drizzle-orm";
import { CheckSquare, Plus, Trash2, Calendar, User } from "lucide-react";
import { deleteTask, updateTaskStatus } from "./actions";

interface TasksPageProps {
  params: Promise<{ locale: string }>;
}

const taskStatusBadge: Record<string, string> = {
  offen: "bg-red-100 text-red-700",
  in_bearbeitung: "bg-blue-100 text-blue-700",
  erledigt: "bg-green-100 text-green-700",
  storniert: "bg-gray-100 text-gray-500",
};

const priorityBadge: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default async function TasksPage({ params }: TasksPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("tasks");
  const tc = await getTranslations("common");

  const tasks = await db.query.deskTasks.findMany({
    with: {
      vorgang: true,
      module: true,
    },
    orderBy: [desc(deskTasks.createdAt)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <Link
          href={`/${locale}/admin/tasks/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          {t("addTask")}
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <CheckSquare size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">{t("noTasks")}</p>
          <p className="text-gray-400 text-sm mt-1">{t("noTasksHint")}</p>
          <Link
            href={`/${locale}/admin/tasks/new`}
            className="inline-flex items-center gap-2 mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            {t("addTask")}
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tc("title")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vorgang
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Modul
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priorität
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tc("status")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zugewiesen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fällig
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tc("actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <span className="font-medium text-gray-900">{task.title}</span>
                      {task.blocksAdvance && (
                        <span className="ml-2 inline-block text-xs font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-600">
                          Blockiert
                        </span>
                      )}
                      {task.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {task.vorgang ? (
                      <Link
                        href={`/${locale}/admin/vorgaenge/${task.vorgangId}`}
                        className="font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded transition-colors"
                      >
                        {task.vorgang.globalId}
                      </Link>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {task.module ? (
                      <span
                        className="inline-block text-xs font-medium px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: task.module.color || "#6366f1" }}
                      >
                        {task.module.name}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${priorityBadge[task.priority] || "bg-gray-100 text-gray-600"}`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <form action={updateTaskStatus} className="inline">
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <select
                        name="status"
                        defaultValue={task.status}
                        onChange={(e) => {
                          const form = e.target.closest("form") as HTMLFormElement;
                          if (form) form.requestSubmit();
                        }}
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none ${taskStatusBadge[task.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        <option value="offen">offen</option>
                        <option value="in_bearbeitung">in Bearbeitung</option>
                        <option value="erledigt">erledigt</option>
                        <option value="storniert">storniert</option>
                      </select>
                    </form>
                  </td>
                  <td className="px-6 py-4">
                    {task.assignedTo ? (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <User size={12} className="text-gray-400" />
                        {task.assignedTo}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {task.deadline ? (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Calendar size={12} className="text-gray-400" />
                        {new Date(task.deadline).toLocaleDateString("de-DE")}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end">
                      <form action={deleteTask}>
                        <input type="hidden" name="id" value={task.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <button
                          type="submit"
                          className="inline-flex items-center text-xs text-red-400 hover:text-red-600 transition-colors"
                          title={tc("delete")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </div>
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

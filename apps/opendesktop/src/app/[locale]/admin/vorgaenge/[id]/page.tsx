import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { deskVorgangHistory, deskTasks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  User,
  MessageSquare,
  Clock,
  CheckSquare,
  Paperclip,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { VorgangActions } from "./VorgangActions";
import { addVorgangComment, assignVorgang, deleteVorgang, advanceVorgangAction, uploadVorgangFile } from "../actions";

interface VorgangDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

const statusBadge: Record<string, string> = {
  entwurf: "bg-gray-100 text-gray-600",
  aktiv: "bg-blue-100 text-blue-700",
  pausiert: "bg-yellow-100 text-yellow-700",
  abgeschlossen: "bg-green-100 text-green-700",
  storniert: "bg-red-100 text-red-700",
};

const priorityBadge: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const taskStatusBadge: Record<string, string> = {
  offen: "bg-red-100 text-red-700",
  in_bearbeitung: "bg-blue-100 text-blue-700",
  erledigt: "bg-green-100 text-green-700",
  storniert: "bg-gray-100 text-gray-500",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function VorgangDetailPage({ params }: VorgangDetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("vorgaenge");
  const tc = await getTranslations("common");
  const tt = await getTranslations("tasks");

  const vorgang = await db.query.deskVorgaenge.findFirst({
    where: (v, { eq }) => eq(v.id, id),
    with: {
      currentModule: true,
      flow: true,
      history: {
        orderBy: [desc(deskVorgangHistory.createdAt)],
      },
      comments: {
        orderBy: (c, { desc }) => [desc(c.createdAt)],
      },
      files: {
        orderBy: (f, { desc }) => [desc(f.createdAt)],
      },
      tasks: {
        orderBy: (tk, { desc }) => [desc(tk.createdAt)],
      },
    },
  });

  if (!vorgang) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/vorgaenge`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {tc("back")}
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                {vorgang.globalId}
              </span>
              <span
                className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[vorgang.globalStatus] || "bg-gray-100 text-gray-600"}`}
              >
                {vorgang.globalStatus}
              </span>
              <span
                className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${priorityBadge[vorgang.priority] || "bg-gray-100 text-gray-600"}`}
              >
                {vorgang.priority}
              </span>
              {vorgang.currentModule && (
                <span
                  className="inline-block text-xs font-medium px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: vorgang.currentModule.color || "#6366f1" }}
                >
                  {vorgang.currentModule.name}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{vorgang.title}</h1>
            {vorgang.description && (
              <p className="text-sm text-gray-500 mt-1">{vorgang.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              {vorgang.deadline && (
                <div className="flex items-center gap-1">
                  <Calendar size={13} />
                  {tc("due")}: {new Date(vorgang.deadline).toLocaleDateString(locale)}
                </div>
              )}
              {vorgang.assignedTo && (
                <div className="flex items-center gap-1">
                  <User size={13} />
                  {vorgang.assignedTo}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock size={13} />
                {tc("created")}: {new Date(vorgang.createdAt).toLocaleDateString(locale)}
              </div>
            </div>
          </div>
          <form action={deleteVorgang}>
            <input type="hidden" name="id" value={vorgang.id} />
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
              title={tc("delete")}
            >
              <Trash2 size={16} />
            </button>
          </form>
        </div>

        {/* Status transitions */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">{t("statusTransition")}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <VorgangActions
              vorgangId={vorgang.id}
              currentStatus={vorgang.globalStatus}
              locale={locale}
            />
            {vorgang.globalStatus === "aktiv" && vorgang.flowId && (
              <form action={advanceVorgangAction}>
                <input type="hidden" name="id" value={vorgang.id} />
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  <ArrowRight size={14} />
                  {t("advanceToNext")}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Assign */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <form action={assignVorgang} className="flex items-center gap-2">
            <input type="hidden" name="id" value={vorgang.id} />
            <input type="hidden" name="locale" value={locale} />
            <input
              type="text"
              name="assignedTo"
              defaultValue={vorgang.assignedTo ?? ""}
              placeholder={t("assignPlaceholder")}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none max-w-xs"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <User size={12} />
              {t("assign")}
            </button>
          </form>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 bg-gray-50 border-b border-gray-100">
          <Clock size={18} className="text-indigo-500" />
          <h2 className="text-base font-semibold text-gray-900">{t("timeline")}</h2>
          <span className="text-xs text-gray-400">({vorgang.history.length})</span>
        </div>
        {vorgang.history.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">{t("noHistory")}</div>
        ) : (
          <div className="px-6 py-4">
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-4">
                {vorgang.history.map((entry) => (
                  <div key={entry.id} className="relative pl-10">
                    <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-indigo-400 border-2 border-white ring-1 ring-indigo-200" />
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-700 capitalize">
                            {entry.action.replace(/_/g, " ")}
                          </span>
                          {entry.oldStatus && entry.newStatus && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-medium ${statusBadge[entry.oldStatus] || "bg-gray-100 text-gray-600"}`}
                              >
                                {entry.oldStatus}
                              </span>
                              <ArrowRight size={10} className="text-gray-400" />
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-medium ${statusBadge[entry.newStatus] || "bg-gray-100 text-gray-600"}`}
                              >
                                {entry.newStatus}
                              </span>
                            </span>
                          )}
                        </div>
                        {entry.comment && (
                          <p className="text-xs text-gray-500 mt-0.5">{entry.comment}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(entry.createdAt).toLocaleDateString(locale)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 bg-gray-50 border-b border-gray-100">
          <MessageSquare size={18} className="text-indigo-500" />
          <h2 className="text-base font-semibold text-gray-900">{t("comments")}</h2>
          <span className="text-xs text-gray-400">({vorgang.comments.length})</span>
        </div>
        <div className="divide-y divide-gray-100">
          {vorgang.comments.map((comment) => (
            <div key={comment.id} className="px-6 py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{comment.content}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(comment.createdAt).toLocaleDateString(locale)}
                </span>
              </div>
            </div>
          ))}
          {vorgang.comments.length === 0 && (
            <div className="px-6 py-6 text-center text-gray-400 text-sm">
              {t("noComments")}
            </div>
          )}
        </div>
        {/* Add comment form */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <form action={addVorgangComment} className="space-y-2">
            <input type="hidden" name="vorgangId" value={vorgang.id} />
            <input type="hidden" name="locale" value={locale} />
            <textarea
              name="content"
              required
              rows={3}
              placeholder={t("commentPlaceholder")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <MessageSquare size={12} />
                {t("sendComment")}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Tasks */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CheckSquare size={18} className="text-indigo-500" />
            <h2 className="text-base font-semibold text-gray-900">{t("tasks")}</h2>
            <span className="text-xs text-gray-400">({vorgang.tasks.length})</span>
          </div>
          <Link
            href={`/${locale}/admin/tasks/new?vorgangId=${vorgang.id}`}
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            + {tt("addTask")}
          </Link>
        </div>
        {vorgang.tasks.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">{t("noTasksForVorgang")}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {tc("title")}
                </th>
                <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  {tc("status")}
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t("assignedTo")}
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {tc("due")}
                </th>
                <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  {tc("priority")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vorgang.tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">{task.title}</td>
                  <td className="px-6 py-3 text-center">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${taskStatusBadge[task.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {task.assignedTo ? (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <User size={12} className="text-gray-400" />
                        {task.assignedTo}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {task.deadline ? (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Calendar size={12} className="text-gray-400" />
                        {new Date(task.deadline).toLocaleDateString(locale)}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${priorityBadge[task.priority] || "bg-gray-100 text-gray-600"}`}
                    >
                      {task.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Files */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 bg-gray-50 border-b border-gray-100">
          <Paperclip size={18} className="text-indigo-500" />
          <h2 className="text-base font-semibold text-gray-900">{t("files")}</h2>
          <span className="text-xs text-gray-400">({vorgang.files.length})</span>
        </div>
        {vorgang.files.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">{t("noFiles")}</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {vorgang.files.map((file) => (
              <div key={file.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <Paperclip size={14} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.filename}</p>
                    <p className="text-xs text-gray-400">
                      {file.fileSize ? formatBytes(file.fileSize) : "—"} ·{" "}
                      {new Date(file.createdAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                </div>
                {file.uploadedBy && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <User size={12} />
                    {file.uploadedBy}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Upload form */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <form action={uploadVorgangFile} encType="multipart/form-data" className="flex items-center gap-3">
            <input type="hidden" name="vorgangId" value={vorgang.id} />
            <input type="hidden" name="locale" value={locale} />
            <input
              type="file"
              name="file"
              required
              className="flex-1 text-xs text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors flex-shrink-0"
            >
              <Paperclip size={12} />
              {tc("upload")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { deleteIssue, updateIssueStatus } from "./actions";

interface IssuesPageProps {
  params: Promise<{ locale: string }>;
}

const priorityBadge: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-500",
};

const statusBadge: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default async function IssuesPage({ params }: IssuesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("issues");
  const tc = await getTranslations("common");

  const issues = await db.query.deskIssues.findMany({
    with: { workstation: true },
    orderBy: (i, { desc }) => [desc(i.createdAt)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("description")}</p>
        </div>
        <Link
          href={`/${locale}/admin/issues/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          {t("addIssue")}
        </Link>
      </div>

      {issues.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <AlertTriangle size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{t("noIssues")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("issueTitle")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("workstation")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("priority")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("status")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("category")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("createdAt")}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr
                  key={issue.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{issue.title}</span>
                    {issue.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{issue.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {issue.workstation?.code ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${priorityBadge[issue.priority] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {issue.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[issue.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {issue.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{issue.category}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(issue.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      {issue.status === "open" && (
                        <form action={updateIssueStatus}>
                          <input type="hidden" name="id" value={issue.id} />
                          <input type="hidden" name="status" value="in_progress" />
                          <input type="hidden" name="locale" value={locale} />
                          <button
                            type="submit"
                            className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                          >
                            {t("startProgress")}
                          </button>
                        </form>
                      )}
                      {issue.status === "in_progress" && (
                        <form action={updateIssueStatus}>
                          <input type="hidden" name="id" value={issue.id} />
                          <input type="hidden" name="status" value="resolved" />
                          <input type="hidden" name="locale" value={locale} />
                          <button
                            type="submit"
                            className="text-xs text-green-500 hover:text-green-700 transition-colors"
                          >
                            {t("resolve")}
                          </button>
                        </form>
                      )}
                      <form action={deleteIssue}>
                        <input type="hidden" name="id" value={issue.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                          title={tc("delete")}
                        >
                          <Trash2 size={14} />
                          {tc("delete")}
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

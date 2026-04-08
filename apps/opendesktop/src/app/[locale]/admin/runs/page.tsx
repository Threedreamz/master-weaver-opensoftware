import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { PlayCircle, Plus, XCircle } from "lucide-react";
import { cancelRun } from "./actions";

interface RunsPageProps {
  params: Promise<{ locale: string }>;
}

const statusBadge: Record<string, string> = {
  running: "bg-blue-100 text-blue-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function RunsPage({ params }: RunsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("runs");
  const tc = await getTranslations("common");

  const runs = await db.query.deskWorkflowRuns.findMany({
    with: {
      workflow: true,
      workstation: true,
      currentStep: true,
    },
    orderBy: (r, { desc }) => [desc(r.startedAt)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("description")}</p>
        </div>
        <Link
          href={`/${locale}/admin/runs/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          {t("startRun")}
        </Link>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <PlayCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{t("noRuns")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("workflow")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("workstation")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("status")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("currentStep")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("startedAt")}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/${locale}/admin/runs/${run.id}`}
                      className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                    >
                      {run.workflow?.name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {run.workstation?.code ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[run.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {run.currentStep?.name ?? (run.status === "completed" ? t("completed") : "—")}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {formatDate(run.startedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      <Link
                        href={`/${locale}/admin/runs/${run.id}`}
                        className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                      >
                        {tc("view")}
                      </Link>
                      {run.status === "running" && (
                        <form action={cancelRun}>
                          <input type="hidden" name="runId" value={run.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                          >
                            <XCircle size={14} />
                            {t("cancel")}
                          </button>
                        </form>
                      )}
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

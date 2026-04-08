import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { GitBranch, Plus, Trash2 } from "lucide-react";
import { deleteWorkflow } from "./actions";

interface WorkflowsPageProps {
  params: Promise<{ locale: string }>;
}

const statusBadge: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  archived: "bg-yellow-100 text-yellow-700",
};

const typeBadge: Record<string, string> = {
  scanning: "bg-cyan-100 text-cyan-700",
  cad: "bg-blue-100 text-blue-700",
  printing: "bg-purple-100 text-purple-700",
  quality_check: "bg-orange-100 text-orange-700",
  packaging: "bg-teal-100 text-teal-700",
  assembly: "bg-indigo-100 text-indigo-700",
  office: "bg-gray-100 text-gray-700",
  general: "bg-slate-100 text-slate-700",
  any: "bg-gray-100 text-gray-500",
};

export default async function WorkflowsPage({ params }: WorkflowsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("workflows");
  const tc = await getTranslations("common");

  const workflows = await db.query.deskWorkflows.findMany({
    with: { steps: true, runs: true },
    orderBy: (wf, { desc }) => [desc(wf.createdAt)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("description")}</p>
        </div>
        <Link
          href={`/${locale}/admin/workflows/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          {t("addWorkflow")}
        </Link>
      </div>

      {workflows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <GitBranch size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{t("noWorkflows")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("name")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("stationType")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("status")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("steps")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("runs")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("version")}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((wf) => (
                <tr
                  key={wf.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/${locale}/admin/workflows/${wf.id}`}
                      className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                    >
                      {wf.name}
                    </Link>
                    {wf.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{wf.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${typeBadge[wf.workstationType] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {wf.workstationType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[wf.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {wf.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{wf.steps.length}</td>
                  <td className="px-4 py-3 text-gray-700">{wf.runs.length}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      v{wf.version}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      <Link
                        href={`/${locale}/admin/workflows/${wf.id}`}
                        className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                      >
                        {tc("edit")}
                      </Link>
                      <form action={deleteWorkflow}>
                        <input type="hidden" name="id" value={wf.id} />
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

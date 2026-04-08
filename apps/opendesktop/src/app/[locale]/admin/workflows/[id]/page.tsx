import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { deskWorkflows } from "@/db/schema";
import { ArrowLeft, Plus, Trash2, Zap } from "lucide-react";
import { notFound } from "next/navigation";
import { createWorkflowStep, deleteWorkflowStep, activateWorkflow } from "../actions";

interface WorkflowDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
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

const stepTypeBadge: Record<string, string> = {
  manual: "bg-gray-100 text-gray-700",
  automated: "bg-blue-100 text-blue-700",
  approval: "bg-orange-100 text-orange-700",
  checkpoint: "bg-yellow-100 text-yellow-700",
  integration: "bg-purple-100 text-purple-700",
};

export default async function WorkflowDetailPage({ params }: WorkflowDetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("workflows");
  const tc = await getTranslations("common");

  const workflow = await db.query.deskWorkflows.findFirst({
    where: eq(deskWorkflows.id, id),
    with: { steps: true },
  });

  if (!workflow) {
    notFound();
  }

  const sortedSteps = [...workflow.steps].sort((a, b) => a.sortOrder - b.sortOrder);
  const nextSortOrder = sortedSteps.length > 0 ? Math.max(...sortedSteps.map((s) => s.sortOrder)) + 1 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/workflows`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {tc("back")}
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">{workflow.name}</h1>
            {workflow.description && (
              <p className="text-sm text-gray-500">{workflow.description}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[workflow.status] ?? "bg-gray-100 text-gray-600"}`}
              >
                {workflow.status}
              </span>
              <span
                className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${typeBadge[workflow.workstationType] ?? "bg-gray-100 text-gray-600"}`}
              >
                {workflow.workstationType}
              </span>
              <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                v{workflow.version}
              </span>
            </div>
          </div>
          {workflow.status !== "active" && (
            <form action={activateWorkflow}>
              <input type="hidden" name="id" value={workflow.id} />
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
              >
                <Zap size={14} />
                {t("activate")}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Steps table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">
            {t("steps")} ({sortedSteps.length})
          </h2>
        </div>

        {sortedSteps.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">{t("noSteps")}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{tc("name")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("stepType")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("estimatedMinutes")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("integration")}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedSteps.map((step) => (
                <tr
                  key={step.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {step.sortOrder}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{step.name}</span>
                    {step.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{step.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${stepTypeBadge[step.type] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {step.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {step.estimatedMinutes != null ? `${step.estimatedMinutes} min` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {step.integrationApp ? (
                      <span>
                        {step.integrationApp}
                        {step.integrationAction && (
                          <span className="text-gray-400"> / {step.integrationAction}</span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteWorkflowStep}>
                      <input type="hidden" name="id" value={step.id} />
                      <input type="hidden" name="workflowId" value={workflow.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 size={14} />
                        {tc("delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add step form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <Plus size={18} className="inline mr-2" />
          {t("addStep")}
        </h2>
        <form action={createWorkflowStep} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input type="hidden" name="workflowId" value={workflow.id} />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="sortOrder" value={nextSortOrder} />

          <div className="md:col-span-2 lg:col-span-3">
            <label htmlFor="stepName" className="block text-sm font-medium text-gray-700 mb-1">
              {tc("name")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="stepName"
              name="name"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="z.B. Scan durchführen"
            />
          </div>

          <div>
            <label htmlFor="stepType" className="block text-sm font-medium text-gray-700 mb-1">
              {t("stepType")}
            </label>
            <select
              id="stepType"
              name="type"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              defaultValue="manual"
            >
              <option value="manual">Manual</option>
              <option value="automated">Automated</option>
              <option value="approval">Approval</option>
              <option value="checkpoint">Checkpoint</option>
              <option value="integration">Integration</option>
            </select>
          </div>

          <div>
            <label htmlFor="estimatedMinutes" className="block text-sm font-medium text-gray-700 mb-1">
              {t("estimatedMinutes")}
            </label>
            <input
              type="number"
              id="estimatedMinutes"
              name="estimatedMinutes"
              min={0}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="15"
            />
          </div>

          <div>
            <label htmlFor="stepDescription" className="block text-sm font-medium text-gray-700 mb-1">
              {tc("description")}
            </label>
            <input
              type="text"
              id="stepDescription"
              name="description"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="Optionale Beschreibung"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus size={14} />
              {t("addStep")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

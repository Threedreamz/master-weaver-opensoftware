import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { deskWorkflows, deskWorkstations } from "@/db/schema";
import { ArrowLeft } from "lucide-react";
import { startWorkflowRun } from "../actions";

interface NewRunPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewRunPage({ params }: NewRunPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("runs");
  const tc = await getTranslations("common");

  const [activeWorkflows, activeWorkstations] = await Promise.all([
    db.query.deskWorkflows.findMany({
      where: eq(deskWorkflows.status, "active"),
      orderBy: (wf, { asc }) => [asc(wf.name)],
    }),
    db.query.deskWorkstations.findMany({
      where: eq(deskWorkstations.status, "active"),
      orderBy: (ws, { asc }) => [asc(ws.code)],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/runs`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {tc("back")}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t("startRun")}</h1>
      </div>

      <form action={startWorkflowRun} className="space-y-6">
        <input type="hidden" name="locale" value={locale} />

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("runDetails")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="workflowId" className="block text-sm font-medium text-gray-700 mb-1">
                {t("workflow")} <span className="text-red-500">*</span>
              </label>
              {activeWorkflows.length === 0 ? (
                <p className="text-sm text-gray-500 rounded-lg border border-gray-200 px-3 py-2">
                  {t("noActiveWorkflows")}
                </p>
              ) : (
                <select
                  id="workflowId"
                  name="workflowId"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">{t("selectWorkflow")}</option>
                  {activeWorkflows.map((wf) => (
                    <option key={wf.id} value={wf.id}>
                      {wf.name} ({wf.workstationType})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="workstationId" className="block text-sm font-medium text-gray-700 mb-1">
                {t("workstation")} <span className="text-red-500">*</span>
              </label>
              {activeWorkstations.length === 0 ? (
                <p className="text-sm text-gray-500 rounded-lg border border-gray-200 px-3 py-2">
                  {t("noActiveWorkstations")}
                </p>
              ) : (
                <select
                  id="workstationId"
                  name="workstationId"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">{t("selectWorkstation")}</option>
                  {activeWorkstations.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.code} — {ws.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={activeWorkflows.length === 0 || activeWorkstations.length === 0}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("startRun")}
          </button>
          <Link
            href={`/${locale}/admin/runs`}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {tc("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}

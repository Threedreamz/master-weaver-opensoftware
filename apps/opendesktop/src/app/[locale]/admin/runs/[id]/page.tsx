import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { deskWorkflowRuns } from "@/db/schema";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { advanceRunStep, cancelRun } from "../actions";

interface RunDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

const statusBadge: Record<string, string> = {
  running: "bg-blue-100 text-blue-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const runStepColor: Record<string, string> = {
  pending: "bg-gray-100 border-gray-300 text-gray-500",
  in_progress: "bg-blue-100 border-blue-400 text-blue-800",
  completed: "bg-green-100 border-green-400 text-green-800",
  failed: "bg-red-100 border-red-400 text-red-800",
  skipped: "bg-yellow-100 border-yellow-400 text-yellow-800",
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

export default async function RunDetailPage({ params }: RunDetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("runs");
  const tc = await getTranslations("common");

  const run = await db.query.deskWorkflowRuns.findFirst({
    where: eq(deskWorkflowRuns.id, id),
    with: {
      workflow: true,
      workstation: true,
      currentStep: true,
      runSteps: {
        with: { step: true },
      },
    },
  });

  if (!run) {
    notFound();
  }

  const sortedRunSteps = [...run.runSteps].sort(
    (a, b) => a.step.sortOrder - b.step.sortOrder
  );

  const currentRunStep = sortedRunSteps.find(
    (rs) => rs.stepId === run.currentStepId
  );

  const isActive = run.status === "running";

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
      </div>

      {/* Run header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {run.workflow?.name ?? "—"}
            </h1>
            <div className="flex items-center gap-2 flex-wrap text-sm text-gray-600">
              <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                {run.workstation?.code ?? "—"}
              </span>
              <span
                className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[run.status] ?? "bg-gray-100 text-gray-600"}`}
              >
                {run.status}
              </span>
              <span className="text-gray-400 text-xs">
                {t("startedAt")}: {formatDate(run.startedAt)}
              </span>
              {run.completedAt && (
                <span className="text-gray-400 text-xs">
                  {t("completedAt")}: {formatDate(run.completedAt)}
                </span>
              )}
            </div>
          </div>

          {isActive && (
            <form action={cancelRun}>
              <input type="hidden" name="runId" value={run.id} />
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                <XCircle size={14} />
                {t("cancel")}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Progress pipeline */}
      {sortedRunSteps.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{t("progress")}</h2>
          <div className="flex flex-wrap gap-2">
            {sortedRunSteps.map((rs, index) => {
              const isCurrentStep = rs.stepId === run.currentStepId;
              return (
                <div
                  key={rs.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all ${runStepColor[rs.status] ?? "bg-gray-100 text-gray-500"} ${isCurrentStep ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}
                >
                  <span className="font-mono text-gray-400">{index + 1}</span>
                  <span>{rs.step.name}</span>
                  {rs.status === "completed" && <CheckCircle size={12} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step details table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">{t("steps")}</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">{tc("name")}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">{t("stepStatus")}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">{t("startedAt")}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">{t("completedAt")}</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {sortedRunSteps.map((rs, index) => {
              const isCurrentStep = rs.stepId === run.currentStepId;
              return (
                <tr
                  key={rs.id}
                  className={`border-b border-gray-100 last:border-0 transition-colors ${isCurrentStep ? "bg-blue-50" : "hover:bg-gray-50"}`}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${isCurrentStep ? "text-blue-800" : "text-gray-900"}`}>
                      {rs.step.name}
                    </span>
                    {isCurrentStep && (
                      <span className="ml-2 text-xs bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded">
                        {t("current")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${runStepColor[rs.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {rs.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(rs.startedAt ?? null)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(rs.completedAt ?? null)}</td>
                  <td className="px-4 py-3 text-right">
                    {isActive && isCurrentStep && (
                      <form action={advanceRunStep}>
                        <input type="hidden" name="runId" value={run.id} />
                        <input type="hidden" name="stepId" value={rs.stepId} />
                        <input type="hidden" name="locale" value={locale} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle size={12} />
                          {t("completeStep")}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

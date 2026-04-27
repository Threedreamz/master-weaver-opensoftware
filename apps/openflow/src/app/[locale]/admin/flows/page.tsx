import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { getFlowsWithFirstStep } from "@/db/queries/flows";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { DeleteFlowButton } from "./DeleteFlowButton";
import { FlowActions } from "./FlowActions";
import { FlowPreview } from "./FlowPreview";
import { AIFlowButton } from "./AIFlowButton";
import { FlowNameEditor } from "./FlowNameEditor";

interface FlowsPageProps {
  params: Promise<{ locale: string }>;
}

function getFlowTheme(settings: string | null): { primaryColor?: string; backgroundColor?: string } {
  try {
    return JSON.parse(settings ?? "{}").theme ?? {};
  } catch {
    return {};
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        Veröffentlicht
      </span>
    );
  }
  if (status === "archived") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        Archiviert
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      Inaktiv
    </span>
  );
}

export default async function FlowsPage({ params }: FlowsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const flowsList = await getFlowsWithFirstStep({ limit: 100 });

  const submissionCounts = await db
    .select({ flowId: submissions.flowId, count: sql<number>`count(*)` })
    .from(submissions)
    .groupBy(submissions.flowId);

  const submissionCountMap = new Map(submissionCounts.map((r) => [r.flowId, r.count]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flows</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your multi-step flows</p>
        </div>
        <div className="flex items-center gap-2">
          <AIFlowButton locale={locale} />
          <Link
            href={`/${locale}/admin/flows/new`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <span>+</span>
            New Flow
          </Link>
        </div>
      </div>

      {flowsList.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-indigo-600 text-xl">✦</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No flows yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Create your first multi-step flow to get started.
          </p>
          <Link
            href={`/${locale}/admin/flows/new`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Create Flow
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {flowsList.map((flow) => {
            const theme = getFlowTheme(flow.settings);
            const bgColor = theme.backgroundColor ?? "#ffffff";
            const primaryColor = theme.primaryColor ?? "#6366f1";
            const firstStep = flow.steps.find((s) => s.type === "step") ?? flow.steps[0] ?? null;
            const submissionCount = submissionCountMap.get(flow.id) ?? 0;

            return (
              <div key={flow.id} className="group relative">
                {/* Vorschau-Karte */}
                <Link href={`/${locale}/flow/${flow.id}/build`}>
                  <div
                    className="rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    style={{ backgroundColor: bgColor, aspectRatio: "4/3" }}
                  >
                    <FlowPreview step={firstStep} primaryColor={primaryColor} />
                  </div>
                </Link>

                {/* "..." Aktions-Menü — oben rechts, bei Hover sichtbar */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg shadow px-1 py-0.5">
                    <DeleteFlowButton flowId={flow.id} flowStatus={flow.status} />
                    <FlowActions flowId={flow.id} flowStatus={flow.status} />
                  </div>
                </div>

                {/* Metadaten */}
                <div className="mt-2.5 px-0.5">
                  <div className="flex items-start justify-between gap-1">
                    <FlowNameEditor flowId={flow.id} initialName={flow.name} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={flow.status} />
                    {submissionCount > 0 && (
                      <span className="text-xs text-gray-400">{submissionCount} Einsendungen</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">/{flow.slug}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

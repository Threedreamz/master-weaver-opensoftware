import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { deskFlows, deskModules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft, Radio, Archive, GitBranch } from "lucide-react";
import { FlowCanvas } from "@/components/flow/FlowCanvas";
import { publishFlow, archiveFlow } from "../actions";

interface FlowBuilderPageProps {
  params: Promise<{ locale: string; id: string }>;
}

function StatusBadge({ status }: { status: "draft" | "live" | "archived" }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <Radio size={10} />
        Live
      </span>
    );
  }
  if (status === "archived") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
        <Archive size={10} />
        Archiviert
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
      Entwurf
    </span>
  );
}

export default async function FlowBuilderPage({ params }: FlowBuilderPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const flow = await db.query.deskFlows.findFirst({
    where: eq(deskFlows.id, id),
    with: {
      nodes: {
        with: {
          module: true,
        },
      },
      edges: true,
    },
  });

  if (!flow) {
    notFound();
  }

  const availableModules = await db.query.deskModules.findMany({
    where: eq(deskModules.isActive, true),
    orderBy: (m, { asc }) => [asc(m.name)],
  });

  const initialNodes = flow.nodes.map((n) => ({
    id: n.id,
    moduleId: n.moduleId,
    moduleName: n.module.name,
    moduleColor: n.module.color,
    moduleIcon: n.module.icon,
    label: n.label,
    positionX: n.positionX,
    positionY: n.positionY,
    isStart: n.isStart,
    isEnd: n.isEnd,
  }));

  const initialEdges = flow.edges.map((e) => ({
    id: e.id,
    fromNodeId: e.fromNodeId,
    toNodeId: e.toNodeId,
    label: e.label,
    condition: e.condition,
    priority: e.priority,
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/flows`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={14} />
          Flows
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{flow.name}</h1>
              <StatusBadge status={flow.status} />
              <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                v{flow.version}
              </span>
            </div>
            {flow.description && (
              <p className="text-sm text-gray-500 mt-0.5">{flow.description}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {flow.status !== "live" && (
            <form action={publishFlow}>
              <input type="hidden" name="id" value={flow.id} />
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
              >
                <Radio size={14} />
                Veröffentlichen
              </button>
            </form>
          )}
          {flow.status !== "archived" && (
            <form action={archiveFlow}>
              <input type="hidden" name="id" value={flow.id} />
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100 transition-colors"
              >
                <Archive size={14} />
                Archivieren
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>
          <strong className="text-gray-800">{flow.nodes.length}</strong> Knoten
        </span>
        <span>·</span>
        <span>
          <strong className="text-gray-800">{flow.edges.length}</strong> Verbindungen
        </span>
        {flow.publishedAt && (
          <>
            <span>·</span>
            <span>
              Veröffentlicht:{" "}
              {new Date(flow.publishedAt).toLocaleDateString("de-DE")}
            </span>
          </>
        )}
      </div>

      {/* Flow Canvas */}
      {availableModules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <GitBranch size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Keine aktiven Module verfügbar</p>
          <p className="text-gray-400 text-sm mt-1">
            Erstelle zuerst Module unter{" "}
            <Link
              href={`/${locale}/admin/modules`}
              className="text-indigo-600 hover:underline"
            >
              Admin → Module
            </Link>
          </p>
        </div>
      ) : (
        <FlowCanvas
          flowId={flow.id}
          locale={locale}
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          availableModules={availableModules}
        />
      )}
    </div>
  );
}

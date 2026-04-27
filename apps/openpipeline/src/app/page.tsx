import Link from "next/link";
import { db, schema } from "@/db";
import { eq, isNull } from "drizzle-orm";
import { Plus, FolderKanban, ArrowRight, Users, CheckSquare } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  entwurf: "bg-zinc-700",
  aktiv: "bg-green-700",
  pausiert: "bg-yellow-700",
  abgeschlossen: "bg-blue-700",
  archiviert: "bg-zinc-800",
};

export default async function DashboardPage() {
  const pipelines = db
    .select()
    .from(schema.pipPipelines)
    .where(isNull(schema.pipPipelines.elternPipelineId))
    .all();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderKanban className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-zinc-100">OpenPipeline</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/accounts"
              className="px-3 py-1.5 text-sm rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center gap-1"
            >
              <Users className="w-4 h-4" />
              Accounts
            </Link>
            <Link
              href="/checklisten"
              className="px-3 py-1.5 text-sm rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center gap-1"
            >
              <CheckSquare className="w-4 h-4" />
              Checklisten
            </Link>
            <Link
              href="/vorlagen"
              className="px-3 py-1.5 text-sm rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Vorlagen
            </Link>
            <Link
              href="/generator"
              className="px-3 py-1.5 text-sm rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Generator
            </Link>
            <Link
              href="/pipelines/neu"
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Neue Pipeline
            </Link>
          </div>
        </div>
      </header>

      {/* Pipeline Grid */}
      <main className="p-6">
        {pipelines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <FolderKanban className="w-12 h-12 mb-4 text-zinc-600" />
            <p className="text-lg mb-2">Noch keine Pipelines</p>
            <p className="text-sm mb-6">Erstelle deine erste Pipeline oder nutze den Generator.</p>
            <div className="flex gap-3">
              <Link
                href="/pipelines/neu"
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500"
              >
                Neue Pipeline
              </Link>
              <Link
                href="/generator"
                className="px-4 py-2 text-sm rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                Generator nutzen
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pipelines.map((pipeline) => (
              <Link
                key={pipeline.id}
                href={`/pipelines/${pipeline.id}`}
                className="group bg-zinc-900 rounded-xl p-4 border border-zinc-800 hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {pipeline.farbe && (
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pipeline.farbe }} />
                    )}
                    <h3 className="font-semibold text-zinc-100">{pipeline.name}</h3>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded capitalize ${STATUS_COLORS[pipeline.status] ?? "bg-zinc-700"} text-zinc-200`}>
                    {pipeline.status}
                  </span>
                </div>

                {pipeline.beschreibung && (
                  <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{pipeline.beschreibung}</p>
                )}

                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{pipeline.typ}</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 text-zinc-400 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

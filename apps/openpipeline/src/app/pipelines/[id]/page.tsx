import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import { PipelineNav } from "@/components/pipeline/PipelineNav";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { NotificationBell } from "@/components/kanban/NotificationBell";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PipelinePage({ params }: Props) {
  const { id } = await params;

  const pipeline = db
    .select()
    .from(schema.pipPipelines)
    .where(eq(schema.pipPipelines.id, id))
    .get();

  if (!pipeline) notFound();

  // Build breadcrumb by walking up the parent chain
  const breadcrumb: { id: string; name: string }[] = [];
  let current = pipeline;
  while (current) {
    breadcrumb.unshift({ id: current.id, name: current.name });
    if (current.elternPipelineId) {
      const parent = db
        .select()
        .from(schema.pipPipelines)
        .where(eq(schema.pipPipelines.id, current.elternPipelineId))
        .get();
      current = parent ?? null;
    } else {
      break;
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <PipelineNav breadcrumb={breadcrumb} />

      {/* Pipeline header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {pipeline.farbe && (
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pipeline.farbe }} />
          )}
          <h1 className="text-lg font-bold text-zinc-100">{pipeline.name}</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 capitalize">
            {pipeline.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/pipelines/${pipeline.id}/einstellungen`}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            title="Einstellungen"
          >
            <Settings className="w-5 h-5" />
          </Link>
          <NotificationBell />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard pipelineId={pipeline.id} />
      </div>
    </div>
  );
}

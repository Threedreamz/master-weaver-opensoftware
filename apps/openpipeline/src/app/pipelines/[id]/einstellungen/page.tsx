import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FolderKanban } from "lucide-react";
import { MitgliederVerwaltung } from "@/components/settings/MitgliederVerwaltung";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EinstellungenPage({ params }: Props) {
  const { id } = await params;

  const pipeline = db
    .select()
    .from(schema.pipPipelines)
    .where(eq(schema.pipPipelines.id, id))
    .get();

  if (!pipeline) notFound();

  const stufen = db
    .select()
    .from(schema.pipStufen)
    .where(eq(schema.pipStufen.pipelineId, id))
    .all()
    .sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/pipelines/${pipeline.id}`}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <FolderKanban className="w-5 h-5 text-blue-400" />
            {pipeline.farbe && (
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pipeline.farbe }} />
            )}
            <h1 className="text-lg font-bold text-zinc-100">{pipeline.name}</h1>
            <span className="text-xs text-zinc-500">Einstellungen</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-6">
        <MitgliederVerwaltung
          pipelineId={pipeline.id}
          stufen={stufen.map((s) => ({ id: s.id, name: s.name }))}
        />
      </main>
    </div>
  );
}

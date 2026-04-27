import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

interface Params { params: Promise<{ id: string }> }

// GET /api/pipelines/:id/automatisierungen
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const automatisierungen = db
    .select()
    .from(schema.pipAutomatisierungen)
    .where(eq(schema.pipAutomatisierungen.pipelineId, id))
    .all();

  return NextResponse.json(automatisierungen);
}

// POST /api/pipelines/:id/automatisierungen — Create automation rule
export async function POST(req: NextRequest, { params }: Params) {
  const { id: pipelineId } = await params;
  const body = await req.json();
  const { name, ausloeser, bedingungen, aktionen, aktiv } = body;

  if (!name || !ausloeser) {
    return NextResponse.json({ error: "Name und Auslöser sind erforderlich" }, { status: 400 });
  }

  const autoId = crypto.randomUUID();
  const now = new Date();

  db.insert(schema.pipAutomatisierungen)
    .values({
      id: autoId,
      pipelineId,
      name,
      ausloeser,
      bedingungen: bedingungen ?? null,
      aktionen: aktionen ?? null,
      aktiv: aktiv ?? true,
      createdAt: now,
    })
    .run();

  const auto = db.select().from(schema.pipAutomatisierungen).where(eq(schema.pipAutomatisierungen.id, autoId)).get();
  return NextResponse.json(auto, { status: 201 });
}

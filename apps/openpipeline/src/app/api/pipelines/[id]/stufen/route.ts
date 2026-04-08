import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

interface Params { params: Promise<{ id: string }> }

// GET /api/pipelines/:id/stufen
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const stufen = db
    .select()
    .from(schema.pipStufen)
    .where(eq(schema.pipStufen.pipelineId, id))
    .all();

  stufen.sort((a, b) => a.position - b.position);
  return NextResponse.json(stufen);
}

// POST /api/pipelines/:id/stufen — Add a stage
export async function POST(req: NextRequest, { params }: Params) {
  const { id: pipelineId } = await params;
  const body = await req.json();
  const { name, farbe, wipLimit, istEndStufe, position } = body;

  if (!name) {
    return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
  }

  // Auto-position at end if not specified
  let pos = position;
  if (pos === undefined || pos === null) {
    const existing = db.select().from(schema.pipStufen).where(eq(schema.pipStufen.pipelineId, pipelineId)).all();
    pos = existing.length;
  }

  const stufeId = crypto.randomUUID();
  const now = new Date();

  db.insert(schema.pipStufen)
    .values({
      id: stufeId,
      pipelineId,
      name,
      position: pos,
      farbe: farbe ?? null,
      wipLimit: wipLimit ?? null,
      istEndStufe: istEndStufe ?? false,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const stufe = db.select().from(schema.pipStufen).where(eq(schema.pipStufen.id, stufeId)).get();
  return NextResponse.json(stufe, { status: 201 });
}

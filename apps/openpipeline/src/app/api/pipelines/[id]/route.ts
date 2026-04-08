import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

interface Params { params: Promise<{ id: string }> }

// GET /api/pipelines/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const pipeline = db.select().from(schema.pipPipelines).where(eq(schema.pipPipelines.id, id)).get();
  if (!pipeline) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(pipeline);
}

// PATCH /api/pipelines/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  const existing = db.select().from(schema.pipPipelines).where(eq(schema.pipPipelines.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  db.update(schema.pipPipelines)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(schema.pipPipelines.id, id))
    .run();

  const updated = db.select().from(schema.pipPipelines).where(eq(schema.pipPipelines.id, id)).get();
  return NextResponse.json(updated);
}

// DELETE /api/pipelines/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  db.delete(schema.pipPipelines).where(eq(schema.pipPipelines.id, id)).run();
  return NextResponse.json({ ok: true });
}

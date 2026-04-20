import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireVorgesetzter } from "@/lib/api-auth";

interface Params { params: Promise<{ id: string; feldId: string }> }

// PATCH /api/pipelines/:id/custom-fields/:feldId
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id: pipelineId, feldId } = await params;
    await requireVorgesetzter(pipelineId);

    const field = db.select().from(schema.pipCustomFieldDefinitionen).where(eq(schema.pipCustomFieldDefinitionen.id, feldId)).get();
    if (!field || field.pipelineId !== pipelineId) {
      return NextResponse.json({ error: "Feld nicht gefunden" }, { status: 404 });
    }

    const body = await req.json();
    db.update(schema.pipCustomFieldDefinitionen)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.optionen !== undefined && { optionen: body.optionen }),
        ...(body.istPrio !== undefined && { istPrio: body.istPrio }),
        ...(body.position !== undefined && { position: body.position }),
        ...(body.pflichtfeld !== undefined && { pflichtfeld: body.pflichtfeld }),
      })
      .where(eq(schema.pipCustomFieldDefinitionen.id, feldId))
      .run();

    const updated = db.select().from(schema.pipCustomFieldDefinitionen).where(eq(schema.pipCustomFieldDefinitionen.id, feldId)).get();
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

// DELETE /api/pipelines/:id/custom-fields/:feldId
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id: pipelineId, feldId } = await params;
    await requireVorgesetzter(pipelineId);

    const field = db.select().from(schema.pipCustomFieldDefinitionen).where(eq(schema.pipCustomFieldDefinitionen.id, feldId)).get();
    if (!field || field.pipelineId !== pipelineId) {
      return NextResponse.json({ error: "Feld nicht gefunden" }, { status: 404 });
    }

    db.delete(schema.pipCustomFieldDefinitionen).where(eq(schema.pipCustomFieldDefinitionen.id, feldId)).run();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

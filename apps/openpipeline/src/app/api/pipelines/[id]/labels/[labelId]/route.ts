import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireVorgesetzter } from "@/lib/api-auth";

interface Params { params: Promise<{ id: string; labelId: string }> }

// PATCH /api/pipelines/:id/labels/:labelId
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id: pipelineId, labelId } = await params;
    await requireVorgesetzter(pipelineId);

    const label = db.select().from(schema.pipLabels).where(eq(schema.pipLabels.id, labelId)).get();
    if (!label || label.pipelineId !== pipelineId) {
      return NextResponse.json({ error: "Label nicht gefunden" }, { status: 404 });
    }

    const body = await req.json();
    db.update(schema.pipLabels)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.farbe !== undefined && { farbe: body.farbe }),
      })
      .where(eq(schema.pipLabels.id, labelId))
      .run();

    const updated = db.select().from(schema.pipLabels).where(eq(schema.pipLabels.id, labelId)).get();
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

// DELETE /api/pipelines/:id/labels/:labelId
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id: pipelineId, labelId } = await params;
    await requireVorgesetzter(pipelineId);

    const label = db.select().from(schema.pipLabels).where(eq(schema.pipLabels.id, labelId)).get();
    if (!label || label.pipelineId !== pipelineId) {
      return NextResponse.json({ error: "Label nicht gefunden" }, { status: 404 });
    }

    db.delete(schema.pipLabels).where(eq(schema.pipLabels.id, labelId)).run();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

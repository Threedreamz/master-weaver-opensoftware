import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { requireVorgesetzter } from "@/lib/api-auth";

interface Params { params: Promise<{ id: string; userId: string }> }

// PATCH /api/pipelines/:id/mitglieder/:userId
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id: pipelineId, userId } = await params;
    await requireVorgesetzter(pipelineId);

    const existing = db
      .select()
      .from(schema.pipMitglieder)
      .where(
        and(
          eq(schema.pipMitglieder.pipelineId, pipelineId),
          eq(schema.pipMitglieder.userId, userId),
        ),
      )
      .get();

    if (!existing) return NextResponse.json({ error: "Mitglied nicht gefunden" }, { status: 404 });

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.rolle !== undefined) updates.rolle = body.rolle;
    if (body.vertrauensLevel !== undefined) updates.vertrauensLevel = body.vertrauensLevel;
    if (body.zugewieseneStufen !== undefined) updates.zugewieseneStufen = body.zugewieseneStufen;
    if (body.name !== undefined) updates.name = body.name;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Keine Felder zum Aktualisieren" }, { status: 400 });
    }

    db.update(schema.pipMitglieder)
      .set(updates)
      .where(
        and(
          eq(schema.pipMitglieder.pipelineId, pipelineId),
          eq(schema.pipMitglieder.userId, userId),
        ),
      )
      .run();

    const updated = db
      .select()
      .from(schema.pipMitglieder)
      .where(
        and(
          eq(schema.pipMitglieder.pipelineId, pipelineId),
          eq(schema.pipMitglieder.userId, userId),
        ),
      )
      .get();

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

// DELETE /api/pipelines/:id/mitglieder/:userId
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id: pipelineId, userId } = await params;
    await requireVorgesetzter(pipelineId);

    db.delete(schema.pipMitglieder)
      .where(
        and(
          eq(schema.pipMitglieder.pipelineId, pipelineId),
          eq(schema.pipMitglieder.userId, userId),
        ),
      )
      .run();

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

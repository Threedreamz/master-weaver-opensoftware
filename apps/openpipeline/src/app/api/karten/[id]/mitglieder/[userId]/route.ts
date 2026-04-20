import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { requirePipelineAccess } from "@/lib/api-auth";

interface Params { params: Promise<{ id: string; userId: string }> }

// DELETE /api/karten/:id/mitglieder/:userId
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id: karteId, userId } = await params;
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, karteId)).get();
    if (!karte) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

    await requirePipelineAccess(karte.pipelineId);

    db.delete(schema.pipKartenMitglieder)
      .where(and(
        eq(schema.pipKartenMitglieder.karteId, karteId),
        eq(schema.pipKartenMitglieder.userId, userId),
      ))
      .run();

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

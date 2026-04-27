import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requirePipelineAccess } from "@/lib/api-auth";
import { deleteFile } from "@/lib/file-storage";

interface Params { params: Promise<{ id: string; anhangId: string }> }

// DELETE /api/karten/:id/anhaenge/:anhangId
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id: karteId, anhangId } = await params;
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, karteId)).get();
    if (!karte) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

    await requirePipelineAccess(karte.pipelineId);

    const anhang = db.select().from(schema.pipAnhaenge).where(eq(schema.pipAnhaenge.id, anhangId)).get();
    if (!anhang || anhang.karteId !== karteId) {
      return NextResponse.json({ error: "Anhang nicht gefunden" }, { status: 404 });
    }

    await deleteFile(anhang.pfad);
    db.delete(schema.pipAnhaenge).where(eq(schema.pipAnhaenge.id, anhangId)).run();

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

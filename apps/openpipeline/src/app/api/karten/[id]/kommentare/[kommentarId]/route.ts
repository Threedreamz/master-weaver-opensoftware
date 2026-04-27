import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requirePipelineAccess } from "@/lib/api-auth";

interface Params { params: Promise<{ id: string; kommentarId: string }> }

// PATCH /api/karten/:id/kommentare/:kommentarId
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id: karteId, kommentarId } = await params;
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, karteId)).get();
    if (!karte) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

    const { userId } = await requirePipelineAccess(karte.pipelineId);

    const kommentar = db.select().from(schema.pipKommentare).where(eq(schema.pipKommentare.id, kommentarId)).get();
    if (!kommentar || kommentar.karteId !== karteId) {
      return NextResponse.json({ error: "Kommentar nicht gefunden" }, { status: 404 });
    }
    if (kommentar.userId !== userId) {
      return NextResponse.json({ error: "Nur eigene Kommentare bearbeiten" }, { status: 403 });
    }

    const { inhalt } = await req.json();
    if (!inhalt?.trim()) {
      return NextResponse.json({ error: "inhalt ist erforderlich" }, { status: 400 });
    }

    db.update(schema.pipKommentare)
      .set({ inhalt, bearbeitetAm: new Date() })
      .where(eq(schema.pipKommentare.id, kommentarId))
      .run();

    const updated = db.select().from(schema.pipKommentare).where(eq(schema.pipKommentare.id, kommentarId)).get();
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

// DELETE /api/karten/:id/kommentare/:kommentarId
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id: karteId, kommentarId } = await params;
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, karteId)).get();
    if (!karte) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

    const { userId } = await requirePipelineAccess(karte.pipelineId);

    const kommentar = db.select().from(schema.pipKommentare).where(eq(schema.pipKommentare.id, kommentarId)).get();
    if (!kommentar || kommentar.karteId !== karteId) {
      return NextResponse.json({ error: "Kommentar nicht gefunden" }, { status: 404 });
    }
    if (kommentar.userId !== userId) {
      return NextResponse.json({ error: "Nur eigene Kommentare loeschen" }, { status: 403 });
    }

    db.delete(schema.pipKommentare).where(eq(schema.pipKommentare.id, kommentarId)).run();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

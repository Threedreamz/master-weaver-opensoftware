import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requirePipelineAccess } from "@/lib/api-auth";

interface Params { params: Promise<{ id: string }> }

// GET /api/karten/:id/custom-fields
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: karteId } = await params;
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, karteId)).get();
    if (!karte) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

    await requirePipelineAccess(karte.pipelineId);

    // Load field definitions for this pipeline
    const definitionen = db
      .select()
      .from(schema.pipCustomFieldDefinitionen)
      .where(eq(schema.pipCustomFieldDefinitionen.pipelineId, karte.pipelineId))
      .all();

    // Load values for this specific card
    const karteWerte = db
      .select()
      .from(schema.pipCustomFieldWerte)
      .where(eq(schema.pipCustomFieldWerte.karteId, karteId))
      .all();

    const werteMap = new Map(karteWerte.map((w) => [w.feldId, w.wert]));

    const result = definitionen
      .sort((a, b) => a.position - b.position)
      .map((def) => ({
        ...def,
        wert: werteMap.get(def.id) ?? null,
      }));

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

// PUT /api/karten/:id/custom-fields — set all custom field values for a card
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id: karteId } = await params;
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, karteId)).get();
    if (!karte) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

    await requirePipelineAccess(karte.pipelineId);

    const { felder } = await req.json();
    if (!felder || !Array.isArray(felder)) {
      return NextResponse.json({ error: "felder Array ist erforderlich" }, { status: 400 });
    }

    for (const { feldId, wert } of felder) {
      if (!feldId) continue;

      const existing = db
        .select()
        .from(schema.pipCustomFieldWerte)
        .where(eq(schema.pipCustomFieldWerte.karteId, karteId))
        .all()
        .find((w) => w.feldId === feldId);

      if (existing) {
        db.update(schema.pipCustomFieldWerte)
          .set({ wert: wert ?? null, updatedAt: new Date() })
          .where(eq(schema.pipCustomFieldWerte.id, existing.id))
          .run();
      } else {
        db.insert(schema.pipCustomFieldWerte)
          .values({
            id: crypto.randomUUID(),
            karteId,
            feldId,
            wert: wert ?? null,
          })
          .run();
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

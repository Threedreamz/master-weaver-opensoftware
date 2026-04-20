import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requirePipelineAccess } from "@/lib/api-auth";

interface Params { params: Promise<{ id: string }> }

// POST /api/karten/:id/duplizieren — deep-copy a card
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: karteId } = await params;
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, karteId)).get();
    if (!karte) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

    const { userId } = await requirePipelineAccess(karte.pipelineId);

    const body = await req.json();
    const targetStufeId = body.stufeId || karte.stufeId;

    // Create new card
    const newId = crypto.randomUUID();
    db.insert(schema.pipKarten)
      .values({
        id: newId,
        pipelineId: karte.pipelineId,
        stufeId: targetStufeId,
        titel: body.titel || `${karte.titel} (Kopie)`,
        beschreibung: karte.beschreibung,
        prioritaet: karte.prioritaet,
        status: "offen",
        position: 0,
        quelle: karte.istVorlage ? "vorlage" : "manuell",
        quelleReferenz: karte.istVorlage ? karteId : null,
        istVorlage: false,
      })
      .run();

    // Copy checklists
    const checklisten = db
      .select()
      .from(schema.pipChecklisten)
      .where(eq(schema.pipChecklisten.karteId, karteId))
      .all();

    for (const cl of checklisten) {
      db.insert(schema.pipChecklisten)
        .values({
          id: crypto.randomUUID(),
          karteId: newId,
          titel: cl.titel,
          erledigt: false,
          position: cl.position,
        })
        .run();
    }

    // Copy labels
    const kartenLabels = db
      .select()
      .from(schema.pipKartenLabels)
      .where(eq(schema.pipKartenLabels.karteId, karteId))
      .all();

    for (const kl of kartenLabels) {
      db.insert(schema.pipKartenLabels)
        .values({ id: crypto.randomUUID(), karteId: newId, labelId: kl.labelId })
        .run();
    }

    // Copy custom field values
    const cfWerte = db
      .select()
      .from(schema.pipCustomFieldWerte)
      .where(eq(schema.pipCustomFieldWerte.karteId, karteId))
      .all();

    for (const cf of cfWerte) {
      db.insert(schema.pipCustomFieldWerte)
        .values({ id: crypto.randomUUID(), karteId: newId, feldId: cf.feldId, wert: cf.wert })
        .run();
    }

    // Record history
    db.insert(schema.pipKartenHistorie)
      .values({
        id: crypto.randomUUID(),
        karteId: newId,
        aktion: "erstellt",
        userId,
        kommentar: `Dupliziert von "${karte.titel}"`,
      })
      .run();

    const newKarte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, newId)).get();
    return NextResponse.json(newKarte, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

// POST /api/karten — Create a card
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { pipelineId, stufeId, titel, beschreibung, prioritaet, zugewiesenAn, labels } = body;

  if (!pipelineId || !stufeId || !titel) {
    return NextResponse.json({ error: "pipelineId, stufeId und titel sind erforderlich" }, { status: 400 });
  }

  // Auto-position at end
  const existing = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.stufeId, stufeId)).all();
  const position = existing.length;

  const id = crypto.randomUUID();
  const now = new Date();

  db.insert(schema.pipKarten)
    .values({
      id,
      pipelineId,
      stufeId,
      titel,
      beschreibung: beschreibung ?? null,
      prioritaet: prioritaet ?? "mittel",
      status: "offen",
      position,
      zugewiesenAn: zugewiesenAn ?? null,
      labels: labels ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  // Create history entry
  db.insert(schema.pipKartenHistorie)
    .values({
      karteId: id,
      aktion: "erstellt",
      nachStufeId: stufeId,
      nachStatus: "offen",
      createdAt: now,
    })
    .run();

  const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, id)).get();
  return NextResponse.json(karte, { status: 201 });
}

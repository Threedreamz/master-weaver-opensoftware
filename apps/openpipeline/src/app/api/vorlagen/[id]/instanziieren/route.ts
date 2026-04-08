import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import type { VorlageStufe, VorlageKarte } from "@opensoftware/db/openpipeline";

interface Params { params: Promise<{ id: string }> }

// POST /api/vorlagen/:id/instanziieren — Create pipeline from template
export async function POST(req: NextRequest, { params }: Params) {
  const { id: vorlageId } = await params;
  const body = await req.json();
  const { name, beschreibung, elternPipelineId, ecosystemId } = body;

  const vorlage = db.select().from(schema.pipVorlagen).where(eq(schema.pipVorlagen.id, vorlageId)).get();
  if (!vorlage) return NextResponse.json({ error: "Vorlage nicht gefunden" }, { status: 404 });

  if (!name) {
    return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
  }

  const now = new Date();
  const pipelineId = crypto.randomUUID();

  // Create pipeline
  db.insert(schema.pipPipelines)
    .values({
      id: pipelineId,
      name,
      beschreibung: beschreibung ?? vorlage.beschreibung,
      typ: vorlage.kategorie === "geschaeft" ? "geschaeft" : vorlage.kategorie === "projekt" ? "projekt" : "prozess",
      status: "entwurf",
      templateId: vorlageId,
      elternPipelineId: elternPipelineId ?? null,
      ecosystemId: ecosystemId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  // Create stages from template
  const stufenMap = new Map<number, string>(); // index -> stufeId
  const templateStufen = (vorlage.stufen ?? []) as VorlageStufe[];

  for (const stufe of templateStufen) {
    const stufeId = crypto.randomUUID();
    stufenMap.set(stufe.position, stufeId);

    db.insert(schema.pipStufen)
      .values({
        id: stufeId,
        pipelineId,
        name: stufe.name,
        position: stufe.position,
        farbe: stufe.farbe ?? null,
        wipLimit: stufe.wipLimit ?? null,
        istEndStufe: stufe.istEndStufe ?? false,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  // Create default cards from template
  const templateKarten = (vorlage.standardKarten ?? []) as VorlageKarte[];
  for (const karte of templateKarten) {
    const stufeId = stufenMap.get(karte.stufeIndex);
    if (!stufeId) continue;

    const karteId = crypto.randomUUID();
    db.insert(schema.pipKarten)
      .values({
        id: karteId,
        pipelineId,
        stufeId,
        titel: karte.titel,
        beschreibung: karte.beschreibung ?? null,
        prioritaet: (karte.prioritaet as "kritisch" | "hoch" | "mittel" | "niedrig") ?? "mittel",
        status: "offen",
        position: 0,
        quelle: "vorlage",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Create checklist items
    if (karte.checkliste) {
      for (let i = 0; i < karte.checkliste.length; i++) {
        db.insert(schema.pipChecklisten)
          .values({
            karteId,
            titel: karte.checkliste[i],
            position: i,
            createdAt: now,
          })
          .run();
      }
    }
  }

  const pipeline = db.select().from(schema.pipPipelines).where(eq(schema.pipPipelines.id, pipelineId)).get();
  const stufen = db.select().from(schema.pipStufen).where(eq(schema.pipStufen.pipelineId, pipelineId)).all();

  return NextResponse.json({ pipeline, stufen }, { status: 201 });
}

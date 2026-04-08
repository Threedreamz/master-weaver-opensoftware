import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

// Default Fischer pipeline stages
const FISCHER_STUFEN = [
  { name: "Anfragen", position: 0, farbe: "#3b82f6" },
  { name: "Leads", position: 1, farbe: "#f59e0b" },
  { name: "Sales", position: 2, farbe: "#10b981" },
  { name: "Fulfillment", position: 3, farbe: "#8b5cf6" },
  { name: "QS", position: 4, farbe: "#ef4444", istEndStufe: true },
];

// POST /api/generator — Generate pipeline from business-core or default Fischer template
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, ecosystemId } = body;

  if (!name) {
    return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
  }

  const now = new Date();
  const pipelineId = crypto.randomUUID();

  // Create the pipeline
  db.insert(schema.pipPipelines)
    .values({
      id: pipelineId,
      name,
      beschreibung: ecosystemId
        ? `Generierte Pipeline fuer ${ecosystemId}`
        : "Generierte Fischer Standard Pipeline",
      typ: "geschaeft",
      status: "entwurf",
      ecosystemId: ecosystemId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  // Create Fischer stages
  for (const stufe of FISCHER_STUFEN) {
    db.insert(schema.pipStufen)
      .values({
        pipelineId,
        name: stufe.name,
        position: stufe.position,
        farbe: stufe.farbe,
        istEndStufe: (stufe as { istEndStufe?: boolean }).istEndStufe ?? false,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  const pipeline = db.select().from(schema.pipPipelines).where(eq(schema.pipPipelines.id, pipelineId)).get();
  const stufen = db.select().from(schema.pipStufen).where(eq(schema.pipStufen.pipelineId, pipelineId)).all();

  return NextResponse.json({ pipeline, stufen }, { status: 201 });
}

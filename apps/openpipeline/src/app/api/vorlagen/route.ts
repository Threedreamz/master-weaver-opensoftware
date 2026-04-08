import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

// GET /api/vorlagen — List all templates
export async function GET() {
  const vorlagen = db.select().from(schema.pipVorlagen).all();
  return NextResponse.json(vorlagen);
}

// POST /api/vorlagen — Create a template
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, beschreibung, kategorie, stufen, standardKarten } = body;

  if (!name) {
    return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = new Date();

  db.insert(schema.pipVorlagen)
    .values({
      id,
      name,
      beschreibung: beschreibung ?? null,
      kategorie: kategorie ?? "custom",
      stufen: stufen ?? [],
      standardKarten: standardKarten ?? [],
      istSystem: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const vorlage = db.select().from(schema.pipVorlagen).where(eq(schema.pipVorlagen.id, id)).get();
  return NextResponse.json(vorlage, { status: 201 });
}

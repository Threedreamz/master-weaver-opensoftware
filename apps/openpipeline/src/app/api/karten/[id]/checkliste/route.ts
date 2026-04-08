import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

interface Params { params: Promise<{ id: string }> }

// GET /api/karten/:id/checkliste
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const items = db
    .select()
    .from(schema.pipChecklisten)
    .where(eq(schema.pipChecklisten.karteId, id))
    .all();
  return NextResponse.json(items);
}

// POST /api/karten/:id/checkliste — Add checklist item
export async function POST(req: NextRequest, { params }: Params) {
  const { id: karteId } = await params;
  const { titel } = await req.json();

  if (!titel) return NextResponse.json({ error: "Titel erforderlich" }, { status: 400 });

  const existing = db.select().from(schema.pipChecklisten).where(eq(schema.pipChecklisten.karteId, karteId)).all();

  db.insert(schema.pipChecklisten)
    .values({
      karteId,
      titel,
      position: existing.length,
      createdAt: new Date(),
    })
    .run();

  const items = db.select().from(schema.pipChecklisten).where(eq(schema.pipChecklisten.karteId, karteId)).all();
  return NextResponse.json(items, { status: 201 });
}

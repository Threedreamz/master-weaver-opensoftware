import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { requirePipelineAccess } from "@/lib/api-auth";

interface Params { params: Promise<{ id: string }> }

// GET /api/karten/:id/labels
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: karteId } = await params;
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, karteId)).get();
    if (!karte) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

    await requirePipelineAccess(karte.pipelineId);

    const kartenLabels = db
      .select({ label: schema.pipLabels })
      .from(schema.pipKartenLabels)
      .innerJoin(schema.pipLabels, eq(schema.pipKartenLabels.labelId, schema.pipLabels.id))
      .where(eq(schema.pipKartenLabels.karteId, karteId))
      .all();

    return NextResponse.json(kartenLabels.map((kl) => kl.label));
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

// POST /api/karten/:id/labels — assign label to card
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: karteId } = await params;
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, karteId)).get();
    if (!karte) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

    await requirePipelineAccess(karte.pipelineId);

    const { labelId } = await req.json();
    if (!labelId) return NextResponse.json({ error: "labelId ist erforderlich" }, { status: 400 });

    const label = db.select().from(schema.pipLabels).where(eq(schema.pipLabels.id, labelId)).get();
    if (!label || label.pipelineId !== karte.pipelineId) {
      return NextResponse.json({ error: "Label nicht gefunden oder gehoert nicht zur Pipeline" }, { status: 400 });
    }

    db.insert(schema.pipKartenLabels)
      .values({ id: crypto.randomUUID(), karteId, labelId })
      .onConflictDoNothing()
      .run();

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

// DELETE /api/karten/:id/labels — remove label from card (labelId in body)
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id: karteId } = await params;
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, karteId)).get();
    if (!karte) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

    await requirePipelineAccess(karte.pipelineId);

    const { labelId } = await req.json();
    if (!labelId) return NextResponse.json({ error: "labelId ist erforderlich" }, { status: 400 });

    db.delete(schema.pipKartenLabels)
      .where(and(eq(schema.pipKartenLabels.karteId, karteId), eq(schema.pipKartenLabels.labelId, labelId)))
      .run();

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

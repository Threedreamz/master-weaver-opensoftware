import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { runAutomations } from "@/lib/automation-engine";

interface Params { params: Promise<{ id: string }> }

// GET /api/karten/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, id)).get();
  if (!karte) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(karte);
}

// PATCH /api/karten/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  const existing = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const now = new Date();

  // Track status change in history
  if (body.status && body.status !== existing.status) {
    db.insert(schema.pipKartenHistorie)
      .values({
        karteId: id,
        aktion: "status_geaendert",
        vonStatus: existing.status,
        nachStatus: body.status,
        createdAt: now,
      })
      .run();
  }

  // Set erledigtAm if completing
  if (body.status === "erledigt" && existing.status !== "erledigt") {
    body.erledigtAm = now;
  }

  db.update(schema.pipKarten)
    .set({ ...body, updatedAt: now })
    .where(eq(schema.pipKarten.id, id))
    .run();

  const updated = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, id)).get();

  // Run automations on status change to erledigt
  if (body.status === "erledigt" && existing.status !== "erledigt") {
    await runAutomations({
      typ: "karte_erledigt",
      karteId: id,
      pipelineId: existing.pipelineId,
      stufeId: existing.stufeId,
    });
  }

  return NextResponse.json(updated);
}

// DELETE /api/karten/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  db.delete(schema.pipKarten).where(eq(schema.pipKarten.id, id)).run();
  return NextResponse.json({ ok: true });
}

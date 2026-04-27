import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { runAutomations } from "@/lib/automation-engine";

interface Params { params: Promise<{ id: string }> }

// POST /api/karten/:id/verschieben — Move card to new stage
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { neueStufeId, neuePosition } = await req.json();

  const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, id)).get();
  if (!karte) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const vonStufeId = karte.stufeId;
  const now = new Date();

  // Update card
  db.update(schema.pipKarten)
    .set({
      stufeId: neueStufeId,
      position: neuePosition ?? 0,
      updatedAt: now,
    })
    .where(eq(schema.pipKarten.id, id))
    .run();

  // Record history
  if (vonStufeId !== neueStufeId) {
    db.insert(schema.pipKartenHistorie)
      .values({
        karteId: id,
        aktion: "verschoben",
        vonStufeId,
        nachStufeId: neueStufeId,
        createdAt: now,
      })
      .run();

    // Run automations
    await runAutomations({
      typ: "karte_verschoben",
      karteId: id,
      pipelineId: karte.pipelineId,
      stufeId: neueStufeId,
      vonStufeId,
      nachStufeId: neueStufeId,
    });
  }

  const updated = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, id)).get();
  return NextResponse.json(updated);
}

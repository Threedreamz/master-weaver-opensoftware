import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { toBountyStatus } from "@/lib/sync/status-mapper";

// POST /api/webhooks/openbounty — Receive OpenBounty task updates
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, aufgabeId, data } = body;

  if (!type || !aufgabeId) {
    return NextResponse.json({ error: "type und aufgabeId erforderlich" }, { status: 400 });
  }

  const now = new Date();

  // Find card linked to this OpenBounty task
  const karte = db
    .select()
    .from(schema.pipKarten)
    .where(eq(schema.pipKarten.bountyAufgabeId, aufgabeId))
    .get();

  if (type === "aufgabe.aktualisiert" && karte && data) {
    const updates: Record<string, unknown> = { updatedAt: now };
    if (data.tatsaechlichStunden !== undefined) updates.tatsaechlichStunden = data.tatsaechlichStunden;
    if (data.status) updates.status = data.status; // OpenBounty uses same German status

    db.update(schema.pipKarten)
      .set(updates)
      .where(eq(schema.pipKarten.id, karte.id))
      .run();
  }

  // Log
  db.insert(schema.pipSyncLog)
    .values({
      richtung: "eingehend",
      quelle: "openbounty",
      entitaetTyp: "karte",
      entitaetId: karte?.id ?? aufgabeId,
      externeId: aufgabeId,
      aktion: "aktualisiert",
      payload: body,
      status: "erfolg",
      createdAt: now,
    })
    .run();

  return NextResponse.json({ ok: true });
}

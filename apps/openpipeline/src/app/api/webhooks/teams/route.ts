import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { fromTeamsStatus, fromTeamsPriority } from "@/lib/sync/status-mapper";

// POST /api/webhooks/teams — Receive Teams ticket events
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, ticketId, data, timestamp } = body;

  if (!type || !ticketId) {
    return NextResponse.json({ error: "type und ticketId erforderlich" }, { status: 400 });
  }

  const now = new Date();

  // Check for sync loop: was this recently sent by us?
  const recentOutbound = db
    .select()
    .from(schema.pipSyncLog)
    .where(eq(schema.pipSyncLog.externeId, ticketId))
    .all()
    .filter((log) => {
      if (log.richtung !== "ausgehend" || log.quelle !== "teams") return false;
      const logTime = log.createdAt instanceof Date ? log.createdAt.getTime() : Number(log.createdAt) * 1000;
      return now.getTime() - logTime < 5000;
    });

  if (recentOutbound.length > 0) {
    // Echo — skip to prevent sync loop
    return NextResponse.json({ skipped: true, reason: "sync_loop_prevention" });
  }

  // Find card linked to this Teams ticket
  const karte = db
    .select()
    .from(schema.pipKarten)
    .where(eq(schema.pipKarten.teamsTicketId, ticketId))
    .get();

  if (type === "ticket.updated" && karte && data) {
    const updates: Record<string, unknown> = { updatedAt: now };
    if (data.status) updates.status = fromTeamsStatus(data.status);
    if (data.priority) updates.prioritaet = fromTeamsPriority(data.priority);
    if (data.title) updates.titel = data.title;
    if (data.assigneeId) updates.zugewiesenAn = data.assigneeId;

    db.update(schema.pipKarten)
      .set(updates)
      .where(eq(schema.pipKarten.id, karte.id))
      .run();
  }

  // Log sync event
  db.insert(schema.pipSyncLog)
    .values({
      richtung: "eingehend",
      quelle: "teams",
      entitaetTyp: "karte",
      entitaetId: karte?.id ?? ticketId,
      externeId: ticketId,
      aktion: type === "ticket.created" ? "erstellt" : type === "ticket.deleted" ? "geloescht" : "aktualisiert",
      payload: body,
      status: "erfolg",
      createdAt: now,
    })
    .run();

  return NextResponse.json({ ok: true });
}

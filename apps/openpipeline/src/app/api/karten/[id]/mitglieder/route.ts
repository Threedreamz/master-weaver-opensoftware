import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requirePipelineAccess } from "@/lib/api-auth";

interface Params { params: Promise<{ id: string }> }

// GET /api/karten/:id/mitglieder
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: karteId } = await params;
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, karteId)).get();
    if (!karte) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

    await requirePipelineAccess(karte.pipelineId);

    const mitglieder = db
      .select()
      .from(schema.pipKartenMitglieder)
      .where(eq(schema.pipKartenMitglieder.karteId, karteId))
      .all();

    return NextResponse.json(mitglieder);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

// POST /api/karten/:id/mitglieder — assign member to card
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: karteId } = await params;
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, karteId)).get();
    if (!karte) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

    const { userId: currentUserId } = await requirePipelineAccess(karte.pipelineId);

    const { userId, rolle } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId ist erforderlich" }, { status: 400 });

    db.insert(schema.pipKartenMitglieder)
      .values({
        id: crypto.randomUUID(),
        karteId,
        userId,
        rolle: rolle || "mitarbeiter",
      })
      .onConflictDoNothing()
      .run();

    // Record in card history
    db.insert(schema.pipKartenHistorie)
      .values({
        id: crypto.randomUUID(),
        karteId,
        aktion: "zugewiesen",
        userId: currentUserId,
        kommentar: `Mitglied ${userId} zugewiesen (${rolle || "mitarbeiter"})`,
      })
      .run();

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

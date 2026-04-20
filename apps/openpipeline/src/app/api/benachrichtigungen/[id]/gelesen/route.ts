import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/api-auth";

interface Params { params: Promise<{ id: string }> }

// PATCH /api/benachrichtigungen/:id/gelesen
export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const { id } = await params;
    const notif = db.select().from(schema.pipBenachrichtigungen).where(eq(schema.pipBenachrichtigungen.id, id)).get();
    if (!notif || notif.userId !== userId) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    db.update(schema.pipBenachrichtigungen)
      .set({ gelesen: true })
      .where(eq(schema.pipBenachrichtigungen.id, id))
      .run();

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

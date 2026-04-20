import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/api-auth";

// POST /api/benachrichtigungen/alle-gelesen
export async function POST() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    db.update(schema.pipBenachrichtigungen)
      .set({ gelesen: true })
      .where(and(eq(schema.pipBenachrichtigungen.userId, userId), eq(schema.pipBenachrichtigungen.gelesen, false)))
      .run();

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

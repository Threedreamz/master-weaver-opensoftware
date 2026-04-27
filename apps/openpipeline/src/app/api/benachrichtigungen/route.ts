import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { and, eq, desc } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/api-auth";

// GET /api/benachrichtigungen
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
    const nurUngelesen = req.nextUrl.searchParams.get("nurUngelesen") === "true";

    let query = db
      .select()
      .from(schema.pipBenachrichtigungen)
      .where(
        nurUngelesen
          ? and(eq(schema.pipBenachrichtigungen.userId, userId), eq(schema.pipBenachrichtigungen.gelesen, false))
          : eq(schema.pipBenachrichtigungen.userId, userId),
      )
      .orderBy(desc(schema.pipBenachrichtigungen.createdAt))
      .limit(limit);

    const benachrichtigungen = query.all();

    // Count unread
    const ungelesen = db
      .select()
      .from(schema.pipBenachrichtigungen)
      .where(and(eq(schema.pipBenachrichtigungen.userId, userId), eq(schema.pipBenachrichtigungen.gelesen, false)))
      .all().length;

    return NextResponse.json({ benachrichtigungen, ungelesen });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

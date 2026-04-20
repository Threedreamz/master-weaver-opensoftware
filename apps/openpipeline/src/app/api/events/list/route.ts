import { NextRequest, NextResponse } from "next/server";
import { desc, eq, and } from "drizzle-orm";
import { db } from "../../../../db";
import { pipCanonicalEvents } from "../../../../db/schema";

/**
 * GET /api/events/list — recent canonical events for the admin audit view.
 * Supports filters: ?type=, ?source=, ?status=, ?limit= (default 100, max 500).
 * Auth: same X-API-Key as POST /api/events.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.OPENSOFTWARE_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "OPENSOFTWARE_API_KEY not configured on openpipeline" },
      { status: 503 },
    );
  }
  if (request.headers.get("x-api-key") !== expected) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const url = request.nextUrl;
  const type = url.searchParams.get("type");
  const source = url.searchParams.get("source");
  const status = url.searchParams.get("status");
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 100)));

  const filters = [];
  if (type) filters.push(eq(pipCanonicalEvents.type, type));
  if (source) filters.push(eq(pipCanonicalEvents.source, source));
  if (status) filters.push(eq(pipCanonicalEvents.status, status as "received" | "dispatched" | "partial" | "failed"));

  const rows = await db
    .select()
    .from(pipCanonicalEvents)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(pipCanonicalEvents.receivedAt))
    .limit(limit);

  return NextResponse.json({ events: rows });
}

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

// GET /api/sync/log — Sync audit log
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const quelle = url.searchParams.get("quelle");

  let logs;
  if (quelle) {
    logs = db.select().from(schema.pipSyncLog).where(eq(schema.pipSyncLog.quelle, quelle as "teams" | "openbounty" | "opendesktop" | "business_core")).all();
  } else {
    logs = db.select().from(schema.pipSyncLog).all();
  }

  return NextResponse.json(logs.slice(-limit));
}

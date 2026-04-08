import { NextResponse } from "next/server";
import { db } from "@/db";
import { searchIntelligenceLinks } from "@/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 300;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeLinks = await db.select().from(searchIntelligenceLinks)
    .where(eq(searchIntelligenceLinks.isActive, true));

  const results = {
    total: activeLinks.length,
    synced: 0,
    errors: [] as string[],
  };

  for (const link of activeLinks) {
    try {
      // Update last sync timestamp
      await db.update(searchIntelligenceLinks)
        .set({ lastSyncAt: new Date() })
        .where(eq(searchIntelligenceLinks.id, link.id));
      results.synced++;
    } catch (err) {
      results.errors.push(`Link ${link.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    ...results,
  });
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { searchIntelligenceLinks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const links = await db.select().from(searchIntelligenceLinks);
  return NextResponse.json(links);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { accountId, semrushDomain, semrushDatabase, campaignId } = body;

  if (!accountId || !semrushDomain) {
    return NextResponse.json({ error: "accountId and semrushDomain are required" }, { status: 400 });
  }

  const [link] = await db.insert(searchIntelligenceLinks).values({
    accountId,
    semrushDomain,
    semrushDatabase: semrushDatabase || "de",
    campaignId: campaignId || null,
  }).returning();

  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(searchIntelligenceLinks).where(eq(searchIntelligenceLinks.id, Number(id)));
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { checkApiAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { webhooks } from "@/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;

    const results = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.flowId, id));

    return NextResponse.json(results);
  } catch (error) {
    console.error("[GET /api/flows/[id]/webhooks]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();

    const { url, secret, events, active } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "A valid URL is required" },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(webhooks)
      .values({
        flowId: id,
        url,
        secret: secret ?? null,
        events: events ? JSON.stringify(events) : undefined,
        active: active ?? true,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[POST /api/flows/[id]/webhooks]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

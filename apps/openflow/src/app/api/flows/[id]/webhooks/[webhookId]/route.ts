import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { checkApiAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { webhooks } from "@/db/schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; webhookId: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id, webhookId } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.url !== undefined) {
      try {
        new URL(body.url);
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 }
        );
      }
      updateData.url = body.url;
    }
    if (body.secret !== undefined) updateData.secret = body.secret;
    if (body.events !== undefined) updateData.events = JSON.stringify(body.events);
    if (body.active !== undefined) updateData.active = body.active;

    const [updated] = await db
      .update(webhooks)
      .set(updateData)
      .where(and(eq(webhooks.id, webhookId), eq(webhooks.flowId, id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/flows/[id]/webhooks/[webhookId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; webhookId: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id, webhookId } = await params;

    const [deleted] = await db
      .delete(webhooks)
      .where(and(eq(webhooks.id, webhookId), eq(webhooks.flowId, id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/flows/[id]/webhooks/[webhookId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

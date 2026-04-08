import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { checkApiAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { flowNotifications } from "@/db/schema";

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
      .from(flowNotifications)
      .where(eq(flowNotifications.flowId, id));

    return NextResponse.json(results);
  } catch (error) {
    console.error("[GET /api/flows/[id]/notifications]", error);
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
    const { type, config, active } = body;

    if (!type || !config) {
      return NextResponse.json(
        { error: "type and config are required" },
        { status: 400 }
      );
    }

    const configJson = typeof config === "string" ? config : JSON.stringify(config);

    const [created] = await db
      .insert(flowNotifications)
      .values({
        flowId: id,
        type,
        config: configJson,
        active: active ?? true,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[POST /api/flows/[id]/notifications]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("notificationId");

    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId query param is required" },
        { status: 400 }
      );
    }

    await db
      .delete(flowNotifications)
      .where(eq(flowNotifications.id, notificationId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/flows/[id]/notifications]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const body = await request.json();
    const { notificationId, active } = body;

    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId is required" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(flowNotifications)
      .set({ active })
      .where(eq(flowNotifications.id, notificationId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/flows/[id]/notifications]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

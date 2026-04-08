import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { checkApiAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { flowEdges } from "@/db/schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; edgeId: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { edgeId } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.conditionType !== undefined) updateData.conditionType = body.conditionType;
    if (body.conditionFieldKey !== undefined) updateData.conditionFieldKey = body.conditionFieldKey;
    if (body.conditionValue !== undefined) updateData.conditionValue = body.conditionValue;
    if (body.label !== undefined) updateData.label = body.label;
    if (body.priority !== undefined) updateData.priority = body.priority;

    const [edge] = await db
      .update(flowEdges)
      .set(updateData as Partial<typeof flowEdges.$inferInsert>)
      .where(eq(flowEdges.id, edgeId))
      .returning();

    if (!edge) {
      return NextResponse.json({ error: "Edge not found" }, { status: 404 });
    }

    return NextResponse.json(edge);
  } catch (error) {
    console.error("[PATCH /api/flows/[id]/edges/[edgeId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; edgeId: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { edgeId } = await params;

    const [deleted] = await db
      .delete(flowEdges)
      .where(eq(flowEdges.id, edgeId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Edge not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/flows/[id]/edges/[edgeId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

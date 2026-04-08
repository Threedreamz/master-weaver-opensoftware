import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { checkApiAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { flowEdges } from "@/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;

    const edges = await db.query.flowEdges.findMany({
      where: eq(flowEdges.flowId, id),
    });

    return NextResponse.json(edges);
  } catch (error) {
    console.error("[GET /api/flows/[id]/edges]", error);
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
    const {
      sourceStepId,
      targetStepId,
      conditionType,
      conditionFieldKey,
      conditionValue,
      label,
      priority,
    } = body;

    if (!sourceStepId || !targetStepId) {
      return NextResponse.json(
        { error: "sourceStepId and targetStepId are required" },
        { status: 400 }
      );
    }

    const [edge] = await db
      .insert(flowEdges)
      .values({
        flowId: id,
        sourceStepId,
        targetStepId,
        conditionType: conditionType ?? "always",
        conditionFieldKey: conditionFieldKey ?? undefined,
        conditionValue: conditionValue ?? undefined,
        label: label ?? undefined,
        priority: priority ?? 0,
      })
      .returning();

    return NextResponse.json(edge, { status: 201 });
  } catch (error) {
    console.error("[POST /api/flows/[id]/edges]", error);
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

    await params; // validate route param exists
    const body = await request.json();
    const { edgeId, ...updates } = body;

    if (!edgeId) {
      return NextResponse.json(
        { error: "edgeId is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (updates.targetStepId !== undefined) updateData.targetStepId = updates.targetStepId;
    if (updates.conditionType !== undefined) updateData.conditionType = updates.conditionType;
    if (updates.conditionFieldKey !== undefined) updateData.conditionFieldKey = updates.conditionFieldKey;
    if (updates.conditionValue !== undefined) updateData.conditionValue = updates.conditionValue;
    if (updates.label !== undefined) updateData.label = updates.label;
    if (updates.priority !== undefined) updateData.priority = updates.priority;

    const [edge] = await db
      .update(flowEdges)
      .set(updateData)
      .where(eq(flowEdges.id, edgeId))
      .returning();

    return NextResponse.json(edge);
  } catch (error) {
    console.error("[PATCH /api/flows/[id]/edges]", error);
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

    await params;
    const { searchParams } = new URL(request.url);
    const edgeId = searchParams.get("edgeId");

    if (!edgeId) {
      return NextResponse.json(
        { error: "edgeId query param is required" },
        { status: 400 }
      );
    }

    await db.delete(flowEdges).where(eq(flowEdges.id, edgeId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/flows/[id]/edges]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

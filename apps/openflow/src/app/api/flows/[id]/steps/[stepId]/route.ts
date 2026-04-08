import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { checkApiAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { flowSteps, stepComponents, flowEdges } from "@/db/schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { stepId } = await params;
    const body = await request.json();

    // Build update payload — only include fields present in the request body
    const patch: {
      label?: string;
      positionX?: number;
      positionY?: number;
      config?: string;
      sortOrder?: number;
      updatedAt: ReturnType<typeof sql>;
    } = { updatedAt: sql`(unixepoch())` };

    if (body.label !== undefined) patch.label = String(body.label);
    if (body.positionX !== undefined) patch.positionX = Number(body.positionX);
    if (body.positionY !== undefined) patch.positionY = Number(body.positionY);
    if (body.config !== undefined)
      patch.config =
        typeof body.config === "string" ? body.config : JSON.stringify(body.config);
    if (body.sortOrder !== undefined) patch.sortOrder = Number(body.sortOrder);

    const [step] = await db
      .update(flowSteps)
      .set(patch)
      .where(eq(flowSteps.id, stepId))
      .returning();

    if (!step) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    return NextResponse.json(step);
  } catch (error) {
    console.error("[PATCH /api/flows/[id]/steps/[stepId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { stepId } = await params;

    // Delete components (cascade should handle this, but be explicit)
    await db.delete(stepComponents).where(eq(stepComponents.stepId, stepId));

    // Delete connected edges (both directions)
    await db.delete(flowEdges).where(eq(flowEdges.sourceStepId, stepId));
    await db.delete(flowEdges).where(eq(flowEdges.targetStepId, stepId));

    // Delete the step
    const [deleted] = await db
      .delete(flowSteps)
      .where(eq(flowSteps.id, stepId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/flows/[id]/steps/[stepId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

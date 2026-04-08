import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { checkApiAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { stepComponents } from "@/db/schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string; componentId: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { componentId } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.label !== undefined) updateData.label = body.label;
    if (body.fieldKey !== undefined) updateData.fieldKey = body.fieldKey;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
    if (body.required !== undefined) updateData.required = body.required;
    if (body.config !== undefined)
      updateData.config =
        typeof body.config === "string" ? body.config : JSON.stringify(body.config);
    if (body.validation !== undefined)
      updateData.validation =
        typeof body.validation === "string"
          ? body.validation
          : JSON.stringify(body.validation);

    const [component] = await db
      .update(stepComponents)
      .set(updateData as Partial<typeof stepComponents.$inferInsert>)
      .where(eq(stepComponents.id, componentId))
      .returning();

    if (!component) {
      return NextResponse.json({ error: "Component not found" }, { status: 404 });
    }

    return NextResponse.json(component);
  } catch (error) {
    console.error("[PATCH /api/flows/[id]/steps/[stepId]/components/[componentId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string; componentId: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { componentId } = await params;

    const [deleted] = await db
      .delete(stepComponents)
      .where(eq(stepComponents.id, componentId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Component not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/flows/[id]/steps/[stepId]/components/[componentId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

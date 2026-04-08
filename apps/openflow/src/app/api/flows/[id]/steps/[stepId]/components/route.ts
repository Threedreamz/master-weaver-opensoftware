import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { checkApiAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { stepComponents } from "@/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { stepId } = await params;

    const components = await db.query.stepComponents.findMany({
      where: eq(stepComponents.stepId, stepId),
      orderBy: [stepComponents.sortOrder],
    });

    return NextResponse.json(components);
  } catch (error) {
    console.error("[GET /api/flows/[id]/steps/[stepId]/components]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { stepId } = await params;
    const body = await request.json();
    const {
      id: clientId,
      componentType,
      fieldKey,
      label,
      config,
      validation,
      sortOrder,
      required,
    } = body;

    if (!componentType || !fieldKey) {
      return NextResponse.json(
        { error: "componentType and fieldKey are required" },
        { status: 400 }
      );
    }

    const insertValues: typeof stepComponents.$inferInsert = {
      ...(clientId ? { id: clientId } : {}),
      stepId,
      componentType,
      fieldKey,
      label: label ?? undefined,
      config: typeof config === "string" ? config : JSON.stringify(config ?? {}),
      validation: validation
        ? typeof validation === "string"
          ? validation
          : JSON.stringify(validation)
        : undefined,
      sortOrder: sortOrder ?? 0,
      required: required ?? false,
    };

    const [component] = await db
      .insert(stepComponents)
      .values(insertValues)
      .returning();

    return NextResponse.json(component, { status: 201 });
  } catch (error) {
    console.error("[POST /api/flows/[id]/steps/[stepId]/components]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

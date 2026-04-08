import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { checkApiAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { flowSteps, stepComponents } from "@/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;

    const steps = await db.query.flowSteps.findMany({
      where: eq(flowSteps.flowId, id),
      orderBy: [flowSteps.sortOrder],
      with: {
        components: {
          orderBy: [stepComponents.sortOrder],
        },
      },
    });

    return NextResponse.json(steps);
  } catch (error) {
    console.error("[GET /api/flows/[id]/steps]", error);
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
    const { id: clientId, type, label, positionX, positionY, config, sortOrder } = body;

    if (!type) {
      return NextResponse.json(
        { error: "type is required" },
        { status: 400 }
      );
    }

    const insertValues: typeof flowSteps.$inferInsert = {
      ...(clientId ? { id: clientId } : {}),
      flowId: id,
      type: type as "start" | "step" | "end",
      label: label ?? "",
      positionX: positionX ?? 0,
      positionY: positionY ?? 0,
      config: config
        ? typeof config === "string"
          ? config
          : JSON.stringify(config)
        : undefined,
      sortOrder: sortOrder ?? 0,
    };

    const [step] = await db
      .insert(flowSteps)
      .values(insertValues)
      .returning();

    return NextResponse.json(step, { status: 201 });
  } catch (error) {
    console.error("[POST /api/flows/[id]/steps]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

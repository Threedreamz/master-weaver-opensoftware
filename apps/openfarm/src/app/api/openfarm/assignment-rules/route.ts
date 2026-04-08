import { NextRequest, NextResponse } from "next/server";
import { getAssignmentRules, createAssignmentRule } from "@/db/queries/assignment";

export async function GET() {
  try {
    const rules = await getAssignmentRules();
    return NextResponse.json(rules);
  } catch (error) {
    console.error("Failed to get rules:", error);
    return NextResponse.json({ error: "Failed to get rules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rule = await createAssignmentRule({
      name: body.name,
      priority: body.priority ?? 0,
      conditions: body.conditions ?? {},
      preferredPrinterIds: body.preferredPrinterIds ?? [],
      enabled: body.enabled ?? true,
    });
    return NextResponse.json(rule);
  } catch (error) {
    console.error("Failed to create rule:", error);
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}

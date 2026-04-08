import { NextRequest, NextResponse } from "next/server";
import { getAssignmentRules, createAssignmentRule } from "@/db/queries/assignment";

export async function GET() {
  try {
    const rules = await getAssignmentRules();
    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Failed to get rules:", error);
    return NextResponse.json({ error: "Failed to get rules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, priority, conditions, preferredPrinterIds, enabled } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const rule = await createAssignmentRule({
      name,
      priority: priority ?? 0,
      conditions: conditions ?? {},
      preferredPrinterIds: preferredPrinterIds ?? [],
      enabled: enabled ?? true,
    });

    return NextResponse.json({ rule });
  } catch (error) {
    console.error("Failed to create rule:", error);
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}

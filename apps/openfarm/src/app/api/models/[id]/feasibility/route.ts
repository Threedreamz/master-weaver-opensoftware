import { NextRequest, NextResponse } from "next/server";
import { getFeasibilityChecks } from "@/db/queries/feasibility";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const checks = await getFeasibilityChecks(id);
    return NextResponse.json({ checks });
  } catch (error) {
    console.error("Failed to get feasibility:", error);
    return NextResponse.json({ error: "Failed to get feasibility data" }, { status: 500 });
  }
}

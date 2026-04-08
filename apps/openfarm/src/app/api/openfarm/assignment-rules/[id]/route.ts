import { NextRequest, NextResponse } from "next/server";
import { updateAssignmentRule, deleteAssignmentRule } from "@/db/queries/assignment";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const rule = await updateAssignmentRule(id, body);
    return NextResponse.json(rule);
  } catch (error) {
    console.error("Failed to update rule:", error);
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteAssignmentRule(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete rule:", error);
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}

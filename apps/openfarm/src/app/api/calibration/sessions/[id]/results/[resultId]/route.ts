import { NextRequest, NextResponse } from "next/server";
import { markResultApplied, getCalibrationResults } from "@/db/queries/calibration";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> },
) {
  try {
    const { id, resultId } = await params;
    const body = await request.json();

    if (body.applied !== true) {
      return NextResponse.json(
        { error: "Only { applied: true } is supported" },
        { status: 400 },
      );
    }

    // Verify the result belongs to this session
    const results = await getCalibrationResults(id);
    const targetResult = results.find((r) => r.id === resultId);
    if (!targetResult) {
      return NextResponse.json(
        { error: "Result not found for this session" },
        { status: 404 },
      );
    }

    const updated = await markResultApplied(resultId);
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update result";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

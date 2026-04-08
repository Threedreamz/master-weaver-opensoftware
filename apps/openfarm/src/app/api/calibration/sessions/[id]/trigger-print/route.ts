import { NextRequest, NextResponse } from "next/server";
import {
  getCalibrationSession,
  updateCalibrationSessionStatus,
} from "@/db/queries/calibration";
import { triggerCalibrationPrint } from "@/lib/openslicer-client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const session = await getCalibrationSession(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!session.procedure) {
      return NextResponse.json(
        { error: "Session has no associated procedure" },
        { status: 400 },
      );
    }

    // Only allow triggering from "initiated" status
    if (session.status !== "initiated") {
      return NextResponse.json(
        { error: `Cannot trigger print from status "${session.status}". Session must be in "initiated" status.` },
        { status: 400 },
      );
    }

    // Send calibration print request to OpenSlicer
    const result = await triggerCalibrationPrint({
      farmSessionId: id,
      procedureType: session.procedure.procedureType,
      materialId: session.materialId ?? undefined,
    });

    // Advance session to "printing"
    await updateCalibrationSessionStatus(id, "printing", {
      calibrationPrintJobId: result.id,
    });

    return NextResponse.json({
      sessionId: id,
      slicerPrintId: result.id,
      status: result.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to trigger calibration print";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

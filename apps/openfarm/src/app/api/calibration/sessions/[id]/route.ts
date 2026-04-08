import { NextRequest, NextResponse } from "next/server";
import {
  getCalibrationSession,
  updateCalibrationSessionStatus,
} from "@/db/queries/calibration";
import {
  canTransitionCalibration,
  type CalibrationStatus,
} from "@opensoftware/openfarm-core";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getCalibrationSession(id);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (!status || typeof status !== "string") {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    // Fetch existing session
    const existing = await getCalibrationSession(id);
    if (!existing) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Validate status transition
    if (!canTransitionCalibration(existing.status as CalibrationStatus, status as CalibrationStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from "${existing.status}" to "${status}"`,
        },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    if (notes) updates.notes = notes;

    const session = await updateCalibrationSessionStatus(id, status, updates);

    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

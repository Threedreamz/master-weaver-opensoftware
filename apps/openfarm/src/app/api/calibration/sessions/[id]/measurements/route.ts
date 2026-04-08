import { NextRequest, NextResponse } from "next/server";
import {
  getCalibrationSession,
  getCalibrationMeasurements,
  createCalibrationMeasurement,
  createCalibrationMeasurementsBatch,
  updateCalibrationSessionStatus,
} from "@/db/queries/calibration";

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

    const measurements = await getCalibrationMeasurements(id);
    return NextResponse.json({
      measurements,
      count: measurements.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch measurements";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate session exists
    const session = await getCalibrationSession(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Accept batch or single measurement
    const isBatch = Array.isArray(body.measurements);
    let results;

    if (isBatch) {
      const measurements = body.measurements.map((m: Record<string, unknown>) => ({
        sessionId: id,
        measurementType: m.measurementType as string,
        axis: (m.axis as string) || undefined,
        pointIndex: m.pointIndex as number | undefined,
        nominalValue: m.nominalValue as number | undefined,
        measuredValue: m.measuredValue as number,
        unit: (m.unit as string) || undefined,
        notes: (m.notes as string) || undefined,
      }));

      // Validate all measurements have required fields
      for (const m of measurements) {
        if (!m.measurementType) {
          return NextResponse.json(
            { error: "measurementType is required for all measurements" },
            { status: 400 },
          );
        }
        if (typeof m.measuredValue !== "number") {
          return NextResponse.json(
            { error: "measuredValue must be a number for all measurements" },
            { status: 400 },
          );
        }
      }

      results = await createCalibrationMeasurementsBatch(measurements);
    } else {
      // Single measurement
      const { measurementType, axis, pointIndex, nominalValue, measuredValue, unit, notes } = body;

      if (!measurementType || typeof measurementType !== "string") {
        return NextResponse.json({ error: "measurementType is required" }, { status: 400 });
      }
      if (typeof measuredValue !== "number") {
        return NextResponse.json({ error: "measuredValue must be a number" }, { status: 400 });
      }

      const measurement = await createCalibrationMeasurement({
        sessionId: id,
        measurementType,
        axis: axis || undefined,
        pointIndex: pointIndex ?? undefined,
        nominalValue: nominalValue ?? undefined,
        measuredValue,
        unit: unit || undefined,
        notes: notes || undefined,
      });
      results = [measurement];
    }

    // Auto-advance to "calculating" if measurements are complete
    if (body.complete === true && session.status === "measuring") {
      await updateCalibrationSessionStatus(id, "calculating");
    }

    return NextResponse.json(
      { measurements: results, count: results.length },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit measurements";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

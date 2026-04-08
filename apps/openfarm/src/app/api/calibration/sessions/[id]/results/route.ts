import { NextRequest, NextResponse } from "next/server";
import {
  getCalibrationSession,
  getCalibrationMeasurements,
  getCalibrationResults,
  createCalibrationResult,
  updateCalibrationSessionStatus,
} from "@/db/queries/calibration";
import {
  calculateXYScaling,
  calculateZScaling,
  calculateBTMTOffset,
  evaluateDiagnostic,
} from "@opensoftware/openfarm-core";
import type {
  XYMeasurement,
  ZMeasurement,
  BTMTMeasurement,
  DiagnosticGrade,
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

    const results = await getCalibrationResults(id);
    return NextResponse.json({
      results,
      count: results.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch results";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Validate session
    const session = await getCalibrationSession(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const procedure = session.procedure;
    if (!procedure) {
      return NextResponse.json({ error: "Session has no associated procedure" }, { status: 400 });
    }

    // Get measurements
    const measurements = await getCalibrationMeasurements(id);
    if (measurements.length === 0) {
      return NextResponse.json({ error: "No measurements found for this session" }, { status: 400 });
    }

    const procedureType = procedure.procedureType;
    const createdResults = [];

    if (procedureType === "xy_scaling") {
      // Convert DB measurements to engine format
      const xyMeasurements: XYMeasurement[] = measurements.map((m) => ({
        pointIndex: m.pointIndex ?? 0,
        axis: (m.axis as "x" | "y") ?? "x",
        side: "a" as const,
        nominalMm: m.nominalValue ?? 0,
        measuredMm: m.measuredValue,
      }));

      const result = calculateXYScaling(xyMeasurements);

      const xResult = await createCalibrationResult({
        sessionId: id,
        resultType: "x_scale_percent",
        value: result.xScalePercent,
        confidence: result.confidence,
        valueJson: {
          meanErrorX: result.meanErrorX,
          stdDevX: result.stdDevX,
          outliers: result.outliers,
        },
      });
      createdResults.push(xResult);

      const yResult = await createCalibrationResult({
        sessionId: id,
        resultType: "y_scale_percent",
        value: result.yScalePercent,
        confidence: result.confidence,
        valueJson: {
          meanErrorY: result.meanErrorY,
          stdDevY: result.stdDevY,
          outliers: result.outliers,
        },
      });
      createdResults.push(yResult);
    } else if (procedureType === "z_scaling") {
      const zMeasurements: ZMeasurement[] = measurements.map((m) => ({
        pointIndex: m.pointIndex ?? 0,
        nominalMm: m.nominalValue ?? 0,
        measuredMm: m.measuredValue,
      }));

      const result = calculateZScaling(zMeasurements);

      const zResult = await createCalibrationResult({
        sessionId: id,
        resultType: "z_scale_factor",
        value: result.zScaleFactor,
        confidence: result.confidence,
        valueJson: {
          meanError: result.meanError,
          stdDev: result.stdDev,
        },
      });
      createdResults.push(zResult);
    } else if (procedureType === "btmt") {
      // BTMT expects a single measurement with plaque data
      const firstMeasurement = measurements[0];
      const btmtData: BTMTMeasurement = {
        selectedPlaqueIndex: firstMeasurement.pointIndex ?? 0,
        offsetCelsius: firstMeasurement.measuredValue,
        plaqueConditions: (firstMeasurement as unknown as Record<string, unknown>).plaqueConditions
          ? JSON.parse(String((firstMeasurement as unknown as Record<string, unknown>).plaqueConditions))
          : [],
      };

      const result = calculateBTMTOffset(btmtData);

      const btmtResult = await createCalibrationResult({
        sessionId: id,
        resultType: "bed_temp_offset",
        value: result.offsetCelsius,
        confidence: result.confidence,
        valueJson: {
          selectedPlaqueIndex: result.selectedPlaqueIndex,
        },
      });
      createdResults.push(btmtResult);
    } else if (procedureType === "diagnostic") {
      const grades: DiagnosticGrade[] = measurements.map((m) => ({
        category: m.notes ?? m.measurementType,
        grade: m.measuredValue >= 2 ? "pass" : m.measuredValue >= 1 ? "marginal" : "fail",
        notes: m.notes ?? undefined,
      }));

      const result = evaluateDiagnostic(grades);

      const diagResult = await createCalibrationResult({
        sessionId: id,
        resultType: "diagnostic_report",
        valueJson: {
          overallGrade: result.overallGrade,
          neededCalibrations: result.neededCalibrations,
          grades: result.grades,
        },
      });
      createdResults.push(diagResult);
    } else {
      return NextResponse.json(
        { error: `Unsupported procedure type: ${procedureType}` },
        { status: 400 },
      );
    }

    // Auto-advance session to "review"
    if (session.status === "calculating") {
      await updateCalibrationSessionStatus(id, "review");
    }

    return NextResponse.json(
      { results: createdResults, count: createdResults.length },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to compute results";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

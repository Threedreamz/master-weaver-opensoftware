import { NextRequest, NextResponse } from "next/server";
import {
  getCalibrationSessions,
  createCalibrationSession,
  getCalibrationProcedure,
  ensureCalibrationProceduresSeeded,
} from "@/db/queries/calibration";
import { getPrinterById } from "@/db/queries/printers";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const printerId = url.searchParams.get("printerId") ?? undefined;
    const procedureId = url.searchParams.get("procedureId") ?? undefined;
    const materialId = url.searchParams.get("materialId") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const limit = url.searchParams.get("limit")
      ? Math.min(parseInt(url.searchParams.get("limit")!, 10), 200)
      : undefined;

    const sessions = await getCalibrationSessions({
      printerId,
      procedureId,
      materialId,
      status,
      limit,
    });

    return NextResponse.json({
      sessions,
      count: sessions.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch sessions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { procedureId, printerId, materialId, notes } = body;

    if (!procedureId || typeof procedureId !== "string") {
      return NextResponse.json({ error: "procedureId is required" }, { status: 400 });
    }
    if (!printerId || typeof printerId !== "string") {
      return NextResponse.json({ error: "printerId is required" }, { status: 400 });
    }

    // Validate procedure exists
    await ensureCalibrationProceduresSeeded();
    const procedure = await getCalibrationProcedure(procedureId);
    if (!procedure) {
      return NextResponse.json({ error: "Procedure not found" }, { status: 400 });
    }

    // Validate printer exists and get stats
    const printer = await getPrinterById(printerId);
    if (!printer) {
      return NextResponse.json({ error: "Printer not found" }, { status: 400 });
    }

    const session = await createCalibrationSession({
      procedureId,
      printerId,
      materialId: materialId || undefined,
      notes: notes || undefined,
      printerHoursAtCalibration: printer.totalPrintHours ?? 0,
      printerCountAtCalibration: printer.totalPrintCount ?? 0,
    });

    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import {
  getCalibrationProcedures,
  ensureCalibrationProceduresSeeded,
} from "@/db/queries/calibration";

export async function GET(request: Request) {
  try {
    await ensureCalibrationProceduresSeeded();
    const { searchParams } = new URL(request.url);
    const tier = searchParams.get("tier") ?? undefined;
    const technology = searchParams.get("technology") ?? undefined;
    const procedures = await getCalibrationProcedures({ tier, technology });
    return NextResponse.json(procedures);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch procedures";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

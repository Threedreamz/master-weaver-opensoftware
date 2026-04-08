import { NextRequest, NextResponse } from "next/server";
import { getCalibrationHistory } from "@/db/queries/calibration";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const printerId = url.searchParams.get("printerId");

    if (!printerId) {
      return NextResponse.json(
        { error: "printerId query parameter is required" },
        { status: 400 },
      );
    }

    const procedureId = url.searchParams.get("procedureId") ?? undefined;
    const materialId = url.searchParams.get("materialId") ?? undefined;
    const limit = url.searchParams.get("limit")
      ? Math.min(parseInt(url.searchParams.get("limit")!, 10), 200)
      : undefined;

    const history = await getCalibrationHistory({
      printerId,
      procedureId,
      materialId,
      limit,
    });

    return NextResponse.json({
      history,
      count: history.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch calibration history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSliceResult, getGcode } from "../../../../../lib/openslicer-client";

/**
 * GET /api/integration/openslicer/:farmJobId
 *
 * Poll OpenSlicer for the status of a previously-submitted farm job. Returns
 * { status, estimatedTime, estimatedMaterial, layerCount, gcodeUrl? } when
 * available, or { status: "not_found" } if openslicer has no record for the
 * id.
 *
 * ?includeGcode=1 triggers a second request to fetch the G-code base64 inline
 * — expensive for large prints, so off by default. UIs typically poll without
 * it and only fetch the gcode on user action.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ farmJobId: string }> },
) {
  const { farmJobId } = await params;
  const url = new URL(request.url);
  const includeGcode = url.searchParams.get("includeGcode") === "1";

  try {
    const status = await getSliceResult(farmJobId);

    if (!includeGcode || status.status !== "completed") {
      return NextResponse.json(status);
    }

    const gcode = await getGcode(farmJobId);
    return NextResponse.json({ ...status, gcode });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/404|not.*found/i.test(message)) {
      return NextResponse.json({ farmJobId, status: "not_found" }, { status: 404 });
    }
    console.error("OpenSlicer status poll error:", err);
    return NextResponse.json(
      { error: "Failed to fetch slice status from OpenSlicer", detail: message },
      { status: 502 },
    );
  }
}

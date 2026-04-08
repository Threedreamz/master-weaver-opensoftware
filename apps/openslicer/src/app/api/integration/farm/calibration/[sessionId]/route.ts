import { NextResponse } from "next/server";
import { db } from "@/db";
import { slicerCalibrationPrints } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const record = await db.query.slicerCalibrationPrints.findFirst({
      where: eq(slicerCalibrationPrints.farmSessionId, sessionId),
    });

    if (!record) {
      return NextResponse.json(
        { error: "No calibration print found for this session" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: record.id,
      status: record.status,
      farmSessionId: record.farmSessionId,
      procedureType: record.procedureType,
      createdAt: record.createdAt,
    });
  } catch (err) {
    console.error("Farm calibration status error:", err);
    return NextResponse.json(
      { error: "Failed to get calibration print status" },
      { status: 500 },
    );
  }
}

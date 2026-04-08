import { NextResponse } from "next/server";
import { db } from "@/db";
import { slicerCalibrationPrints } from "@/db/schema";

interface CalibrationPrintRequest {
  farmSessionId: string;
  procedureType: "btmt" | "xy_scaling" | "z_scaling" | "diagnostic";
  materialId?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CalibrationPrintRequest;

    if (!body.farmSessionId || !body.procedureType) {
      return NextResponse.json(
        { error: "Missing required fields: farmSessionId, procedureType" },
        { status: 400 },
      );
    }

    const validTypes = ["btmt", "xy_scaling", "z_scaling", "diagnostic"];
    if (!validTypes.includes(body.procedureType)) {
      return NextResponse.json(
        { error: `Invalid procedureType. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 },
      );
    }

    const [record] = await db
      .insert(slicerCalibrationPrints)
      .values({
        farmSessionId: body.farmSessionId,
        procedureType: body.procedureType,
        status: "pending",
      })
      .returning();

    return NextResponse.json(
      { id: record.id, status: record.status },
      { status: 201 },
    );
  } catch (err) {
    console.error("Farm calibration print request error:", err);
    return NextResponse.json(
      { error: "Failed to create calibration print request" },
      { status: 500 },
    );
  }
}

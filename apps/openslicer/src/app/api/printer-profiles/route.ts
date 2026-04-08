import { NextResponse } from "next/server";
import { getAllPrinterProfiles, createPrinterProfile } from "../../../db/queries/printer-profiles";

export async function GET() {
  try {
    const profiles = getAllPrinterProfiles();
    return NextResponse.json(profiles);
  } catch (err) {
    console.error("Failed to fetch printer profiles:", err);
    return NextResponse.json(
      { error: "Failed to fetch printer profiles" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const profile = createPrinterProfile({
      name: body.name,
      vendor: body.vendor,
      model: body.model,
      bedSizeX: body.bedSizeX,
      bedSizeY: body.bedSizeY,
      bedSizeZ: body.bedSizeZ,
      nozzleDiameter: body.nozzleDiameter,
      nozzleCount: body.nozzleCount,
      firmwareFlavor: body.firmwareFlavor,
      maxAccelX: body.maxAccelX,
      maxAccelY: body.maxAccelY,
      maxSpeedX: body.maxSpeedX,
      maxSpeedY: body.maxSpeedY,
      isDefault: body.isDefault ?? false,
      description: body.description,
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (err) {
    console.error("Failed to create printer profile:", err);
    return NextResponse.json(
      { error: "Failed to create printer profile" },
      { status: 500 }
    );
  }
}

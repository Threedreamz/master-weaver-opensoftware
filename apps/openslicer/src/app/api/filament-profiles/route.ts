import { NextResponse } from "next/server";
import { getAllFilamentProfiles, createFilamentProfile } from "../../../db/queries/filament-profiles";

export async function GET() {
  try {
    const profiles = getAllFilamentProfiles();
    return NextResponse.json(profiles);
  } catch (err) {
    console.error("Failed to fetch filament profiles:", err);
    return NextResponse.json(
      { error: "Failed to fetch filament profiles" },
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

    const profile = createFilamentProfile({
      name: body.name,
      materialType: body.materialType,
      nozzleTemp: body.nozzleTemp,
      nozzleTempFirstLayer: body.nozzleTempFirstLayer,
      bedTemp: body.bedTemp,
      fanSpeedMin: body.fanSpeedMin,
      fanSpeedMax: body.fanSpeedMax,
      flowRatio: body.flowRatio,
      filamentDensity: body.filamentDensity,
      filamentCostPerKg: body.filamentCostPerKg,
      retractLength: body.retractLength,
      retractSpeed: body.retractSpeed,
      maxVolumetricSpeed: body.maxVolumetricSpeed,
      isDefault: body.isDefault ?? false,
      description: body.description,
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (err) {
    console.error("Failed to create filament profile:", err);
    return NextResponse.json(
      { error: "Failed to create filament profile" },
      { status: 500 }
    );
  }
}

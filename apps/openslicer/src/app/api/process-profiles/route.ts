import { NextResponse } from "next/server";
import { getAllProcessProfiles, createProcessProfile } from "../../../db/queries/process-profiles";

export async function GET() {
  try {
    const profiles = getAllProcessProfiles();
    return NextResponse.json(profiles);
  } catch (err) {
    console.error("Failed to fetch process profiles:", err);
    return NextResponse.json(
      { error: "Failed to fetch process profiles" },
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

    const profile = createProcessProfile({
      name: body.name,
      layerHeight: body.layerHeight,
      firstLayerHeight: body.firstLayerHeight,
      wallCount: body.wallCount,
      topLayers: body.topLayers,
      bottomLayers: body.bottomLayers,
      infillDensity: body.infillDensity,
      infillPattern: body.infillPattern,
      supportType: body.supportType,
      supportThreshold: body.supportThreshold,
      supportOnBuildPlateOnly: body.supportOnBuildPlateOnly,
      bridgeSpeed: body.bridgeSpeed,
      ironingEnabled: body.ironingEnabled,
      fuzzySkinEnabled: body.fuzzySkinEnabled,
      adaptiveLayerHeight: body.adaptiveLayerHeight,
      printSpeedPerimeter: body.printSpeedPerimeter,
      printSpeedInfill: body.printSpeedInfill,
      printSpeedTravel: body.printSpeedTravel,
      seamPosition: body.seamPosition,
      isDefault: body.isDefault ?? false,
      description: body.description,
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (err) {
    console.error("Failed to create process profile:", err);
    return NextResponse.json(
      { error: "Failed to create process profile" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getAllProfiles, createProfile } from "../../../db/queries/profiles";

export async function GET() {
  try {
    const profiles = getAllProfiles();
    return NextResponse.json(profiles);
  } catch (err) {
    console.error("Failed to fetch profiles:", err);
    return NextResponse.json(
      { error: "Failed to fetch profiles" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || !body.technology) {
      return NextResponse.json(
        { error: "name and technology are required" },
        { status: 400 }
      );
    }

    const profile = createProfile({
      name: body.name,
      technology: body.technology,
      slicerEngine: body.slicerEngine,
      layerHeight: body.layerHeight,
      nozzleDiameter: body.nozzleDiameter,
      infillDensity: body.infillDensity,
      supportEnabled: body.supportEnabled,
      exposureTime: body.exposureTime,
      bottomExposureTime: body.bottomExposureTime,
      laserPower: body.laserPower,
      scanSpeed: body.scanSpeed,
      isDefault: body.isDefault ?? false,
      description: body.description,
      config: body.config,
      rawConfigText: body.rawConfigText,
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (err) {
    console.error("Failed to create profile:", err);
    return NextResponse.json(
      { error: "Failed to create profile" },
      { status: 500 }
    );
  }
}

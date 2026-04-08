import { NextResponse } from "next/server";
import { createPrinterProfile } from "../../../../db/queries/printer-profiles";
import { createFilamentProfile } from "../../../../db/queries/filament-profiles";
import { createProcessProfile } from "../../../../db/queries/process-profiles";

const VALID_TYPES = ["printer", "filament", "process"] as const;
type ProfileType = (typeof VALID_TYPES)[number];

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate structure
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { type, name, settings } = body as {
      type: string;
      name: string;
      settings: Record<string, unknown>;
    };

    if (!type || !VALID_TYPES.includes(type as ProfileType)) {
      return NextResponse.json(
        { error: `Invalid profile type. Must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Profile name is required" },
        { status: 400 }
      );
    }

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "Profile settings are required" },
        { status: 400 }
      );
    }

    // Strip id/createdAt/updatedAt from settings if present (in case of re-import)
    const { id: _id, createdAt: _ca, updatedAt: _ua, ...cleanSettings } = settings;

    let profile: unknown;

    switch (type as ProfileType) {
      case "printer":
        profile = createPrinterProfile({
          name,
          vendor: cleanSettings.vendor as string | undefined,
          model: cleanSettings.model as string | undefined,
          bedSizeX: cleanSettings.bedSizeX as number | undefined,
          bedSizeY: cleanSettings.bedSizeY as number | undefined,
          bedSizeZ: cleanSettings.bedSizeZ as number | undefined,
          nozzleDiameter: cleanSettings.nozzleDiameter as number | undefined,
          nozzleCount: cleanSettings.nozzleCount as number | undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          firmwareFlavor: cleanSettings.firmwareFlavor as any,
          maxAccelX: cleanSettings.maxAccelX as number | undefined,
          maxAccelY: cleanSettings.maxAccelY as number | undefined,
          maxSpeedX: cleanSettings.maxSpeedX as number | undefined,
          maxSpeedY: cleanSettings.maxSpeedY as number | undefined,
          isDefault: false,
          description: cleanSettings.description as string | undefined,
        });
        break;

      case "filament":
        profile = createFilamentProfile({
          name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          materialType: cleanSettings.materialType as any,
          nozzleTemp: cleanSettings.nozzleTemp as number | undefined,
          nozzleTempFirstLayer: cleanSettings.nozzleTempFirstLayer as number | undefined,
          bedTemp: cleanSettings.bedTemp as number | undefined,
          fanSpeedMin: cleanSettings.fanSpeedMin as number | undefined,
          fanSpeedMax: cleanSettings.fanSpeedMax as number | undefined,
          flowRatio: cleanSettings.flowRatio as number | undefined,
          filamentDensity: cleanSettings.filamentDensity as number | undefined,
          filamentCostPerKg: cleanSettings.filamentCostPerKg as number | undefined,
          retractLength: cleanSettings.retractLength as number | undefined,
          retractSpeed: cleanSettings.retractSpeed as number | undefined,
          maxVolumetricSpeed: cleanSettings.maxVolumetricSpeed as number | undefined,
          isDefault: false,
          description: cleanSettings.description as string | undefined,
        });
        break;

      case "process":
        profile = createProcessProfile({
          name,
          layerHeight: cleanSettings.layerHeight as number | undefined,
          firstLayerHeight: cleanSettings.firstLayerHeight as number | undefined,
          wallCount: cleanSettings.wallCount as number | undefined,
          topLayers: cleanSettings.topLayers as number | undefined,
          bottomLayers: cleanSettings.bottomLayers as number | undefined,
          infillDensity: cleanSettings.infillDensity as number | undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          infillPattern: cleanSettings.infillPattern as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supportType: cleanSettings.supportType as any,
          supportThreshold: cleanSettings.supportThreshold as number | undefined,
          supportOnBuildPlateOnly: cleanSettings.supportOnBuildPlateOnly as boolean | undefined,
          bridgeSpeed: cleanSettings.bridgeSpeed as number | undefined,
          ironingEnabled: cleanSettings.ironingEnabled as boolean | undefined,
          fuzzySkinEnabled: cleanSettings.fuzzySkinEnabled as boolean | undefined,
          adaptiveLayerHeight: cleanSettings.adaptiveLayerHeight as boolean | undefined,
          printSpeedPerimeter: cleanSettings.printSpeedPerimeter as number | undefined,
          printSpeedInfill: cleanSettings.printSpeedInfill as number | undefined,
          printSpeedTravel: cleanSettings.printSpeedTravel as number | undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          seamPosition: cleanSettings.seamPosition as any,
          isDefault: false,
          description: cleanSettings.description as string | undefined,
        });
        break;
    }

    return NextResponse.json(
      { success: true, type, profile },
      { status: 201 }
    );
  } catch (err) {
    console.error("Failed to import profile:", err);
    return NextResponse.json(
      { error: "Failed to import profile" },
      { status: 500 }
    );
  }
}

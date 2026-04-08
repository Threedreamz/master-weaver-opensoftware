import { NextResponse } from "next/server";
import { resolve } from "path";
import { statSync } from "fs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/index";

/**
 * GET /api/demo/seed
 *
 * Generates the demo overhang STL and seeds the database with a model record
 * and two default slicer profiles. Idempotent -- safe to call multiple times.
 */
export async function GET() {
  try {
    const { slicerModels, slicerProfiles, slicerPrinterProfiles, slicerFilamentProfiles, slicerProcessProfiles } = schema;

    // --- Generate STL ---
    // Dynamic import to avoid bundling Node buffer manipulation in the client
    const { generateDemoSTL } = await import("../../../../../scripts/generate-demo-stl");

    const modelRelPath = "data/models/demo-overhang-test.stl";
    const modelAbsPath = resolve(process.cwd(), modelRelPath);
    const stlResult = generateDemoSTL(modelAbsPath);

    // --- Seed model (idempotent) ---
    const DEMO_MODEL_NAME = "Demo Overhang Test";

    const existingModel = db
      .select()
      .from(slicerModels)
      .where(eq(slicerModels.name, DEMO_MODEL_NAME))
      .get();

    let modelId: string;

    if (existingModel) {
      modelId = existingModel.id;
    } else {
      const fileStats = statSync(modelAbsPath);
      const model = db
        .insert(slicerModels)
        .values({
          name: DEMO_MODEL_NAME,
          filename: "demo-overhang-test.stl",
          fileFormat: "stl",
          filePath: modelRelPath,
          fileSizeBytes: fileStats.size,
          boundingBoxX: 35,
          boundingBoxY: 20,
          boundingBoxZ: 30,
          triangleCount: stlResult.triangleCount,
          isManifold: true,
          meshAnalyzed: false,
          description:
            "Overhang test piece with 45-degree and 60-degree shelves for testing support generation and arc overhang optimization.",
          tags: ["demo", "overhang-test", "support-test"],
        })
        .returning()
        .get();

      modelId = model.id;
    }

    // --- Seed profiles (idempotent) ---
    const profileDefs = [
      {
        name: "Standard FDM 0.2mm",
        technology: "fdm" as const,
        slicerEngine: "prusaslicer" as const,
        layerHeight: 0.2,
        nozzleDiameter: 0.4,
        infillDensity: 20,
        supportEnabled: true,
        isDefault: true,
        description: "Standard quality FDM profile. 0.2mm layers, 20% infill, supports enabled.",
        config: {
          layerHeight: 0.2,
          nozzleDiameter: 0.4,
          infillDensity: 20,
          supportEnabled: true,
          printSpeed: 60,
          bedTemp: 60,
          nozzleTemp: 210,
        },
      },
      {
        name: "Quality FDM 0.1mm",
        technology: "fdm" as const,
        slicerEngine: "prusaslicer" as const,
        layerHeight: 0.1,
        nozzleDiameter: 0.4,
        infillDensity: 30,
        supportEnabled: true,
        isDefault: true,
        description: "High quality FDM profile. 0.1mm layers, 30% infill, supports enabled.",
        config: {
          layerHeight: 0.1,
          nozzleDiameter: 0.4,
          infillDensity: 30,
          supportEnabled: true,
          printSpeed: 40,
          bedTemp: 60,
          nozzleTemp: 210,
        },
      },
    ];

    const profileIds: string[] = [];

    for (const profileData of profileDefs) {
      const existing = db
        .select()
        .from(slicerProfiles)
        .where(eq(slicerProfiles.name, profileData.name))
        .get();

      if (existing) {
        profileIds.push(existing.id);
      } else {
        const profile = db
          .insert(slicerProfiles)
          .values(profileData)
          .returning()
          .get();
        profileIds.push(profile.id);
      }
    }

    // --- Seed tri-profile system (idempotent) ---

    // Printer profiles
    const printerDefs = [
      {
        name: "Generic FDM 250x210",
        vendor: "Generic",
        model: "FDM Printer",
        bedSizeX: 250,
        bedSizeY: 210,
        bedSizeZ: 210,
        nozzleDiameter: 0.4,
        nozzleCount: 1,
        firmwareFlavor: "marlin" as const,
        isDefault: true,
        description: "Generic FDM printer with 250x210x210mm build volume and 0.4mm nozzle.",
      },
    ];

    const printerProfileIds: string[] = [];
    for (const def of printerDefs) {
      const existing = db
        .select()
        .from(slicerPrinterProfiles)
        .where(eq(slicerPrinterProfiles.name, def.name))
        .get();
      if (existing) {
        printerProfileIds.push(existing.id);
      } else {
        const row = db.insert(slicerPrinterProfiles).values(def).returning().get();
        printerProfileIds.push(row.id);
      }
    }

    // Filament profiles
    const filamentDefs = [
      {
        name: "Generic PLA",
        materialType: "PLA" as const,
        nozzleTemp: 200,
        nozzleTempFirstLayer: 205,
        bedTemp: 60,
        fanSpeedMin: 100,
        fanSpeedMax: 100,
        flowRatio: 1.0,
        filamentDensity: 1.24,
        retractLength: 0.8,
        retractSpeed: 30,
        maxVolumetricSpeed: 15.0,
        isDefault: true,
        description: "Generic PLA filament. 200C nozzle, 60C bed.",
      },
      {
        name: "Generic PETG",
        materialType: "PETG" as const,
        nozzleTemp: 230,
        nozzleTempFirstLayer: 235,
        bedTemp: 80,
        fanSpeedMin: 30,
        fanSpeedMax: 50,
        flowRatio: 1.0,
        filamentDensity: 1.27,
        retractLength: 1.0,
        retractSpeed: 30,
        maxVolumetricSpeed: 12.0,
        isDefault: true,
        description: "Generic PETG filament. 230C nozzle, 80C bed.",
      },
    ];

    const filamentProfileIds: string[] = [];
    for (const def of filamentDefs) {
      const existing = db
        .select()
        .from(slicerFilamentProfiles)
        .where(eq(slicerFilamentProfiles.name, def.name))
        .get();
      if (existing) {
        filamentProfileIds.push(existing.id);
      } else {
        const row = db.insert(slicerFilamentProfiles).values(def).returning().get();
        filamentProfileIds.push(row.id);
      }
    }

    // Process profiles
    const processDefs = [
      {
        name: "Standard 0.2mm",
        layerHeight: 0.2,
        firstLayerHeight: 0.2,
        wallCount: 3,
        topLayers: 4,
        bottomLayers: 4,
        infillDensity: 20,
        infillPattern: "rectilinear" as const,
        supportType: "none" as const,
        supportThreshold: 45,
        printSpeedPerimeter: 45,
        printSpeedInfill: 80,
        printSpeedTravel: 150,
        seamPosition: "nearest" as const,
        isDefault: true,
        description: "Standard quality. 0.2mm layers, 20% rectilinear infill.",
      },
      {
        name: "Quality 0.1mm",
        layerHeight: 0.1,
        firstLayerHeight: 0.15,
        wallCount: 4,
        topLayers: 5,
        bottomLayers: 5,
        infillDensity: 20,
        infillPattern: "gyroid" as const,
        supportType: "none" as const,
        supportThreshold: 45,
        printSpeedPerimeter: 30,
        printSpeedInfill: 60,
        printSpeedTravel: 150,
        seamPosition: "aligned" as const,
        isDefault: true,
        description: "High quality. 0.1mm layers, 20% gyroid infill.",
      },
    ];

    const processProfileIds: string[] = [];
    for (const def of processDefs) {
      const existing = db
        .select()
        .from(slicerProcessProfiles)
        .where(eq(slicerProcessProfiles.name, def.name))
        .get();
      if (existing) {
        processProfileIds.push(existing.id);
      } else {
        const row = db.insert(slicerProcessProfiles).values(def).returning().get();
        processProfileIds.push(row.id);
      }
    }

    return NextResponse.json({
      success: true,
      modelId,
      profileIds,
      printerProfileIds,
      filamentProfileIds,
      processProfileIds,
      stl: {
        path: modelRelPath,
        triangleCount: stlResult.triangleCount,
        fileSizeBytes: stlResult.fileSizeBytes,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

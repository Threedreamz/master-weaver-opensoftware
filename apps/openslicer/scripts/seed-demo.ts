/**
 * Seed script: generates the demo overhang STL and populates OpenSlicer DB
 * with a demo model record and two default slicer profiles.
 *
 * Usage:  tsx scripts/seed-demo.ts
 */

import { resolve } from "path";
import { statSync } from "fs";
import { eq } from "drizzle-orm";
import { generateDemoSTL } from "./generate-demo-stl";
import { db } from "../src/db/index";
import { slicerModels, slicerProfiles } from "../src/db/schema";

const DEMO_MODEL_NAME = "Demo Overhang Test";
const MODEL_FILENAME = "demo-overhang-test.stl";
const MODEL_REL_PATH = "data/models/demo-overhang-test.stl";

async function seed() {
  const appRoot = resolve(__dirname, "..");
  const modelOutputPath = resolve(appRoot, MODEL_REL_PATH);

  // 1. Generate the STL file
  console.log("Generating demo STL...");
  const stlResult = generateDemoSTL(modelOutputPath);
  console.log(`  -> ${stlResult.triangleCount} triangles, ${stlResult.fileSizeBytes} bytes`);

  // 2. Check if demo model already exists (idempotent)
  const existing = db
    .select()
    .from(slicerModels)
    .where(eq(slicerModels.name, DEMO_MODEL_NAME))
    .get();

  let modelId: string;

  if (existing) {
    console.log(`Model "${DEMO_MODEL_NAME}" already exists (id: ${existing.id}), skipping insert.`);
    modelId = existing.id;
  } else {
    const fileStats = statSync(modelOutputPath);
    const model = db
      .insert(slicerModels)
      .values({
        name: DEMO_MODEL_NAME,
        filename: MODEL_FILENAME,
        fileFormat: "stl",
        filePath: MODEL_REL_PATH,
        fileSizeBytes: fileStats.size,
        boundingBoxX: 35, // 20mm pillar + 15mm shelf
        boundingBoxY: 20,
        boundingBoxZ: 30,
        triangleCount: stlResult.triangleCount,
        isManifold: true,
        meshAnalyzed: false,
        description: "Overhang test piece with 45-degree and 60-degree shelves for testing support generation and arc overhang optimization.",
        tags: ["demo", "overhang-test", "support-test"],
      })
      .returning()
      .get();

    modelId = model.id;
    console.log(`Inserted model "${DEMO_MODEL_NAME}" (id: ${modelId})`);
  }

  // 3. Insert default profiles (idempotent)
  const profiles = [
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

  for (const profileData of profiles) {
    const existingProfile = db
      .select()
      .from(slicerProfiles)
      .where(eq(slicerProfiles.name, profileData.name))
      .get();

    if (existingProfile) {
      console.log(`Profile "${profileData.name}" already exists (id: ${existingProfile.id}), skipping.`);
      profileIds.push(existingProfile.id);
    } else {
      const profile = db
        .insert(slicerProfiles)
        .values(profileData)
        .returning()
        .get();
      console.log(`Inserted profile "${profileData.name}" (id: ${profile.id})`);
      profileIds.push(profile.id);
    }
  }

  console.log("\nSeed complete!");
  console.log(`  Model ID:    ${modelId}`);
  console.log(`  Profile IDs: ${profileIds.join(", ")}`);

  return { modelId, profileIds };
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

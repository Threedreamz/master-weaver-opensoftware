import { NextResponse } from "next/server";
import { readFileSync, mkdirSync, statSync, writeFileSync, renameSync, copyFileSync, unlinkSync } from "fs";
import { join, resolve } from "path";
import {
  createSlicer,
  InternalSlicer,
  parseModel,
  analyzeOverhangs,
  parseGcodeMetadata,
} from "@opensoftware/slicer-core";
import type { InternalSlicerProfile } from "@opensoftware/slicer-core";
import { getModelById } from "../../../db/queries/models";
import { getProfileById } from "../../../db/queries/profiles";
import { getProcessProfileById } from "../../../db/queries/process-profiles";
import { getPrinterProfileById } from "../../../db/queries/printer-profiles";
import { getFilamentProfileById } from "../../../db/queries/filament-profiles";
import { createHistory, updateHistoryStatus } from "../../../db/queries/history";
import { db } from "../../../db";
import { slicerGcodes } from "../../../db/schema";

const DATA_DIR = resolve(process.cwd(), "data");
const GCODES_DIR = join(DATA_DIR, "gcodes");

interface SliceRequestBody {
  modelId: string;
  profileId: string;
  printerProfileId?: string;
  filamentProfileId?: string;
  engine?: "internal" | "prusaslicer" | "orcaslicer";
  arcOverhangEnabled?: boolean;
}

export async function POST(request: Request) {
  let body: SliceRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { modelId, profileId, printerProfileId, engine = "prusaslicer", arcOverhangEnabled = false } = body;

  if (!modelId || !profileId) {
    return NextResponse.json(
      { error: "modelId and profileId are required" },
      { status: 400 },
    );
  }

  // Look up model
  const model = getModelById(modelId);
  if (!model) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  // Look up profile (check legacy table first, then process profiles)
  let profile = getProfileById(profileId);
  if (!profile) {
    const processProfile = getProcessProfileById(profileId);
    if (processProfile) {
      // Adapt process profile to legacy format for the slicer
      profile = {
        id: processProfile.id,
        name: processProfile.name,
        technology: "fdm" as const,
        slicerEngine: "internal" as const,
        layerHeight: processProfile.layerHeight ?? 0.2,
        infillDensity: processProfile.infillDensity ?? 20,
        supportEnabled: processProfile.supportType !== "none",
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        config: null,
        rawConfigText: null,
        nozzleDiameter: null,
        exposureTime: null,
        bottomExposureTime: null,
        laserPower: null,
        scanSpeed: null,
        isDefault: null,
      };
    }
  }
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Create history record (pending)
  const history = createHistory({
    modelId,
    profileId,
    status: "pending",
    slicerEngine: engine,
    technology: profile.technology ?? "fdm",
  });

  try {
    // Update status to slicing
    updateHistoryStatus(history.id, "slicing", { startedAt: new Date() });

    // Ensure output directory exists
    mkdirSync(GCODES_DIR, { recursive: true });

    // Read model file for mesh data and overhang analysis
    let meshData;
    let overhangResult;

    try {
      const modelBuffer = readFileSync(model.filePath);
      const format = model.fileFormat ?? "stl";
      meshData = await parseModel(modelBuffer, format);

      if (arcOverhangEnabled && meshData) {
        overhangResult = analyzeOverhangs(meshData.triangles, {
          layerHeight: profile.layerHeight ?? 0.2,
        });
      }
    } catch {
      // If we can't parse the model for mesh data, continue without it
      // The slicer will use default bounding box
    }

    // Determine which engine to use
    let usedEngine = engine;
    let slicerResult;

    if (engine === "internal") {
      // Use internal slicer -- always works
      const slicer = createSlicer("internal") as InternalSlicer;

      if (meshData) {
        slicer.setMeshData(meshData);
      }

      if (overhangResult) {
        slicer.setOverhangData(overhangResult);
      }

      // Map profile DB fields to internal slicer profile
      const internalProfile: InternalSlicerProfile = {
        layerHeight: profile.layerHeight ?? 0.2,
        infillDensity: profile.infillDensity ?? 20,
        nozzleTemp: 210,
        bedTemp: 60,
        printSpeed: 60,
        nozzleDiameter: profile.nozzleDiameter ?? 0.4,
        supportEnabled: profile.supportEnabled ?? false,
      };

      // Pull extra settings from profile config JSON
      if (profile.config && typeof profile.config === "object") {
        const cfg = profile.config as Record<string, unknown>;
        if (typeof cfg.nozzleTemp === "number") internalProfile.nozzleTemp = cfg.nozzleTemp;
        if (typeof cfg.bedTemp === "number") internalProfile.bedTemp = cfg.bedTemp;
        if (typeof cfg.printSpeed === "number") internalProfile.printSpeed = cfg.printSpeed;
        if (typeof cfg.filamentDiameter === "number")
          internalProfile.filamentDiameter = cfg.filamentDiameter;
      }

      // Load custom start/end G-code from printer profile
      if (printerProfileId) {
        const printerProfile = getPrinterProfileById(printerProfileId);
        if (printerProfile) {
          if (printerProfile.startGcode) internalProfile.startGcode = printerProfile.startGcode;
          if (printerProfile.endGcode) internalProfile.endGcode = printerProfile.endGcode;
          // Use printer nozzle diameter if available
          if (printerProfile.nozzleDiameter) internalProfile.nozzleDiameter = printerProfile.nozzleDiameter;
        }
      }

      slicer.setProfile(internalProfile);

      slicerResult = await slicer.slice({
        modelPath: model.filePath,
        outputDir: GCODES_DIR,
      });
    } else {
      // Try external slicer, fall back to internal
      const externalSlicer = createSlicer(engine);
      const available = await externalSlicer.isAvailable();

      if (available) {
        slicerResult = await externalSlicer.slice({
          modelPath: model.filePath,
          outputDir: GCODES_DIR,
          profilePath: profile.rawConfigText
            ? writeProfileTemp(profile.rawConfigText, history.id)
            : undefined,
          overrides: profile.config
            ? Object.fromEntries(
                Object.entries(profile.config).map(([k, v]) => [k, String(v)]),
              )
            : undefined,
        });
      } else {
        // Fall back to internal
        usedEngine = "internal";
        const slicer = createSlicer("internal") as InternalSlicer;

        if (meshData) slicer.setMeshData(meshData);
        if (overhangResult) slicer.setOverhangData(overhangResult);

        slicer.setProfile({
          layerHeight: profile.layerHeight ?? 0.2,
          infillDensity: profile.infillDensity ?? 20,
          nozzleDiameter: profile.nozzleDiameter ?? 0.4,
          supportEnabled: profile.supportEnabled ?? false,
        });

        slicerResult = await slicer.slice({
          modelPath: model.filePath,
          outputDir: GCODES_DIR,
        });
      }
    }

    if (!slicerResult.success || !slicerResult.outputPath) {
      updateHistoryStatus(history.id, "failed", {
        errorMessage: slicerResult.errors?.join("; ") ?? "Slicing failed",
        completedAt: new Date(),
      });

      return NextResponse.json(
        {
          error: "Slicing failed",
          details: slicerResult.errors,
          engine: usedEngine,
        },
        { status: 500 },
      );
    }

    // Parse G-code metadata from the output file
    let gcodeMetadata;
    try {
      const gcodeContent = readFileSync(slicerResult.outputPath, "utf-8");
      gcodeMetadata = parseGcodeMetadata(gcodeContent);
    } catch {
      // Use estimates from slicer result
    }

    const estimatedTime =
      gcodeMetadata?.estimatedTime ?? slicerResult.estimatedTime ?? 0;
    const estimatedMaterial =
      gcodeMetadata?.filamentUsedGrams ?? slicerResult.estimatedMaterial ?? 0;
    const layerCount =
      gcodeMetadata?.layerCount ?? slicerResult.layerCount ?? 0;
    const filamentLengthM =
      gcodeMetadata?.filamentUsedMeters ?? (slicerResult.filamentLengthMm ? slicerResult.filamentLengthMm / 1000 : 0);

    // Calculate estimated cost from filament profile if available
    let estimatedCost: number | null = null;
    if (body.filamentProfileId && estimatedMaterial > 0) {
      const filamentProfile = getFilamentProfileById(body.filamentProfileId);
      if (filamentProfile?.filamentCostPerKg) {
        estimatedCost = Math.round((estimatedMaterial / 1000) * filamentProfile.filamentCostPerKg * 100) / 100;
      }
    }

    // Rename output to use historyId for consistent naming
    const finalPath = join(GCODES_DIR, `${history.id}.gcode`);
    if (slicerResult.outputPath !== finalPath) {
      try {
        renameSync(slicerResult.outputPath, finalPath);
      } catch {
        // If rename fails (cross-device), copy instead
        copyFileSync(slicerResult.outputPath, finalPath);
        try {
          unlinkSync(slicerResult.outputPath);
        } catch {
          // ignore cleanup failure
        }
      }
    }

    // Get file size
    let fileSizeBytes = 0;
    try {
      fileSizeBytes = statSync(finalPath).size;
    } catch {
      // ignore
    }

    // Update history to completed
    updateHistoryStatus(history.id, "completed", {
      outputFilePath: finalPath,
      estimatedTime,
      estimatedMaterial,
      layerCount,
      completedAt: new Date(),
    });

    // Create gcode record
    const gcodeRecord = db
      .insert(slicerGcodes)
      .values({
        historyId: history.id,
        filePath: finalPath,
        fileSizeBytes,
        metadata: {
          time: estimatedTime,
          material: estimatedMaterial,
          layers: layerCount,
        },
      })
      .returning()
      .get();

    return NextResponse.json({
      historyId: history.id,
      gcodeId: gcodeRecord.id,
      metadata: {
        estimatedTime,
        estimatedMaterial,
        layerCount,
        filamentLengthM: Math.round(filamentLengthM * 100) / 100,
        estimatedCost,
        slicerName: gcodeMetadata?.slicerName ?? `OpenSlicer ${usedEngine}`,
      },
      engine: usedEngine,
      fallback: usedEngine !== engine,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    updateHistoryStatus(history.id, "failed", {
      errorMessage: message,
      completedAt: new Date(),
    });

    return NextResponse.json(
      { error: "Unexpected slicing error", details: message },
      { status: 500 },
    );
  }
}

/**
 * Write profile raw config text to a temp file for CLI slicers.
 */
function writeProfileTemp(rawConfig: string, historyId: string): string {
  const tmpDir = join(DATA_DIR, "tmp");
  mkdirSync(tmpDir, { recursive: true });
  const tmpPath = join(tmpDir, `profile-${historyId}.ini`);
  writeFileSync(tmpPath, rawConfig, "utf-8");
  return tmpPath;
}

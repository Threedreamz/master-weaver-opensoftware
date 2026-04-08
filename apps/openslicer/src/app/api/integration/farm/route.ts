import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { parseModel, computeMeshMetrics } from "@opensoftware/slicer-core";
import { createModel, updateModel } from "../../../../db/queries/models";
import { createHistory } from "../../../../db/queries/history";

const UPLOAD_DIR = join(process.cwd(), "data", "models");

interface FarmModelRequest {
  modelName: string;
  modelData: string; // base64
  fileFormat: "stl" | "3mf" | "obj" | "step";
  profileId?: string;
  farmJobId: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FarmModelRequest;

    if (!body.modelName || !body.modelData || !body.fileFormat || !body.farmJobId) {
      return NextResponse.json(
        { error: "Missing required fields: modelName, modelData, fileFormat, farmJobId" },
        { status: 400 },
      );
    }

    // Decode base64 model data
    const buffer = Buffer.from(body.modelData, "base64");
    const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
    const safeFilename = `${hash}_${body.modelName.replace(/[^a-zA-Z0-9._-]/g, "_")}.${body.fileFormat}`;

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    const filePath = join(UPLOAD_DIR, safeFilename);
    await writeFile(filePath, buffer);

    // Create DB record
    const model = createModel({
      name: body.modelName,
      filename: `${body.modelName}.${body.fileFormat}`,
      fileFormat: body.fileFormat,
      filePath,
      fileSizeBytes: buffer.length,
      fileHash: hash,
      meshAnalyzed: false,
      uploadedBy: "openfarm",
      description: `Imported from OpenFarm (job: ${body.farmJobId})`,
    });

    // Auto-analyze
    let analysisResult: Record<string, unknown> | null = null;
    try {
      const meshData = await parseModel(buffer, body.fileFormat);
      const metrics = computeMeshMetrics(meshData);

      updateModel(model.id, {
        triangleCount: metrics.triangleCount,
        vertexCount: metrics.vertexCount,
        boundingBoxX: metrics.dimensions.x,
        boundingBoxY: metrics.dimensions.y,
        boundingBoxZ: metrics.dimensions.z,
        volumeCm3: metrics.volumeCm3,
        surfaceAreaCm2: metrics.surfaceAreaCm2,
        isManifold: metrics.isManifold,
        meshAnalyzed: true,
      });

      analysisResult = {
        triangleCount: metrics.triangleCount,
        vertexCount: metrics.vertexCount,
        boundingBox: metrics.dimensions,
        volumeCm3: metrics.volumeCm3,
        surfaceAreaCm2: metrics.surfaceAreaCm2,
        isManifold: metrics.isManifold,
      };
    } catch {
      // Analysis failed — continue without it
    }

    // If profileId provided, auto-start slicing
    let sliceStatus: "pending" | "slicing" = "pending";
    if (body.profileId) {
      try {
        createHistory({
          modelId: model.id,
          profileId: body.profileId,
          status: "pending",
        });
        sliceStatus = "pending";
      } catch {
        // Slicing queue failed — still return model info
      }
    }

    return NextResponse.json({
      slicerModelId: model.id,
      status: sliceStatus,
      analysisResult,
      farmJobId: body.farmJobId,
    });
  } catch (err) {
    console.error("Farm integration upload error:", err);
    return NextResponse.json(
      { error: "Failed to process model from OpenFarm" },
      { status: 500 },
    );
  }
}

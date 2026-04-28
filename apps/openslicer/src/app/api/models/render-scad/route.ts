import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  parseOpenSCAD,
  applyParameters,
  computeMeshMetrics,
} from "@opensoftware/slicer-core";
import { createModel, updateModel } from "../../../../db/queries/models";
import { resolveUser } from "../../../../lib/internal-user";

const UPLOAD_DIR = join(process.cwd(), "data", "models");

/**
 * POST /api/models/render-scad
 *
 * Body (JSON):
 *   { scadSource: string, parameters?: Record<string, number>, filename?: string }
 *
 * Renders the provided OpenSCAD source to STL via the CLI, saves it as a model,
 * and returns the model record with mesh analysis.
 */
export async function POST(request: Request) {
  const u = await resolveUser(request);
  if (u instanceof NextResponse) return u;

  try {
    const body = await request.json();
    const { scadSource, parameters, filename } = body as {
      scadSource: string;
      parameters?: Record<string, number>;
      filename?: string;
    };

    if (!scadSource || typeof scadSource !== "string") {
      return NextResponse.json(
        { error: "scadSource is required and must be a string" },
        { status: 400 }
      );
    }

    // Apply parameter overrides if provided
    let finalSource = scadSource;
    if (parameters && Object.keys(parameters).length > 0) {
      finalSource = applyParameters(scadSource, parameters);
    }

    const sourceBuffer = Buffer.from(finalSource, "utf-8");

    // Render to mesh via OpenSCAD CLI
    let meshData;
    try {
      meshData = parseOpenSCAD(sourceBuffer);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: message },
        { status: 422 }
      );
    }

    const metrics = computeMeshMetrics(meshData);

    // Save the rendered STL (we re-render to get the STL bytes for storage)
    // Actually we save the .scad source so it can be re-rendered later
    const hash = createHash("sha256").update(sourceBuffer).digest("hex").slice(0, 16);
    const safeName = (filename || "openscad_model").replace(/[^a-zA-Z0-9._-]/g, "_");
    const scadFilename = `${hash}_${safeName}.scad`;

    await mkdir(UPLOAD_DIR, { recursive: true });

    const filePath = join(UPLOAD_DIR, scadFilename);
    await writeFile(filePath, finalSource, "utf-8");

    const name = (filename || "OpenSCAD Model").replace(/\.scad$/i, "");

    const model = createModel({
      name,
      filename: `${safeName}.scad`,
      fileFormat: "scad",
      filePath,
      fileSizeBytes: sourceBuffer.length,
      fileHash: hash,
      meshAnalyzed: false,
    });

    const updated = updateModel(model.id, {
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

    return NextResponse.json({
      id: model.id,
      name: model.name,
      filename: model.filename,
      fileFormat: "scad",
      fileSizeBytes: sourceBuffer.length,
      triangleCount: metrics.triangleCount,
      boundingBox: metrics.dimensions,
      volumeCm3: metrics.volumeCm3,
      surfaceAreaCm2: metrics.surfaceAreaCm2,
      isManifold: metrics.isManifold,
      meshAnalyzed: true,
    });
  } catch (err) {
    console.error("OpenSCAD render error:", err);
    return NextResponse.json(
      { error: "OpenSCAD render failed" },
      { status: 500 }
    );
  }
}

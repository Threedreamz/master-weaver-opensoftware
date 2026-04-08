import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { parseModel, computeMeshMetrics } from "@opensoftware/slicer-core";
import { createModel, updateModel } from "../../../../db/queries/models";

const UPLOAD_DIR = join(process.cwd(), "data", "models");

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() || "stl";
    const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
    const safeFilename = `${hash}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    const filePath = join(UPLOAD_DIR, safeFilename);
    await writeFile(filePath, buffer);

    // Create DB record
    const name = file.name.replace(/\.[^.]+$/, "");
    const model = createModel({
      name,
      filename: file.name,
      fileFormat: ext as "stl" | "3mf" | "obj" | "step",
      filePath,
      fileSizeBytes: buffer.length,
      fileHash: hash,
      meshAnalyzed: false,
    });

    // Auto-analyze if supported format
    try {
      const meshData = await parseModel(buffer, ext);
      const metrics = computeMeshMetrics(meshData);

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
        fileFormat: ext,
        fileSizeBytes: buffer.length,
        triangleCount: metrics.triangleCount,
        boundingBox: metrics.dimensions,
        volumeCm3: metrics.volumeCm3,
        surfaceAreaCm2: metrics.surfaceAreaCm2,
        isManifold: metrics.isManifold,
        meshAnalyzed: true,
      });
    } catch {
      // Analysis failed (unsupported format, malformed file, etc.) — return without analysis
      return NextResponse.json({
        id: model.id,
        name: model.name,
        filename: model.filename,
        fileFormat: ext,
        fileSizeBytes: buffer.length,
        meshAnalyzed: false,
      });
    }
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}

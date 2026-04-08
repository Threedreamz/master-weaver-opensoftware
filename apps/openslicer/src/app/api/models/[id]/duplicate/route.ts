import { NextResponse } from "next/server";
import { copyFile } from "node:fs/promises";
import { join, dirname, extname, basename } from "node:path";
import { getModelById, createModel } from "../../../../../db/queries/models";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const original = getModelById(id);

  if (!original) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  try {
    // Copy the STL file on disk
    const dir = dirname(original.filePath);
    const ext = extname(original.filePath);
    const base = basename(original.filePath, ext);
    const copyPath = join(dir, `${base}_copy_${Date.now()}${ext}`);

    await copyFile(original.filePath, copyPath);

    // Create a new DB record
    const newModel = createModel({
      name: `${original.name} (copy)`,
      filename: original.filename,
      fileFormat: original.fileFormat as "stl" | "3mf" | "obj" | "step",
      filePath: copyPath,
      fileSizeBytes: original.fileSizeBytes,
      fileHash: original.fileHash,
      triangleCount: original.triangleCount,
      vertexCount: original.vertexCount,
      boundingBoxX: original.boundingBoxX,
      boundingBoxY: original.boundingBoxY,
      boundingBoxZ: original.boundingBoxZ,
      volumeCm3: original.volumeCm3,
      surfaceAreaCm2: original.surfaceAreaCm2,
      isManifold: original.isManifold,
      meshAnalyzed: original.meshAnalyzed,
    });

    return NextResponse.json({
      id: newModel.id,
      name: newModel.name,
      filename: newModel.filename,
      fileFormat: newModel.fileFormat,
      fileSizeBytes: newModel.fileSizeBytes,
      triangleCount: newModel.triangleCount,
      boundingBox: newModel.boundingBoxX
        ? {
            x: newModel.boundingBoxX,
            y: newModel.boundingBoxY,
            z: newModel.boundingBoxZ,
          }
        : undefined,
      volumeCm3: newModel.volumeCm3,
      surfaceAreaCm2: newModel.surfaceAreaCm2,
      isManifold: newModel.isManifold,
      meshAnalyzed: newModel.meshAnalyzed,
    });
  } catch (err) {
    console.error("Duplicate model error:", err);
    return NextResponse.json(
      { error: "Failed to duplicate model" },
      { status: 500 }
    );
  }
}

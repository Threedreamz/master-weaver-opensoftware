import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { parseModel, computeMeshMetrics } from "@opensoftware/slicer-core";
import { getModelById, updateModel } from "../../../../../db/queries/models";
import { resolveUser } from "../../../../../lib/internal-user";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const u = await resolveUser(request);
  if (u instanceof NextResponse) return u;

  const { id } = await params;
  const model = getModelById(id);

  if (!model) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(model.filePath);
    const format = model.fileFormat || "stl";
    const meshData = await parseModel(buffer, format);
    const metrics = computeMeshMetrics(meshData);

    const updated = updateModel(id, {
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
      id,
      triangleCount: metrics.triangleCount,
      vertexCount: metrics.vertexCount,
      dimensions: metrics.dimensions,
      volumeCm3: metrics.volumeCm3,
      surfaceAreaCm2: metrics.surfaceAreaCm2,
      isManifold: metrics.isManifold,
      overhangAngleMax: metrics.overhangAngleMax,
      thinWallMin: metrics.thinWallMin,
      meshAnalyzed: true,
    });
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: "Analysis failed", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

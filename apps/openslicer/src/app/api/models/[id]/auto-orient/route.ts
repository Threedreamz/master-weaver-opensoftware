import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { parseModel, computeOrientations } from "@opensoftware/slicer-core";
import { getModelById } from "../../../../../db/queries/models";
import { resolveUser } from "../../../../../lib/internal-user";

/**
 * POST /api/models/[id]/auto-orient
 *
 * One-click auto-orient: reads the model, computes candidate orientations,
 * and returns the single best rotation (minimizes support, maximizes build
 * plate contact). No manual face selection required.
 */
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
    const body = await request.json().catch(() => ({}));
    const technology = body.technology || "fdm";

    const buffer = await readFile(model.filePath);
    const format = model.fileFormat || "stl";
    const meshData = await parseModel(buffer, format);

    const candidates = computeOrientations(meshData, {
      technology,
      maxCandidates: 1,
    });

    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: "No valid orientation found" },
        { status: 422 }
      );
    }

    const best = candidates[0];

    // Convert degrees to radians for direct use with Three.js Euler
    const degToRad = Math.PI / 180;
    const rotation: [number, number, number] = [
      best.rotationX * degToRad,
      best.rotationY * degToRad,
      best.rotationZ * degToRad,
    ];

    return NextResponse.json({
      id,
      rotation,
      rotationDeg: [best.rotationX, best.rotationY, best.rotationZ],
      score: best.surfaceQualityScore,
      supportVolumeCm3: best.supportVolumeCm3,
    });
  } catch (err) {
    console.error("Auto-orient error:", err);
    return NextResponse.json(
      {
        error: "Auto-orient failed",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { parseModel, computeOrientations } from "@opensoftware/slicer-core";
import type { OrientationOptions } from "@opensoftware/slicer-core";
import { getModelById } from "../../../../../db/queries/models";
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
    const body = await request.json().catch(() => ({}));
    const technology = body.technology || "fdm";

    const buffer = await readFile(model.filePath);
    const format = model.fileFormat || "stl";
    const meshData = await parseModel(buffer, format);

    const options: OrientationOptions = {
      technology,
      cosmeticFaceIndices: body.cosmeticFaceIndices,
      overhangAngle: body.overhangAngle,
      maxCandidates: body.maxCandidates || 5,
    };

    const candidates = computeOrientations(meshData, options);

    return NextResponse.json({ id, technology, candidates });
  } catch (err) {
    console.error("Orientation error:", err);
    return NextResponse.json(
      { error: "Orientation computation failed", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

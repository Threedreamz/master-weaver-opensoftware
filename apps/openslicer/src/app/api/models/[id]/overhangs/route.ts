import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { parseModel, analyzeOverhangs } from "@opensoftware/slicer-core";
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
    const buffer = await readFile(model.filePath);
    const format = model.fileFormat || "stl";
    const meshData = await parseModel(buffer, format);

    const result = analyzeOverhangs(meshData.triangles);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Overhang analysis error:", err);
    return NextResponse.json(
      {
        error: "Overhang analysis failed",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

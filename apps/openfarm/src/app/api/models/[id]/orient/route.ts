import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { farmModels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { readFile } from "fs/promises";
import { parseSTL } from "@opensoftware/slicer-core";
import { saveOrientations } from "@/db/queries/orientations";

import { computeOrientations } from "@opensoftware/openfarm-core";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { technology = "fdm", cosmeticFaceIndices = [] } = body;

    const model = await db.query.farmModels.findFirst({
      where: eq(farmModels.id, id),
    });

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    if (model.fileFormat !== "stl") {
      return NextResponse.json(
        { error: "Orientation analysis only supported for STL files" },
        { status: 400 }
      );
    }

    let buffer: Buffer;
    try {
      buffer = await readFile(model.filePath);
    } catch {
      return NextResponse.json({ error: "Model file not found" }, { status: 404 });
    }

    const meshData = parseSTL(buffer);

    const candidates = computeOrientations(meshData, {
      technology,
      cosmeticFaceIndices,
      maxCandidates: 5,
    });

    const saved = await saveOrientations(
      id,
      technology,
      candidates.map((c) => ({
        rotationX: c.rotationX,
        rotationY: c.rotationY,
        rotationZ: c.rotationZ,
        supportVolumeCm3: c.supportVolumeCm3,
        printTimeEstimate: c.printTimeEstimate,
        surfaceQualityScore: c.surfaceQualityScore,
        cosmeticSurfaces: cosmeticFaceIndices.length > 0 ? cosmeticFaceIndices : undefined,
      }))
    );

    return NextResponse.json({
      model: { id, name: model.name },
      technology,
      orientations: saved,
    });
  } catch (error) {
    console.error("Failed to compute orientations:", error);
    return NextResponse.json({ error: "Orientation analysis failed" }, { status: 500 });
  }
}

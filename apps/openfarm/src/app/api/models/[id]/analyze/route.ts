import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { farmModels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { readFile } from "fs/promises";
import { parseSTL } from "@opensoftware/slicer-core";
import { saveFeasibilityCheck, updateModelMeshData } from "@/db/queries/feasibility";
import { notify } from "@/lib/notify";

// Import from openfarm-core (pure logic, no deps)
import { computeMeshMetrics, checkAllTechnologies } from "@opensoftware/openfarm-core";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const model = await db.query.farmModels.findFirst({
      where: eq(farmModels.id, id),
    });

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Read the file
    let buffer: Buffer;
    try {
      buffer = await readFile(model.filePath);
    } catch {
      return NextResponse.json(
        { error: "Model file not found on disk" },
        { status: 404 }
      );
    }

    // Only STL supported for analysis currently
    if (model.fileFormat !== "stl") {
      return NextResponse.json(
        { error: `Analysis not yet supported for ${model.fileFormat} files. Only STL is supported.` },
        { status: 400 }
      );
    }

    // Parse mesh
    const meshData = parseSTL(buffer);
    const metrics = computeMeshMetrics(meshData);

    // Update model with mesh data
    await updateModelMeshData(id, {
      meshAnalyzed: true,
      vertexCount: metrics.vertexCount,
      isManifold: metrics.isManifold,
      surfaceAreaCm2: metrics.surfaceAreaCm2,
      volumeCm3: metrics.volumeCm3,
      triangleCount: metrics.triangleCount,
      boundingBoxX: metrics.dimensions.x,
      boundingBoxY: metrics.dimensions.y,
      boundingBoxZ: metrics.dimensions.z,
    });

    // Run feasibility check for all technologies
    const results = checkAllTechnologies(metrics);

    // Save results
    const savedChecks = await Promise.all(
      results.map((result) =>
        saveFeasibilityCheck({
          modelId: id,
          technology: result.technology,
          overallScore: result.overallScore,
          verdict: result.verdict,
          issues: result.issues,
          metrics: result.metrics,
        })
      )
    );

    // Notify if any technology has issues
    const worstVerdict = results.reduce(
      (worst, r) => {
        const order = ["printable", "printable_with_issues", "needs_rework", "needs_redesign"];
        return order.indexOf(r.verdict) > order.indexOf(worst) ? r.verdict : worst;
      },
      "printable" as string
    );

    if (worstVerdict === "needs_rework" || worstVerdict === "needs_redesign") {
      notify({
        type: "feasibility_warning",
        title: `Feasibility issue: ${model.name}`,
        message: `${model.name} may need ${worstVerdict === "needs_redesign" ? "a redesign" : "rework"} for some technologies.`,
        metadata: {
          modelName: model.name,
          verdict: worstVerdict,
          results: results.map((r) => ({ technology: r.technology, score: r.overallScore, verdict: r.verdict })),
        },
      });
    }

    return NextResponse.json({
      model: { id, name: model.name },
      metrics,
      results: savedChecks,
    });
  } catch (error) {
    console.error("Failed to analyze model:", error);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}

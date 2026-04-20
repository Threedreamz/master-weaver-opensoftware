import { NextRequest, NextResponse } from "next/server";
import { getPackingJobById, updatePackingJobResult } from "@/db/queries/packing";
import { pack3D, estimateSLSPrintTime, estimateMaterialCost } from "@opensoftware/openfarm-core";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getPackingJobById(id);
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Build packing items from the job's items + model dimensions
    const packingItems = job.items.map((item) => ({
      id: item.id,
      width: item.model?.boundingBoxX ?? 50,
      depth: item.model?.boundingBoxY ?? 50,
      height: item.model?.boundingBoxZ ?? 50,
      quantity: item.quantity,
    }));

    const result = pack3D(
      packingItems,
      { x: job.buildVolumeX, y: job.buildVolumeY, z: job.buildVolumeZ },
      { gap: 3 }
    );

    // Calculate max height for time estimate
    const maxZ = result.packed.reduce(
      (max, p) => Math.max(max, p.position.z + p.dimensions.height),
      0
    );
    const estimatedTime = estimateSLSPrintTime(maxZ);
    const estimatedCost = estimateMaterialCost(result.totalPackedVolume);

    const densityWarning =
      result.utilizationPercent < 30
        ? `Packdichte ${result.utilizationPercent.toFixed(1)}% liegt unter dem Minimum von 30%. Mehr Teile hinzufügen oder Bauraum verkleinern.`
        : undefined;

    const updated = await updatePackingJobResult(id, {
      status: "packed",
      utilizationPercent: result.utilizationPercent,
      totalParts: packingItems.reduce((sum, i) => sum + i.quantity, 0),
      packedParts: result.packed.length,
      packingResult: result.packed.map((p) => ({
        modelId: p.id,
        position: p.position,
        rotation: p.rotation,
        dimensions: p.dimensions,
      })),
      estimatedPrintTime: estimatedTime,
      estimatedCost,
    });

    return NextResponse.json({
      job: updated,
      result: {
        packed: result.packed.length,
        unpacked: result.unpacked,
        utilization: result.utilizationPercent,
        layers: result.layerCount,
        estimatedTime,
        estimatedCost,
      },
      ...(densityWarning ? { warning: densityWarning } : {}),
    });
  } catch (error) {
    console.error("Packing failed:", error);
    return NextResponse.json({ error: "Packing failed" }, { status: 500 });
  }
}

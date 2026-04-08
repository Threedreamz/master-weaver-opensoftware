import { NextRequest, NextResponse } from "next/server";
import { createPackingJob, addPackingItem } from "@/db/queries/packing";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { printerId, name, buildVolumeX, buildVolumeY, buildVolumeZ, items } = body;

    if (!printerId || !name || !items?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create the packing job
    const packingJob = await createPackingJob({
      printerId,
      name,
      buildVolumeX: buildVolumeX ?? 0,
      buildVolumeY: buildVolumeY ?? 0,
      buildVolumeZ: buildVolumeZ ?? 0,
    });

    // Add items
    for (const item of items) {
      await addPackingItem({
        packingJobId: packingJob.id,
        modelId: item.modelId,
        quantity: item.quantity ?? 1,
      });
    }

    return NextResponse.json({ id: packingJob.id, status: "created" });
  } catch (err) {
    console.error("Failed to create packing job:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

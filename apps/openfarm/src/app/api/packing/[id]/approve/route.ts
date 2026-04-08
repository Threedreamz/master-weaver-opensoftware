import { NextRequest, NextResponse } from "next/server";
import { approvePackingJob } from "@/db/queries/packing";
import { notify } from "@/lib/notify";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await approvePackingJob(id);

    notify({
      type: "sls_pack_ready",
      title: `SLS pack approved: ${job.name}`,
      message: `${job.packedParts} parts packed at ${job.utilizationPercent?.toFixed(1)}% utilization. Print jobs created.`,
      printerId: job.printerId,
      metadata: { packingJobName: job.name, partCount: job.packedParts, utilization: job.utilizationPercent },
    });

    return NextResponse.json({ job });
  } catch (error) {
    console.error("Approve failed:", error);
    return NextResponse.json({ error: "Approve failed" }, { status: 500 });
  }
}

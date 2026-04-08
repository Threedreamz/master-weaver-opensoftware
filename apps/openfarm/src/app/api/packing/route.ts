import { NextRequest, NextResponse } from "next/server";
import { getPackingJobs, createPackingJob } from "@/db/queries/packing";

export async function GET() {
  try {
    const jobs = await getPackingJobs();
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Failed to get packing jobs:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { printerId, name, buildVolumeX, buildVolumeY, buildVolumeZ } = body;
    if (!printerId || !name || !buildVolumeX || !buildVolumeY || !buildVolumeZ) {
      return NextResponse.json({ error: "printerId, name, and build volume dimensions required" }, { status: 400 });
    }
    const job = await createPackingJob({ printerId, name, buildVolumeX, buildVolumeY, buildVolumeZ });
    return NextResponse.json({ job });
  } catch (error) {
    console.error("Failed to create packing job:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

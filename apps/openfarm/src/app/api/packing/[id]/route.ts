import { NextRequest, NextResponse } from "next/server";
import { getPackingJobById } from "@/db/queries/packing";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getPackingJobById(id);
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ job });
  } catch (error) {
    console.error("Failed to get packing job:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

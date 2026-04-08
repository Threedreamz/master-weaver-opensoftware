import { NextRequest, NextResponse } from "next/server";
import { getOrientations } from "@/db/queries/orientations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const technology = request.nextUrl.searchParams.get("technology") ?? undefined;
    const orientations = await getOrientations(id, technology);
    return NextResponse.json({ orientations });
  } catch (error) {
    console.error("Failed to get orientations:", error);
    return NextResponse.json({ error: "Failed to get orientations" }, { status: 500 });
  }
}

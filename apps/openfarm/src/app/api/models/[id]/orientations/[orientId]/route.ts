import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { farmOrientations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { selectOrientation } from "@/db/queries/orientations";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; orientId: string }> }
) {
  try {
    const { id, orientId } = await params;

    const orientation = await db.query.farmOrientations.findFirst({
      where: eq(farmOrientations.id, orientId),
    });

    if (!orientation || orientation.modelId !== id) {
      return NextResponse.json({ error: "Orientation not found" }, { status: 404 });
    }

    const selected = await selectOrientation(orientId, id, orientation.technology);
    return NextResponse.json({ orientation: selected });
  } catch (error) {
    console.error("Failed to select orientation:", error);
    return NextResponse.json({ error: "Failed to select orientation" }, { status: 500 });
  }
}

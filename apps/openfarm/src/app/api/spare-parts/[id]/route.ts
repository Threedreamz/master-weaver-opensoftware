import { NextRequest, NextResponse } from "next/server";
import { updateSparePartStock } from "@/db/queries/maintenance";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { quantity } = body;

    if (quantity === undefined) {
      return NextResponse.json({ error: "quantity is required" }, { status: 400 });
    }

    const part = await updateSparePartStock(id, quantity);
    return NextResponse.json({ part });
  } catch (error) {
    console.error("Failed to update part:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

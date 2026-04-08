import { NextRequest, NextResponse } from "next/server";
import { addPackingItem, removePackingItem } from "@/db/queries/packing";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { modelId, quantity } = body;
    if (!modelId) return NextResponse.json({ error: "modelId required" }, { status: 400 });
    const item = await addPackingItem({ packingJobId: id, modelId, quantity });
    return NextResponse.json({ item });
  } catch (error) {
    console.error("Failed to add item:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
) {
  try {
    const itemId = request.nextUrl.searchParams.get("itemId");
    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });
    await removePackingItem(itemId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove item:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

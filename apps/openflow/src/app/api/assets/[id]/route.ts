import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { getAssetById, deleteAsset, getAssetUsage } from "@/db/queries/collaboration";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;
    const asset = await getAssetById(id);
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    return NextResponse.json(asset);
  } catch (error) {
    console.error("[GET /api/assets/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;

    // Check usage before deletion
    const usage = await getAssetUsage(id);
    if (usage.length > 0) {
      return NextResponse.json({
        error: "Asset is in use",
        usageCount: usage.length,
        usage: usage.map((u) => ({ flowId: u.flowId, stepId: u.stepId, componentId: u.componentId })),
      }, { status: 409 });
    }

    await deleteAsset(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/assets/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

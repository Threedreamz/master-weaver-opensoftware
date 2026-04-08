import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { getAssetUsage } from "@/db/queries/collaboration";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;
    const usage = await getAssetUsage(id);
    return NextResponse.json({ assetId: id, usageCount: usage.length, usage });
  } catch (error) {
    console.error("[GET /api/assets/[id]/usage]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

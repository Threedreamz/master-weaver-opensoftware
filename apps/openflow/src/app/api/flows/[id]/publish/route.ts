import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { publishFlow } from "@/db/queries/flows";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;

    const result = await publishFlow(id, undefined);

    return NextResponse.json({
      version: result.version,
      publishedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Flow not found") {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }
    console.error("[POST /api/flows/[id]/publish]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

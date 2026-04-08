import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { getFlowComments, createComment } from "@/db/queries/collaboration";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;
    const comments = await getFlowComments(id);
    return NextResponse.json(comments);
  } catch (error) {
    console.error("[GET /api/flows/[id]/comments]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();

    if (!body.content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const comment = await createComment({
      flowId: id,
      stepId: body.stepId ?? undefined,
      componentId: body.componentId ?? undefined,
      authorId: body.authorId ?? undefined,
      authorName: body.authorName ?? "Unbekannt",
      authorAvatar: body.authorAvatar ?? undefined,
      content: body.content.trim(),
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("[POST /api/flows/[id]/comments]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

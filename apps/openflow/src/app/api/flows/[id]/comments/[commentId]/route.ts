import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { resolveComment, reopenComment, deleteComment } from "@/db/queries/collaboration";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { commentId } = await params;
    const body = await request.json();

    let comment;
    if (body.action === "resolve") {
      comment = await resolveComment(commentId, body.resolvedBy ?? "system");
    } else if (body.action === "reopen") {
      comment = await reopenComment(commentId);
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error("[PATCH /api/flows/[id]/comments/[commentId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { commentId } = await params;
    await deleteComment(commentId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/flows/[id]/comments/[commentId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

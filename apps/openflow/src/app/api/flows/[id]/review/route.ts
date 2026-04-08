import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";
import { submitForReview, approveFlow, rejectFlow, resetReviewStatus } from "@/db/queries/collaboration";

/**
 * POST /api/flows/[id]/review
 * Body: { action: "submit" | "approve" | "reject" | "reset", reviewedBy?: string, notes?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const { action, reviewedBy, notes } = body;

    let result;

    switch (action) {
      case "submit":
        result = await submitForReview(id);
        break;

      case "approve":
        if (!reviewedBy) {
          return NextResponse.json({ error: "reviewedBy is required for approve" }, { status: 400 });
        }
        result = await approveFlow(id, reviewedBy, notes);
        break;

      case "reject":
        if (!reviewedBy || !notes) {
          return NextResponse.json({ error: "reviewedBy and notes are required for reject" }, { status: 400 });
        }
        result = await rejectFlow(id, reviewedBy, notes);
        break;

      case "reset":
        result = await resetReviewStatus(id);
        break;

      default:
        return NextResponse.json({ error: "Unknown action. Use: submit, approve, reject, reset" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/flows/[id]/review]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

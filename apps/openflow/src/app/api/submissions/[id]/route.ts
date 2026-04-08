import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { checkApiAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { submissions } from "@/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;

    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, id),
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Parse answers JSON for the response
    const parsed = {
      ...submission,
      answers: (() => {
        try {
          return JSON.parse(submission.answers);
        } catch {
          return submission.answers;
        }
      })(),
      metadata: submission.metadata
        ? (() => {
            try {
              return JSON.parse(submission.metadata);
            } catch {
              return submission.metadata;
            }
          })()
        : null,
    };

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[GET /api/submissions/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

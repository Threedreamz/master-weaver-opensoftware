export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { requireSessionOrApiKey } from "@/lib/auth-helpers";
import { ImportOdynSequenceBody } from "@/lib/api-contracts";

/**
 * POST /api/odyn/import-sequence — M1 stub.
 * Validates the body, then returns a structured 422 `feature_deferred`
 * response so the hub can render a clean "feature not yet available"
 * message instead of a generic server error. Full ODYN joint-sequence
 * replay → kinematic-fwd run conversion lands in M2.
 */
export async function POST(req: NextRequest) {
  const auth = await requireSessionOrApiKey(req);
  if (auth instanceof NextResponse) return auth;

  const json = await req.json().catch(() => null);
  const parsed = ImportOdynSequenceBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      error: "feature_deferred",
      milestone: "M2",
      message:
        "odyn-import is scheduled for the M2 milestone. The endpoint accepts and validates payloads, but does not yet execute the import.",
      supported_alternatives: ["POST /api/solve/kinematic (manual joint targets)"],
    },
    {
      status: 422,
      headers: {
        "Cache-Control": "no-store",
        "X-Feature-Status": "deferred-m2",
      },
    },
  );
}

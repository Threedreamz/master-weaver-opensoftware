export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { requireSessionOrApiKey } from "@/lib/auth-helpers";
import { ImportOpenCamToolpathBody } from "@/lib/api-contracts";

/**
 * POST /api/opencam/import-toolpath — M1 stub.
 * Validates the body up-front (catches bad callers early), then returns a
 * structured 422 `feature_deferred` response so the hub can render a clean
 * "feature not yet available" message instead of a generic server error.
 * Real toolpath ingestion + cleaning-sim run creation lands in M2.
 */
export async function POST(req: NextRequest) {
  const auth = await requireSessionOrApiKey(req);
  if (auth instanceof NextResponse) return auth;

  const json = await req.json().catch(() => null);
  const parsed = ImportOpenCamToolpathBody.safeParse(json);
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
        "opencam-import is scheduled for the M2 milestone. The endpoint accepts and validates payloads, but does not yet execute the import.",
      supported_alternatives: ["POST /api/opencad/import (STL)"],
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

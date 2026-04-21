export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { requireSessionOrApiKey } from "@/lib/auth-helpers";
import { ImportOpenCamToolpathBody } from "@/lib/api-contracts";

/**
 * POST /api/opencam/import-toolpath — M1 stub.
 * Validates the body up-front (catches bad callers early) then returns 501.
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
    { error: "Not implemented in M1", details: { ticket: "M2" } },
    { status: 501 },
  );
}

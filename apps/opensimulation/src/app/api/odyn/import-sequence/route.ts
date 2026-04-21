export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { requireSessionOrApiKey } from "@/lib/auth-helpers";
import { ImportOdynSequenceBody } from "@/lib/api-contracts";

/**
 * POST /api/odyn/import-sequence — M1 stub.
 * Validates the body, then returns 501. Full ODYN joint-sequence replay →
 * kinematic-fwd run conversion lands in M2.
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
    { error: "Not implemented in M1", details: { ticket: "M2" } },
    { status: 501 },
  );
}

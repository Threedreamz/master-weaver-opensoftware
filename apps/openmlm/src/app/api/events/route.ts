import { NextResponse, type NextRequest } from "next/server";
import { checkApiKey } from "@/lib/auth-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/events
 *
 * Phase 1 stub. Service-to-service entry point for `value_events`.
 * The full implementation: validates payload (Zod), inserts row with
 * status=pending, emits `value_event.created`, optionally auto-confirms
 * if source has trusted webhook signature. Currently returns 501 so
 * callers see explicit "not yet implemented".
 */
export async function POST(req: NextRequest) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    {
      error: "not_implemented",
      phase: "Phase 1 — Loyalty",
      hint: "Spec: docs/openmlm-start.md §9 Phase 1",
    },
    { status: 501 },
  );
}

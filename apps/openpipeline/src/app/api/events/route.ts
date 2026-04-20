import { NextRequest, NextResponse } from "next/server";
import { CanonicalEvent } from "@opensoftware/openpipeline-client/events";
import { receiveCanonicalEvent } from "../../../lib/canonical-events";

/**
 * Canonical-event ingestion endpoint (Wave 3 C5).
 *
 * POST /api/events
 *   - Validates the body against the Zod canonical-event union.
 *   - Persists to pip_canonical_events.
 *   - Fans out to matching rows in pip_canonical_subscribers.
 *   - Returns the per-subscriber delivery outcomes in the response.
 *
 * Auth: X-API-Key with the bubble's shared OPENSOFTWARE_API_KEY. Events
 * carry identifying customer data so unauthenticated POSTs are rejected.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.OPENSOFTWARE_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "OPENSOFTWARE_API_KEY not configured on openpipeline" },
      { status: 503 },
    );
  }
  const supplied = request.headers.get("x-api-key");
  if (supplied !== expected) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CanonicalEvent.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Event failed schema validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await receiveCanonicalEvent(parsed.data);
    console.log(
      `[openpipeline] ${result.status} ${parsed.data.type} from ${parsed.data.source} ` +
      `(id=${result.eventId}, subs=${result.subscribers})`,
    );
    return NextResponse.json({ accepted: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[openpipeline] event persistence failed:", message);
    return NextResponse.json({ error: `Failed to accept event: ${message}` }, { status: 500 });
  }
}

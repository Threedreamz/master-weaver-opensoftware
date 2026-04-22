/**
 * opensimulation — auth helpers for route handlers.
 *
 * Mirrors opencad's `src/lib/api-auth.ts` shape but exposes the specific
 * helpers opensimulation routes need:
 *   - requireSession()           — NextAuth-only guard; returns { userId } or null
 *   - checkApiKey(req)           — X-API-Key constant-ish compare vs OPENSOFTWARE_API_KEY
 *   - requireSessionOrApiKey(req) — accepts either; used by /solve and /import routes
 *
 * Every helper returns either a resolved identity object OR a NextResponse
 * (401/403) the caller should return directly.
 */
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export type AuthedIdentity = {
  userId: string;
  via: "session" | "api-key";
};

/**
 * Resolve the current NextAuth session to a userId. Returns null when
 * unauthenticated — callers decide the error shape + status.
 */
export async function requireSession(): Promise<{ userId: string } | null> {
  const session = await auth();
  if (!session?.user) return null;
  const userId = (session.user as { id: string }).id;
  if (!userId) return null;
  return { userId };
}

/**
 * True when the request carries a valid X-API-Key matching OPENSOFTWARE_API_KEY.
 * Always false when the env var is unset (never accept absent keys).
 */
export function checkApiKey(req: NextRequest | Request): boolean {
  const expected = process.env.OPENSOFTWARE_API_KEY;
  if (!expected) return false;
  const provided = req.headers.get("x-api-key");
  return !!provided && provided === expected;
}

/**
 * Accept either a NextAuth session OR a valid X-API-Key. Used by the solve
 * and import routes per ROUTE_AUTH in api-contracts.ts. Service-level calls
 * (api-key) resolve to userId="service" so downstream persistence still has
 * something to write into opensimulationRuns.triggeredBy/userId columns.
 */
export async function requireSessionOrApiKey(
  req: NextRequest | Request,
): Promise<AuthedIdentity | NextResponse> {
  if (checkApiKey(req)) {
    const hubUserId = req.headers.get("x-hub-user-id");
    return { userId: hubUserId || "service", via: "api-key" };
  }
  const s = await requireSession();
  if (!s) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return { userId: s.userId, via: "session" };
}

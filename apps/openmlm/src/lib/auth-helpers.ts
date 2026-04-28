/**
 * openmlm — auth helpers for route handlers.
 *
 * Exposes:
 *   - requireSession()           — NextAuth-only guard
 *   - checkApiKey(req)           — X-API-Key vs OPENSOFTWARE_API_KEY
 *   - requireSessionOrApiKey(req) — accepts either
 */
import { NextResponse, type NextRequest } from "next/server";

export type AuthedIdentity = {
  userId: string;
  via: "session" | "api-key";
};

export async function requireSession(): Promise<{ userId: string } | null> {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user) return null;
  const userId = (session.user as { id: string }).id;
  if (!userId) return null;
  return { userId };
}

export function checkApiKey(req: NextRequest | Request): boolean {
  const expected = process.env.OPENSOFTWARE_API_KEY;
  if (!expected) return false;
  const provided = req.headers.get("x-api-key");
  return !!provided && provided === expected;
}

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

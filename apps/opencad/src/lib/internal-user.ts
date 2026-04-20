import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Hybrid auth helper for opencad API routes.
 *
 * opencad runs in two modes:
 *   1. Standalone — a browser talks directly to opencad with a NextAuth session
 *      cookie (3DreamzAuth OIDC). `await auth()` resolves the user.
 *   2. Hub-backend — the 3Dreamz hub proxies `/api/cad/*` requests to opencad
 *      over the internal Railway network. The hub has already verified the
 *      user's session, so it forwards identity via trusted headers alongside a
 *      shared secret (`X-API-Key` matches `OPENSOFTWARE_API_KEY`).
 *
 * Usage:
 *   const u = await resolveUser(req);
 *   if (u instanceof NextResponse) return u; // 401
 *   const userId = u.id;
 *
 * Project rows are scoped by `userId` which is a plain text column (no FK to
 * any users table) so the hub's user id can be any stable string — typically
 * the hub's session user id.
 */
export type InternalUser = {
  id: string;
  email: string | null;
  name: string | null;
};

export async function resolveUser(
  req: Request,
): Promise<InternalUser | NextResponse> {
  const expected = process.env.OPENSOFTWARE_API_KEY;
  const provided = req.headers.get("x-api-key");
  const hubUserId = req.headers.get("x-hub-user-id");

  if (expected && provided && provided === expected && hubUserId) {
    return {
      id: hubUserId,
      email: req.headers.get("x-hub-user-email"),
      name: req.headers.get("x-hub-user-name"),
    };
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const u = session.user as {
    id: string;
    email?: string | null;
    name?: string | null;
  };
  return { id: u.id, email: u.email ?? null, name: u.name ?? null };
}

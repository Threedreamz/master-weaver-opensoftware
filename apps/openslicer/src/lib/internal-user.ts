import { NextResponse } from "next/server";

/**
 * Hybrid auth helper for openslicer API routes.
 *
 * openslicer runs in two modes:
 *   1. Standalone — direct browser access with a NextAuth session. openslicer
 *      currently has no `auth()` factory wired (no users table, no provider
 *      config), so this mode is reserved for future use; callers without an
 *      x-api-key receive 401 today.
 *   2. Hub-backend — the 3Dreamz hub proxies `/api/slicer/*` over the internal
 *      Railway network. The hub has already verified the user's session and
 *      forwards identity via trusted headers + a shared secret
 *      (`X-API-Key` matches `OPENSOFTWARE_API_KEY`).
 *
 * Usage:
 *   const u = await resolveUser(req);
 *   if (u instanceof NextResponse) return u; // 401
 *   const userId = u.id;
 *
 * Models, projects, and history rows in openslicer are not yet user-scoped at
 * the schema level — `userId` is captured here for future use and audit
 * logging. The hub's user id is any stable string, typically the hub session
 * user id.
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

  // openslicer has no standalone auth provider yet — fall through to 401.
  // When openslicer grows its own NextAuth setup, replace this branch with
  // `await auth()` lookup mirroring opencad's resolveUser.
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

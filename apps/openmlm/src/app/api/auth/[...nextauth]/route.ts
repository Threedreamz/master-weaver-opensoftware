/**
 * NextAuth handler — uses lazy import to avoid Next 16 page-data collection
 * evaluating the NextAuth() construction at module-load time during build,
 * which fails with "AUTH_SECRET is not set" even when the env var is set.
 * See known-pitfalls 2026-04-28.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { handlers } = await import("@/lib/auth");
  return handlers.GET(req);
}

export async function POST(req: Request) {
  const { handlers } = await import("@/lib/auth");
  return handlers.POST(req);
}

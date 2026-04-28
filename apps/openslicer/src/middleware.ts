import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);
const secret = process.env.AUTH_SECRET;

/**
 * Public API path prefixes that do NOT require authentication. Everything
 * else under /api/* requires either a valid x-api-key matching
 * OPENSOFTWARE_API_KEY (hub-to-slicer trusted internal calls) or a valid
 * NextAuth JWT (standalone mode — currently unwired but reserved).
 *
 * /api/health         — Railway health probe
 * /api/appstore/manifest — opensoftware-gateway service-discovery manifest
 * /api/integration/*  — gateway/farm handshake endpoints, public by design
 * /api/auth/*         — NextAuth callback routes (when auth is wired)
 */
const PUBLIC_API_PREFIXES = [
  "/api/health",
  "/api/appstore/manifest",
  "/api/integration",
  "/api/auth",
];

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /api/* routes get a universal auth gate before reaching handlers. Public
  // prefixes pass through. Other API routes accept x-api-key OR NextAuth JWT;
  // anything else returns 401 JSON.
  if (pathname.startsWith("/api")) {
    if (isPublicApiPath(pathname)) {
      return NextResponse.next();
    }

    const apiKey = request.headers.get("x-api-key");
    const expectedKey = process.env.OPENSOFTWARE_API_KEY;
    if (expectedKey && apiKey && apiKey === expectedKey) {
      return NextResponse.next();
    }

    const token = await getToken({ req: request, secret });
    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Non-API routes: hand off to next-intl for locale routing.
  return intlMiddleware(request);
}

export const config = {
  // Match every route except Next.js internals and static assets. We need
  // `/api/*` in scope so this middleware can gate it; next-intl's routing
  // continues to handle the non-API portion of the tree.
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};

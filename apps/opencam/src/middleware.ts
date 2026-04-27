import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.AUTH_SECRET;

/**
 * Public path prefixes that do not require authentication.
 * Everything else requires a valid session.
 */
const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/api/auth",
  "/api/health",
  "/api/appstore/manifest",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/api/health" ||
    pathname === "/api/appstore/manifest" ||
    pathname === "/api/integration" ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // Other API routes: accept either a NextAuth session (standalone browser)
  // OR a shared-secret X-API-Key (hub-to-opencam server-to-server). Hub
  // additionally forwards X-Hub-User-Id; route handlers resolve the acting
  // user via `resolveUser()` (see lib/internal-user.ts).
  if (pathname.startsWith("/api")) {
    const apiKey = request.headers.get("x-api-key");
    const expectedKey = process.env.OPENSOFTWARE_API_KEY;
    if (expectedKey && apiKey && apiKey === expectedKey) {
      return NextResponse.next();
    }
    const token = await getToken({ req: request, secret });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/workbench") || pathname.startsWith("/admin")) {
    const token = await getToken({ req: request, secret });
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|_vercel|api/health|.*\\..*).*)"],
};

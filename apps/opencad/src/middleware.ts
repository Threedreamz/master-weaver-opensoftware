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

  // Let health check, appstore manifest and auth routes through without auth
  if (
    pathname === "/api/health" ||
    pathname === "/api/appstore/manifest" ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // Other API routes: check authentication via JWT (edge-compatible)
  if (pathname.startsWith("/api")) {
    const token = await getToken({ req: request, secret });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Public pages: no auth required
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Protected pages (including /admin/*): require authentication via JWT
  if (pathname.startsWith("/admin")) {
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

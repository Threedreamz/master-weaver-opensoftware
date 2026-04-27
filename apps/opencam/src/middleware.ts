import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.AUTH_SECRET;

/**
 * Public path prefixes that do not require authentication.
 * Everything else requires a valid session (or an X-API-Key on routes that accept one).
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

/**
 * Service-to-service routes that accept X-API-Key instead of a session.
 * The route handler still validates the key against OPENSOFTWARE_API_KEY;
 * middleware just passes through when the header is present so the handler
 * can do its own auth check.
 */
const API_KEY_ROUTE_PREFIXES = ["/api/opencad/import"];

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

  if (pathname.startsWith("/api")) {
    // Routes that accept an API key — let them through; handler validates.
    if (
      API_KEY_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/")) &&
      request.headers.get("x-api-key")
    ) {
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

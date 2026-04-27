import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.AUTH_SECRET;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow health check, auth routes, and login
  if (pathname === "/api/health") return NextResponse.next();
  if (pathname.startsWith("/api/auth")) return NextResponse.next();
  if (pathname === "/login") return NextResponse.next();

  // Check if auth is configured (FinderAuth env vars present)
  const authConfigured = !!process.env.FINDERAUTH_ISSUER;

  if (!authConfigured) {
    // Auth not configured — allow all requests, set default user ID
    const response = NextResponse.next();
    response.headers.set("x-user-id", "default-user");
    return response;
  }

  // API routes: require JWT
  if (pathname.startsWith("/api")) {
    const token = await getToken({ req: request, secret });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = NextResponse.next();
    response.headers.set("x-user-id", token.id as string);
    return response;
  }

  // Protected pages: require auth, redirect to login
  const token = await getToken({ req: request, secret });
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)" ],
};

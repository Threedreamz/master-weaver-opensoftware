import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { routing } from "@/i18n/routing";

const secret = process.env.AUTH_SECRET;

const intlMiddleware = createIntlMiddleware(routing);

const PUBLIC_PATH_PREFIXES = ["/login", "/api/auth"];

function isPublicPath(pathname: string): boolean {
  const withoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => withoutLocale === prefix || withoutLocale.startsWith(prefix + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let health check through without auth
  if (pathname === "/api/health") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth")) {
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

  if (isPublicPath(pathname)) {
    return intlMiddleware(request);
  }

  // Protected pages: require authentication via JWT (edge-compatible)
  const token = await getToken({ req: request, secret });
  if (!token) {
    const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);
    const locale = localeMatch?.[1] || routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)" ],
};

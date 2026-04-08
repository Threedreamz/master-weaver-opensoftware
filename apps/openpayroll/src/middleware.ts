import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Public path prefixes that do not require authentication.
 * Everything else requires a valid session.
 */
const PUBLIC_PATH_PREFIXES = ["/login", "/api/auth", "/api/external"];

function isPublicPath(pathname: string): boolean {
  // Strip locale prefix (e.g., /en/login -> /login)
  const withoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => withoutLocale === prefix || withoutLocale.startsWith(prefix + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public API routes: no auth, no intl
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/external")) {
    return NextResponse.next();
  }

  // Other API routes: check authentication (dynamic import to avoid edge runtime crash)
  if (pathname.startsWith("/api")) {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Public pages: no auth required
  if (isPublicPath(pathname)) {
    return intlMiddleware(request);
  }

  // Protected pages: require authentication
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user) {
    // Determine the locale for the redirect
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

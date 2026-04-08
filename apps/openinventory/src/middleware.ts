import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth";

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Public path prefixes that do not require authentication.
 * Everything else requires a valid session.
 */
const PUBLIC_PATH_PREFIXES = ["/login", "/api/auth"];

function isPublicPath(pathname: string): boolean {
  // Strip locale prefix (e.g., /en/login -> /login)
  const withoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => withoutLocale === prefix || withoutLocale.startsWith(prefix + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let API auth routes through without intl middleware
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Other API routes: check authentication
  if (pathname.startsWith("/api")) {
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
  const session = await auth();
  if (!session?.user) {
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

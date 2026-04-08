import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle API routes separately
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const response = intlMiddleware(request);

  // Set pathname header so server components can reliably detect the current path.
  // Next.js propagates response headers prefixed with "x-middleware-request-"
  // as request headers accessible via headers() in server components.
  response.headers.set("x-middleware-request-x-pathname", pathname);

  // For the bare root path "/", convert the locale redirect into an internal
  // rewrite so users don't pay a full round-trip for the redirect chain.
  if (pathname === "/") {
    const location = response.headers.get("location");
    if (location) {
      try {
        const target = new URL(location, request.url);
        // Only rewrite if the redirect target is a simple locale prefix
        // e.g. /de or /en — not deeper paths
        const localeMatch = target.pathname.match(/^\/(de|en)\/?$/);
        if (localeMatch) {
          const url = request.nextUrl.clone();
          url.pathname = target.pathname;
          return NextResponse.rewrite(url);
        }
      } catch {
        // Fall through to normal response
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};

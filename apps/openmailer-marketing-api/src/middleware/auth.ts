import { createMiddleware } from "hono/factory";
import * as jose from "jose";

// Cache JWKS for performance
let jwksCache: jose.JSONWebKeySet | null = null;
let jwksCacheTime = 0;
const JWKS_CACHE_TTL = 3600000; // 1 hour

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export const authMiddleware = createMiddleware<{
  Variables: { user: AuthUser };
}>(async (c, next) => {
  // Service-to-service auth: bypass JWKS for trusted internal services
  const serviceKey = c.req.header("X-Service-Key");
  if (serviceKey) {
    const expectedKey = process.env.OPENMAILER_SERVICE_KEY;
    if (expectedKey && serviceKey === expectedKey) {
      c.set("user", {
        id: "service:affiliate-manager",
        email: "service@affiliate-manager",
        role: "service",
      });
      await next();
      return;
    }
    return c.json({ error: "Invalid service key" }, 401);
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const issuer =
      process.env.FINDERAUTH_ISSUER || "https://finderauth-oidc-dev.up.railway.app";
    const jwksUri = process.env.FINDERAUTH_JWKS_URI || `${issuer}/oidc/jwks`;

    // Fetch/cache JWKS
    const now = Date.now();
    if (!jwksCache || now - jwksCacheTime > JWKS_CACHE_TTL) {
      const response = await fetch(jwksUri);
      if (!response.ok) {
        throw new Error(`JWKS fetch failed: ${response.status} ${response.statusText}`);
      }
      jwksCache = (await response.json()) as jose.JSONWebKeySet;
      jwksCacheTime = now;
    }

    const JWKS = jose.createLocalJWKSet(jwksCache!);
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer,
    });

    c.set("user", {
      id: payload.sub || "",
      email: (payload as Record<string, unknown>).email as string || "",
      name: (payload as Record<string, unknown>).name as string | undefined,
      role: (payload as Record<string, unknown>).role as string | undefined,
    });

    await next();
  } catch (error) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});

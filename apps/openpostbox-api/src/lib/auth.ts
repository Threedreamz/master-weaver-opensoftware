import { NextResponse, type NextRequest } from "next/server";

/**
 * Minimal bubble-scoped API-key auth. The opensoftware-gateway attaches
 * `X-API-Key` (shared per-bubble) plus `X-Tenant-Id` (derived from the
 * user's OIDC claim). We trust the gateway to enforce the
 * `requiresEntitlement` check — this service only verifies the shared
 * key is present and a tenant id is attached, so downstream handlers
 * can scope queries by tenant without re-parsing OIDC tokens.
 */
export function requireApiKey(req: NextRequest): {
  ok: true;
  tenantId: string;
} | { ok: false; res: NextResponse } {
  const expected = process.env.OPENSOFTWARE_API_KEY;
  if (!expected) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "OPENSOFTWARE_API_KEY not configured on openpostbox-api" },
        { status: 500 },
      ),
    };
  }
  const presented = req.headers.get("x-api-key");
  if (presented !== expected) {
    return {
      ok: false,
      res: NextResponse.json({ error: "invalid api key" }, { status: 401 }),
    };
  }
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return {
      ok: false,
      res: NextResponse.json({ error: "missing X-Tenant-Id" }, { status: 400 }),
    };
  }
  return { ok: true, tenantId };
}

/**
 * Entitlement enforcement for paywalled opensoftware services.
 *
 * Context: Each installable service declares a `requiresEntitlement` key
 * (e.g. "openpostbox.business") in its /api/appstore/manifest and its
 * catalog block in GMW registry.json. The hub gates the UI based on
 * that key — this middleware is the server-side defence that prevents
 * a direct API call from bypassing the paywall.
 *
 * Protocol:
 *   - Hub attaches `X-User-Plan: <tier>` and (optionally)
 *     `X-Plan-Scan-Pages: <n>` to every proxied request.
 *   - Gateway resolves the service's `requiresEntitlement` (static map
 *     below, kept in sync with registry.json) and checks whether the
 *     caller's tier is in the grant list.
 *   - Missing header ⇒ caller is treated as `free`.
 *   - Unknown service slug ⇒ allowed (service is free by default).
 *
 * Returns `null` on allow, or a 402 Response on deny. The 402 body
 * includes the entitlement key so the hub can render a targeted upsell
 * CTA instead of a generic error.
 */

/**
 * Entitlement keys enforced by the gateway, keyed by the `service` slug
 * used in /api/v1/<service>/*. Keep in sync with GMW registry.json →
 * `catalog.requiresEntitlement`. Services not listed here are free
 * (no paywall).
 */
export const SERVICE_ENTITLEMENTS: Record<string, string> = {
  postbox: "openpostbox.business",
};

/**
 * Tier-to-entitlement-grant map. Mirrors `plans.ts` → `PLANS[tier].limits.opensoftware`
 * on the hub side. Keep both in sync — the hub check is UX-only, this one
 * is load-bearing.
 */
const TIER_GRANTS: Record<string, ReadonlySet<string>> = {
  free: new Set(),
  hobby: new Set(),
  lifetime_hobby: new Set(),
  pro: new Set(["openpostbox.business"]),
  lifetime_pro: new Set(["openpostbox.business"]),
  enterprise: new Set(["openpostbox.business"]),
};

export interface EntitlementDecision {
  ok: true;
  tier: string;
}

export interface EntitlementDenied {
  ok: false;
  status: 402;
  body: {
    error: "entitlement required";
    requiredEntitlement: string;
    currentTier: string;
    upgradePath: string;
  };
}

export function checkEntitlement(
  service: string,
  request: Request,
): EntitlementDecision | EntitlementDenied {
  const required = SERVICE_ENTITLEMENTS[service];
  if (!required) return { ok: true, tier: request.headers.get("x-user-plan") ?? "free" };

  const tier = (request.headers.get("x-user-plan") ?? "free").toLowerCase();
  const grants = TIER_GRANTS[tier] ?? TIER_GRANTS.free!;

  if (grants.has(required)) return { ok: true, tier };

  return {
    ok: false,
    status: 402,
    body: {
      error: "entitlement required",
      requiredEntitlement: required,
      currentTier: tier,
      upgradePath: `/pricing?feature=${encodeURIComponent(required.split(".")[0] ?? "")}`,
    },
  };
}

export function entitlementDeniedResponse(decision: EntitlementDenied): Response {
  return new Response(JSON.stringify(decision.body), {
    status: decision.status,
    headers: {
      "Content-Type": "application/json",
      "X-Entitlement-Required": decision.body.requiredEntitlement,
    },
  });
}

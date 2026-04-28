/**
 * Quota configuration for opengen-gateway.
 *
 * Two-layer cap design (defense in depth):
 *   Layer 1: per-user-class caps  — protects against runaway individual users.
 *   Layer 2: global per-provider caps — hard ceiling on commercial spend even
 *            if classification or auth is somehow bypassed.
 *
 * All values are overridable via env vars at runtime. Code defaults are sized
 * so worst-case daily commercial spend across all 3 paid providers is capped
 * at ~$45/day (100×$0.20 + 100×$0.30 + 50×$0.50). Tune via Railway dashboard.
 *
 * Periods are simple wall-clock buckets in UTC:
 *   day   → "YYYY-MM-DD"
 *   month → "YYYY-MM"
 * Bucket boundaries are not user-timezone aware. This is fine for cost caps —
 * the goal is "burn rate per real day" not "fairness across timezones".
 */

export type Period = "day" | "month";

export type UserClass = "anonymous" | "free" | "hobby" | "pro" | "enterprise";

export type ProviderId =
  | "meshy"
  | "tripo"
  | "rodin"
  | "triposr"
  | "trellis"
  | "hunyuan3d";

export interface ClassQuota {
  perDay: number;
  perMonth: number;
}

export interface ProviderCap {
  perDay: number;
  perMonth: number;
  /** Approx cents per generation — used for cost reporting, not for caps. */
  costCents: number;
}

const DEFAULT_USER_CLASS_QUOTAS: Record<UserClass, ClassQuota> = {
  anonymous: { perDay: 0, perMonth: 0 },
  free: { perDay: 2, perMonth: 10 },
  hobby: { perDay: 10, perMonth: 100 },
  pro: { perDay: 50, perMonth: 500 },
  enterprise: { perDay: 200, perMonth: 5000 },
};

const DEFAULT_PROVIDER_CAPS: Record<ProviderId, ProviderCap> = {
  meshy: { perDay: 100, perMonth: 2000, costCents: 20 },
  tripo: { perDay: 100, perMonth: 2000, costCents: 30 },
  rodin: { perDay: 50, perMonth: 1000, costCents: 50 },
  triposr: { perDay: 1000, perMonth: 30000, costCents: 0 },
  trellis: { perDay: 1000, perMonth: 30000, costCents: 0 },
  hunyuan3d: { perDay: 1000, perMonth: 30000, costCents: 0 },
};

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export function getClassQuota(cls: UserClass): ClassQuota {
  const def = DEFAULT_USER_CLASS_QUOTAS[cls];
  const upper = cls.toUpperCase();
  return {
    perDay: envInt(`OPENGEN_QUOTA_CLASS_${upper}_PERDAY`, def.perDay),
    perMonth: envInt(`OPENGEN_QUOTA_CLASS_${upper}_PERMONTH`, def.perMonth),
  };
}

export function getProviderCap(provider: ProviderId): ProviderCap {
  const def = DEFAULT_PROVIDER_CAPS[provider];
  const upper = provider.toUpperCase();
  return {
    perDay: envInt(`OPENGEN_QUOTA_PROVIDER_${upper}_PERDAY`, def.perDay),
    perMonth: envInt(`OPENGEN_QUOTA_PROVIDER_${upper}_PERMONTH`, def.perMonth),
    costCents: envInt(`OPENGEN_QUOTA_PROVIDER_${upper}_COSTCENTS`, def.costCents),
  };
}

export const USER_CLASSES: readonly UserClass[] = [
  "anonymous",
  "free",
  "hobby",
  "pro",
  "enterprise",
];

export function isUserClass(s: string): s is UserClass {
  return (USER_CLASSES as readonly string[]).includes(s);
}

/**
 * Email allowlist override — promotes specific users to a higher tier before
 * the quota check runs. Configured via env vars (CSV, lowercase-compared):
 *   OPENGEN_PRO_USERS         → emails on this list get "pro"
 *   OPENGEN_ENTERPRISE_USERS  → emails on this list get "enterprise" (wins over pro)
 *
 * Returns the original `base` userClass when no override matches. Empty/unset
 * env vars are no-ops, so this is safe to leave unconfigured.
 */
export function resolvePromotedClass(
  email: string | null | undefined,
  base: UserClass,
): UserClass {
  if (!email) return base;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return base;
  const parse = (csv: string | undefined): string[] =>
    (csv ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  if (parse(process.env.OPENGEN_ENTERPRISE_USERS).includes(normalized)) {
    return "enterprise";
  }
  if (parse(process.env.OPENGEN_PRO_USERS).includes(normalized)) {
    return "pro";
  }
  return base;
}

export function periodKey(period: Period, when: Date = new Date()): string {
  const yyyy = when.getUTCFullYear();
  const mm = String(when.getUTCMonth() + 1).padStart(2, "0");
  if (period === "month") return `${yyyy}-${mm}`;
  const dd = String(when.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * UTC milliseconds when the given period bucket rolls over.
 * Used for the `Retry-After` / `resetAt` field on 429 responses.
 */
export function periodResetMs(period: Period, when: Date = new Date()): number {
  const next = new Date(when);
  next.setUTCHours(0, 0, 0, 0);
  if (period === "month") {
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
  } else {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime();
}

/**
 * Quota configuration for opengen-image-gateway.
 *
 * Two-layer cap design (defense in depth):
 *   Layer 1: per-user-class caps  — protects against runaway individual users.
 *   Layer 2: global per-provider caps — hard ceiling on commercial spend even
 *            if classification or auth is somehow bypassed.
 *
 * All values are overridable via env vars at runtime. Code defaults are sized
 * so worst-case daily commercial spend across both providers is capped at
 * ~$15/day (1000×$0.005 + 1000×$0.01). Tune via Railway dashboard.
 *
 * Image generation is much cheaper than 3D — limits are correspondingly higher.
 *
 * Periods are simple wall-clock UTC buckets:
 *   day   → "YYYY-MM-DD"
 *   month → "YYYY-MM"
 */

export type Period = "day" | "month";

export type UserClass = "anonymous" | "free" | "hobby" | "pro" | "enterprise";

export type ProviderId = "fal" | "replicate";

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
  free: { perDay: 5, perMonth: 30 },
  hobby: { perDay: 30, perMonth: 300 },
  pro: { perDay: 200, perMonth: 2000 },
  enterprise: { perDay: 1000, perMonth: 20000 },
};

const DEFAULT_PROVIDER_CAPS: Record<ProviderId, ProviderCap> = {
  fal: { perDay: 1000, perMonth: 30000, costCents: 1 },
  replicate: { perDay: 1000, perMonth: 30000, costCents: 1 },
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
    perDay: envInt(`OPENGEN_IMAGE_QUOTA_CLASS_${upper}_PERDAY`, def.perDay),
    perMonth: envInt(`OPENGEN_IMAGE_QUOTA_CLASS_${upper}_PERMONTH`, def.perMonth),
  };
}

export function getProviderCap(provider: ProviderId): ProviderCap {
  const def = DEFAULT_PROVIDER_CAPS[provider];
  const upper = provider.toUpperCase();
  return {
    perDay: envInt(`OPENGEN_IMAGE_QUOTA_PROVIDER_${upper}_PERDAY`, def.perDay),
    perMonth: envInt(`OPENGEN_IMAGE_QUOTA_PROVIDER_${upper}_PERMONTH`, def.perMonth),
    costCents: envInt(`OPENGEN_IMAGE_QUOTA_PROVIDER_${upper}_COSTCENTS`, def.costCents),
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
 * Same env vars as opengen-gateway — the allowlist is an account-level concept,
 * not per-gateway. Returns the original `base` userClass when no override matches.
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

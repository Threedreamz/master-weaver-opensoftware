import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { quotaUsage } from "@/db/schema";
import {
  getClassQuota,
  getProviderCap,
  periodKey,
  periodResetMs,
  type Period,
  type ProviderId,
  type UserClass,
} from "./quotas";

export interface QuotaDenial {
  ok: false;
  scope: "user" | "provider";
  period: Period;
  limit: number;
  used: number;
  resetAt: number;
  reason: string;
}

export interface QuotaApproval {
  ok: true;
}

export type QuotaResult = QuotaApproval | QuotaDenial;

async function readCount(
  scope: "user" | "provider",
  userId: string,
  provider: ProviderId,
  period: Period,
  pkey: string,
): Promise<number> {
  const rows = await db
    .select({ count: quotaUsage.count })
    .from(quotaUsage)
    .where(
      and(
        eq(quotaUsage.scope, scope),
        eq(quotaUsage.userId, userId),
        eq(quotaUsage.provider, provider),
        eq(quotaUsage.period, period),
        eq(quotaUsage.periodKey, pkey),
      ),
    )
    .limit(1);
  return rows[0]?.count ?? 0;
}

/**
 * Check both layers without mutating. Returns the FIRST cap that blocks the
 * request, or `{ ok: true }` if everything is under-cap.
 *
 * Order checked (most-specific-first so user-class messaging wins when both
 * limits would be tripped):
 *   1. user / day
 *   2. user / month
 *   3. provider / day
 *   4. provider / month
 */
export async function checkQuota(
  userId: string,
  userClass: UserClass,
  provider: ProviderId,
  now: Date = new Date(),
): Promise<QuotaResult> {
  const cls = getClassQuota(userClass);
  const cap = getProviderCap(provider);
  const dayKey = periodKey("day", now);
  const monthKey = periodKey("month", now);

  // anonymous (perDay=0) is the cheap-out path.
  if (cls.perDay === 0) {
    return {
      ok: false,
      scope: "user",
      period: "day",
      limit: 0,
      used: 0,
      resetAt: periodResetMs("day", now),
      reason: `userClass "${userClass}" is not permitted to generate`,
    };
  }

  const userDay = await readCount("user", userId, provider, "day", dayKey);
  if (userDay >= cls.perDay) {
    return {
      ok: false,
      scope: "user",
      period: "day",
      limit: cls.perDay,
      used: userDay,
      resetAt: periodResetMs("day", now),
      reason: `daily generation limit for userClass "${userClass}" reached on provider "${provider}"`,
    };
  }

  const userMonth = await readCount("user", userId, provider, "month", monthKey);
  if (userMonth >= cls.perMonth) {
    return {
      ok: false,
      scope: "user",
      period: "month",
      limit: cls.perMonth,
      used: userMonth,
      resetAt: periodResetMs("month", now),
      reason: `monthly generation limit for userClass "${userClass}" reached on provider "${provider}"`,
    };
  }

  const provDay = await readCount("provider", "*", provider, "day", dayKey);
  if (provDay >= cap.perDay) {
    return {
      ok: false,
      scope: "provider",
      period: "day",
      limit: cap.perDay,
      used: provDay,
      resetAt: periodResetMs("day", now),
      reason: `provider "${provider}" daily killswitch reached — try again tomorrow or another provider`,
    };
  }

  const provMonth = await readCount("provider", "*", provider, "month", monthKey);
  if (provMonth >= cap.perMonth) {
    return {
      ok: false,
      scope: "provider",
      period: "month",
      limit: cap.perMonth,
      used: provMonth,
      resetAt: periodResetMs("month", now),
      reason: `provider "${provider}" monthly killswitch reached — try another provider`,
    };
  }

  return { ok: true };
}

/**
 * Increment all 4 counters (user/day, user/month, provider/day, provider/month).
 *
 * Uses ON CONFLICT DO UPDATE so concurrent requests are safe — SQLite serialises
 * the UPSERT and the unique index on (scope,userId,provider,period,period_key)
 * is the conflict target. cost_cents is summed across rows to keep an audit trail.
 */
export async function incrementQuota(
  userId: string,
  userClass: UserClass,
  provider: ProviderId,
  now: Date = new Date(),
): Promise<void> {
  const cap = getProviderCap(provider);
  const dayKey = periodKey("day", now);
  const monthKey = periodKey("month", now);

  const rows: Array<{
    scope: "user" | "provider";
    userId: string;
    period: Period;
    periodKey: string;
  }> = [
    { scope: "user", userId, period: "day", periodKey: dayKey },
    { scope: "user", userId, period: "month", periodKey: monthKey },
    { scope: "provider", userId: "*", period: "day", periodKey: dayKey },
    { scope: "provider", userId: "*", period: "month", periodKey: monthKey },
  ];

  for (const r of rows) {
    await db
      .insert(quotaUsage)
      .values({
        id: randomUUID(),
        scope: r.scope,
        userId: r.userId,
        userClass: r.scope === "user" ? userClass : "",
        provider,
        period: r.period,
        periodKey: r.periodKey,
        count: 1,
        costCents: cap.costCents,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          quotaUsage.scope,
          quotaUsage.userId,
          quotaUsage.provider,
          quotaUsage.period,
          quotaUsage.periodKey,
        ],
        set: {
          count: sqlIncrement("count"),
          costCents: sqlIncrement("cost_cents", cap.costCents),
          updatedAt: now,
        },
      });
  }
}

function sqlIncrement(col: string, by = 1) {
  return sql.raw(`${col} + ${Number.isFinite(by) ? by : 0}`);
}

/**
 * Read all four counters for a user+provider — used by GET /api/quota.
 */
export async function readQuotaSnapshot(
  userId: string,
  userClass: UserClass,
  provider: ProviderId,
  now: Date = new Date(),
) {
  const cls = getClassQuota(userClass);
  const cap = getProviderCap(provider);
  const dayKey = periodKey("day", now);
  const monthKey = periodKey("month", now);

  const [userDay, userMonth, provDay, provMonth] = await Promise.all([
    readCount("user", userId, provider, "day", dayKey),
    readCount("user", userId, provider, "month", monthKey),
    readCount("provider", "*", provider, "day", dayKey),
    readCount("provider", "*", provider, "month", monthKey),
  ]);

  return {
    user: {
      day: { used: userDay, limit: cls.perDay, resetAt: periodResetMs("day", now) },
      month: {
        used: userMonth,
        limit: cls.perMonth,
        resetAt: periodResetMs("month", now),
      },
    },
    provider: {
      day: { used: provDay, limit: cap.perDay, resetAt: periodResetMs("day", now) },
      month: {
        used: provMonth,
        limit: cap.perMonth,
        resetAt: periodResetMs("month", now),
      },
      costCentsPerCall: cap.costCents,
    },
  };
}

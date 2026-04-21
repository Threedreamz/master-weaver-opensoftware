import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { scannedMail } from "@/db/schema";

/**
 * Monthly scan-page quota enforcement.
 *
 * The gateway reads the user's plan from OIDC and passes the effective
 * monthly cap in the `X-Plan-Scan-Pages` header. We sum `page_count` for
 * the tenant for the current UTC month and reject ingests that would
 * exceed the cap. Missing header => no cap (internal / unpaywalled
 * callers).
 */

export interface QuotaHeader {
  /** Numeric cap from X-Plan-Scan-Pages, or null for unlimited. */
  pagesPerMonth: number | null;
}

export function parseQuotaHeader(headers: Headers): QuotaHeader {
  const raw = headers.get("x-plan-scan-pages");
  if (!raw) return { pagesPerMonth: null };
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return { pagesPerMonth: null };
  return { pagesPerMonth: n };
}

export async function pagesUsedThisMonth(tenantId: string): Promise<number> {
  const db = getDb();
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const [row] = await db
    .select({ n: sql<number>`coalesce(sum(${scannedMail.pageCount}), 0)` })
    .from(scannedMail)
    .where(and(eq(scannedMail.tenantId, tenantId), gte(scannedMail.receivedAt, monthStart)));
  return row?.n ?? 0;
}

export interface QuotaDecision {
  allowed: boolean;
  used: number;
  cap: number | null;
  remaining: number | null;
}

export async function checkQuota(
  tenantId: string,
  addPages: number,
  header: QuotaHeader,
): Promise<QuotaDecision> {
  if (header.pagesPerMonth === null) {
    return { allowed: true, used: 0, cap: null, remaining: null };
  }
  const used = await pagesUsedThisMonth(tenantId);
  const remaining = Math.max(0, header.pagesPerMonth - used);
  return {
    allowed: used + addPages <= header.pagesPerMonth,
    used,
    cap: header.pagesPerMonth,
    remaining,
  };
}

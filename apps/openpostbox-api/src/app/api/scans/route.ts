import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb } from "@/db/client";
import { scannedMail, mailEvent, type NewScannedMail } from "@/db/schema";
import { computeRowHash } from "@/lib/hash-chain";
import { requireApiKey } from "@/lib/auth";
import { parseQuotaHeader, checkQuota } from "@/lib/quota";
import { enqueueOcr } from "@/lib/queue";

/**
 * GET /api/scans — list scanned mail for the tenant.
 *   ?unread=1   — only unread
 *   ?limit=N    — limit (default 50, max 200)
 *   ?count=1    — return { count } only
 *
 * POST /api/scans — ingest a new scan from ScanSnap or similar.
 *   body: { blobUrl, pageCount, senderName?, senderAddress?, subject? }
 *   Appends a row to the hash chain + emits a "received" mail_event. The
 *   OCR + classification stages happen async in openpostbox-worker.
 */

export async function GET(req: NextRequest) {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;
  const { tenantId } = auth;

  const url = new URL(req.url);
  const unread = url.searchParams.get("unread") === "1";
  const wantsCount = url.searchParams.get("count") === "1";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);

  const db = getDb();

  if (wantsCount) {
    const [row] = await db
      .select({ n: sql<number>`count(*)` })
      .from(scannedMail)
      .where(
        unread
          ? and(eq(scannedMail.tenantId, tenantId), eq(scannedMail.unread, true))
          : eq(scannedMail.tenantId, tenantId),
      );
    return NextResponse.json({ count: row?.n ?? 0 });
  }

  const rows = await db
    .select()
    .from(scannedMail)
    .where(
      unread
        ? and(eq(scannedMail.tenantId, tenantId), eq(scannedMail.unread, true))
        : eq(scannedMail.tenantId, tenantId),
    )
    .orderBy(desc(scannedMail.receivedAt))
    .limit(limit);

  return NextResponse.json({ items: rows });
}

interface IngestBody {
  blobUrl: string;
  pageCount: number;
  senderName?: string;
  senderAddress?: string;
  subject?: string;
}

export async function POST(req: NextRequest) {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;
  const { tenantId } = auth;

  let body: IngestBody;
  try {
    body = (await req.json()) as IngestBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.blobUrl || typeof body.pageCount !== "number") {
    return NextResponse.json(
      { error: "blobUrl (string) and pageCount (number) required" },
      { status: 400 },
    );
  }

  const quotaHeader = parseQuotaHeader(req.headers);
  const quota = await checkQuota(tenantId, body.pageCount, quotaHeader);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "monthly scan-page quota exceeded",
        used: quota.used,
        cap: quota.cap,
        remaining: quota.remaining,
        pageCount: body.pageCount,
      },
      { status: 402 },
    );
  }

  const db = getDb();
  const receivedAt = Date.now();

  const [prev] = await db
    .select({ thisHash: scannedMail.thisHash })
    .from(scannedMail)
    .where(eq(scannedMail.tenantId, tenantId))
    .orderBy(desc(scannedMail.receivedAt))
    .limit(1);

  const prevHash = prev?.thisHash ?? null;
  const thisHash = computeRowHash({
    prevHash,
    tenantId,
    receivedAt,
    blobUrl: body.blobUrl,
    pageCount: body.pageCount,
  });

  const id = randomUUID();
  const row: NewScannedMail = {
    id,
    tenantId,
    receivedAt: new Date(receivedAt),
    senderName: body.senderName ?? null,
    senderAddress: body.senderAddress ?? null,
    subject: body.subject ?? null,
    pageCount: body.pageCount,
    blobUrl: body.blobUrl,
    prevHash,
    thisHash,
  };

  await db.insert(scannedMail).values(row);
  await db.insert(mailEvent).values({
    id: randomUUID(),
    tenantId,
    mailId: id,
    type: "received",
    payload: { pageCount: body.pageCount, prevHash, thisHash },
  });

  await enqueueOcr({ tenantId, mailId: id, blobUrl: body.blobUrl });

  return NextResponse.json({ id, thisHash }, { status: 201 });
}

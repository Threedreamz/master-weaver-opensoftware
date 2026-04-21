import { NextResponse, type NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb } from "@/db/client";
import { scannedMail, mailEvent, type NewScannedMail } from "@/db/schema";
import { computeRowHash } from "@/lib/hash-chain";
import { requireApiKey } from "@/lib/auth";
import { writePdf } from "@/lib/blob-store";
import { estimatePdfPageCount } from "@/lib/pdf-meta";
import { parseQuotaHeader, checkQuota } from "@/lib/quota";
import { enqueueOcr } from "@/lib/queue";

/**
 * POST /api/scans/upload — multipart PDF ingest.
 *
 * This is the endpoint ScanSnap iX1600 (or any source) posts scanned
 * mail to. Expected as `multipart/form-data`:
 *   - `pdf`        : File  (required)
 *   - `subject`    : string? optional
 *   - `senderName` : string? optional
 *   - `senderAddress` : string? optional
 *
 * Flow:
 *   1. Validate X-API-Key + X-Tenant-Id
 *   2. Check monthly quota (X-Plan-Scan-Pages)
 *   3. Store blob on disk (content-addressed; dedupes by sha256)
 *   4. Insert scanned_mail row with hash-chain link
 *   5. Emit `received` mail_event
 *   6. Enqueue OCR job (worker picks it up and PATCHes /api/scans/:id)
 *   7. Return { id, thisHash, blobUrl, pageCount }
 *
 * Over-quota calls return 402 Payment Required with the usage snapshot —
 * the hub renders that as an upgrade CTA instead of a generic error.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;
  const { tenantId } = auth;

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "content-type must be multipart/form-data" },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid multipart body" }, { status: 400 });
  }

  const file = form.get("pdf");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "field 'pdf' (file) required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: "uploaded pdf is empty" }, { status: 400 });
  }

  const pageCount = estimatePdfPageCount(buffer);

  // Quota check BEFORE persistence — avoid writing a blob we must delete.
  const quotaHeader = parseQuotaHeader(req.headers);
  const quota = await checkQuota(tenantId, pageCount, quotaHeader);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "monthly scan-page quota exceeded",
        used: quota.used,
        cap: quota.cap,
        remaining: quota.remaining,
        pageCount,
      },
      { status: 402 },
    );
  }

  const blob = await writePdf(tenantId, buffer);

  const receivedAt = Date.now();
  const db = getDb();

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
    blobUrl: blob.blobUrl,
    pageCount,
  });

  const id = randomUUID();
  const row: NewScannedMail = {
    id,
    tenantId,
    receivedAt: new Date(receivedAt),
    senderName: asString(form.get("senderName")),
    senderAddress: asString(form.get("senderAddress")),
    subject: asString(form.get("subject")),
    pageCount,
    blobUrl: blob.blobUrl,
    prevHash,
    thisHash,
  };

  await db.insert(scannedMail).values(row);
  await db.insert(mailEvent).values({
    id: randomUUID(),
    tenantId,
    mailId: id,
    type: "received",
    payload: {
      pageCount,
      prevHash,
      thisHash,
      sizeBytes: blob.sizeBytes,
      sha256: blob.sha256,
      source: req.headers.get("x-source") ?? "unknown",
    },
  });

  await enqueueOcr({ tenantId, mailId: id, blobUrl: blob.blobUrl });

  return NextResponse.json(
    {
      id,
      thisHash,
      blobUrl: blob.blobUrl,
      pageCount,
      sizeBytes: blob.sizeBytes,
      sha256: blob.sha256,
      quotaUsed: quota.used + pageCount,
      quotaCap: quota.cap,
    },
    { status: 201 },
  );
}

function asString(v: FormDataEntryValue | null): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

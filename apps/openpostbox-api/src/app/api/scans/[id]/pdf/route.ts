import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { promises as fs } from "fs";
import { getDb } from "@/db/client";
import { scannedMail } from "@/db/schema";
import { requireApiKey } from "@/lib/auth";
import { resolveBlobPath } from "@/lib/blob-store";

/**
 * GET /api/scans/:id/pdf — serve the stored PDF.
 *
 * Scoped by tenant — the api never returns a blob for a foreign tenant
 * even if the blob id is guessed. The hub embeds this URL in <iframe>
 * and <object> elements so users can preview mail inline.
 */

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;
  const { tenantId } = auth;
  const { id } = await params;

  const db = getDb();
  const [row] = await db
    .select({ blobUrl: scannedMail.blobUrl })
    .from(scannedMail)
    .where(and(eq(scannedMail.id, id), eq(scannedMail.tenantId, tenantId)))
    .limit(1);

  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const filePath = resolveBlobPath(row.blobUrl);
  if (!filePath) {
    return NextResponse.json({ error: "invalid blob url" }, { status: 500 });
  }

  let buffer: Buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch {
    return NextResponse.json({ error: "blob missing on disk" }, { status: 410 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-length": String(buffer.byteLength),
      "cache-control": "private, max-age=3600",
      "content-disposition": `inline; filename="${id}.pdf"`,
    },
  });
}

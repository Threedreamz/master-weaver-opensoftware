import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";

/**
 * Disk-backed blob store for scanned PDFs.
 *
 * Layout: `{BLOB_ROOT}/{tenant}/{YYYY}/{MM}/{sha256}.pdf`
 *
 * On Railway, point `OPENPOSTBOX_BLOB_ROOT` at a mounted volume so blobs
 * survive deploys. Defaults to `./data/blobs` for local dev.
 *
 * Files are named by content hash so identical scans dedupe automatically
 * and the filename is tamper-evident. `writePdf` returns the canonical
 * `blob://` URL used as `scanned_mail.blobUrl` — the api's PDF-serve
 * route resolves it back to a disk path.
 */

const BLOB_ROOT = process.env.OPENPOSTBOX_BLOB_ROOT ?? path.join(process.cwd(), "data", "blobs");

export interface StoredBlob {
  blobUrl: string;
  sizeBytes: number;
  sha256: string;
}

export async function writePdf(tenantId: string, buffer: Buffer): Promise<StoredBlob> {
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");

  const safeTenant = sanitize(tenantId);
  const dir = path.join(BLOB_ROOT, safeTenant, yyyy, mm);
  await fs.mkdir(dir, { recursive: true });

  const file = path.join(dir, `${sha256}.pdf`);
  await fs.writeFile(file, buffer, { flag: "wx" }).catch((err) => {
    // EEXIST = dedupe hit; accept it silently
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
  });

  return {
    blobUrl: `blob://${safeTenant}/${yyyy}/${mm}/${sha256}.pdf`,
    sizeBytes: buffer.byteLength,
    sha256,
  };
}

export function resolveBlobPath(blobUrl: string): string | null {
  const match = /^blob:\/\/([^/]+)\/(\d{4})\/(\d{2})\/([0-9a-f]{64})\.pdf$/.exec(blobUrl);
  if (!match) return null;
  const [, tenant, yyyy, mm, hash] = match;
  return path.join(BLOB_ROOT, sanitize(tenant!), yyyy!, mm!, `${hash}.pdf`);
}

function sanitize(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
}

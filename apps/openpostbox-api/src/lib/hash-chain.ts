import { createHash } from "crypto";

/**
 * GoBD-style tamper-evident hash chain. Every new `scanned_mail` row stores
 * `prev_hash` = previous row's `this_hash` for the same tenant, and
 * `this_hash` = sha256(prev_hash || canonical_row_fields). Breaking any link
 * invalidates every subsequent hash — auditors can replay the chain to prove
 * the archive has not been edited.
 */
export function computeRowHash(fields: {
  prevHash: string | null;
  tenantId: string;
  receivedAt: number;
  blobUrl: string;
  pageCount: number;
}): string {
  const canonical = [
    fields.prevHash ?? "",
    fields.tenantId,
    String(fields.receivedAt),
    fields.blobUrl,
    String(fields.pageCount),
  ].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

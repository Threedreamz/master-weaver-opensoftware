/**
 * Helpers for working with canonical-id prefixes.
 *
 * The prefix convention is enforced at the schema level (see customer.ts etc.)
 * but consumers often need to extract or compose prefixed ids without
 * re-validating the whole record.
 */

export const CANONICAL_ID_RE = /^([a-z0-9][a-z0-9-]*):(.+)$/;

export interface ParsedCanonicalId {
  prefix: string;
  local: string;
}

export function parseCanonicalId(id: string): ParsedCanonicalId {
  const m = CANONICAL_ID_RE.exec(id);
  if (!m) throw new Error(`Not a canonical id: ${id!}`);
  return { prefix: m[1]!, local: m[2]! };
}

export function makeCanonicalId(prefix: string, local: string | number): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(prefix)) throw new Error(`Bad prefix: ${prefix}`);
  if (String(local).length === 0) throw new Error("Empty local part");
  return `${prefix}:${local}`;
}

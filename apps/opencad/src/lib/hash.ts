/**
 * opencad — deterministic feature-tree content hashing.
 *
 * Node-only (uses `crypto.createHash`). Used by geometry-cache to key cached
 * BufferGeometry buffers and by feature evaluation to detect dirty sub-trees.
 *
 * Stability: hashes are content-addressable; changing tokenization here
 * invalidates every cache entry and every stored featureTreeHash in Postgres.
 */
import { createHash } from "node:crypto";

/* ---------------------------------------------------------------- internal */

/** Canonical JSON stringify — stable key order, no whitespace, NaN→null. */
function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const keys = Object.keys(rec).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(rec[k])}`).join(",")}}`;
  }
  return "null";
}

/* ------------------------------------------------------------------ public */

/** Hash a single feature node by kind + parameters + ordered parent hashes. */
export function hashFeature(
  featureKind: string,
  params: unknown,
  parentHashes: readonly string[] = []
): string {
  const h = createHash("sha256");
  h.update("opencad:v1\n");
  h.update(`kind:${featureKind}\n`);
  h.update(`params:${canonicalJson(params)}\n`);
  h.update(`parents:${parentHashes.length}:${parentHashes.join(",")}\n`);
  return h.digest("hex");
}

/** Hash arbitrary content (params-only override hash). */
export function hashContent(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

/** Short 12-char prefix useful for logs + DB content-addressable filenames. */
export function shortHash(hex: string): string {
  return hex.slice(0, 12);
}

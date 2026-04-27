/**
 * opencad — in-process LRU cache for serialized feature-tree geometry.
 *
 * Key   = feature content hash (see hash.ts::hashFeature).
 * Value = serialized Float32/Uint32 arrays (position + normal + index + bbox).
 *
 * Bounded by BOTH entry count (64) and total byte size (128 MB) — whichever
 * trips first evicts the least-recently-used entry. Zero runtime deps — uses
 * JS `Map` insertion-order as the LRU primitive.
 *
 * This is a per-process cache. For cross-process persistence, serialize the
 * entries to /app/data via a separate store (not yet implemented in M1).
 */

/* ---------------------------------------------------------------- types */

export interface SerializedGeometry {
  /** xyz triples, length = vertexCount * 3 */
  position: Float32Array;
  /** xyz triples, length = vertexCount * 3 (optional smooth normals) */
  normal?: Float32Array;
  /** triangle indices, length = triangleCount * 3 */
  index: Uint32Array;
  /** axis-aligned bbox in millimeters */
  bbox: { min: [number, number, number]; max: [number, number, number] };
  /** signed volume in mm^3 (may be 0 if not computed) */
  volumeMm3: number;
}

export interface CacheStats {
  entries: number;
  bytes: number;
  maxEntries: number;
  maxBytes: number;
  hits: number;
  misses: number;
  evictions: number;
}

/* ---------------------------------------------------------------- config */

const MAX_ENTRIES = 64;
const MAX_BYTES = 128 * 1024 * 1024; // 128 MB

/* --------------------------------------------------------------- storage */

interface Entry {
  geom: SerializedGeometry;
  bytes: number;
}

const store = new Map<string, Entry>();
let totalBytes = 0;
let hits = 0;
let misses = 0;
let evictions = 0;

/* -------------------------------------------------------------- helpers */

/** Compute byte size of a SerializedGeometry (used for size-based eviction). */
function sizeOf(g: SerializedGeometry): number {
  let n = g.position.byteLength + g.index.byteLength;
  if (g.normal) n += g.normal.byteLength;
  n += 64; // fixed overhead: bbox + volume + map-entry bookkeeping
  return n;
}

/** Evict least-recently-used entries until both caps are satisfied. */
function evictUntilFits(incomingBytes: number): void {
  while (
    store.size > 0 &&
    (store.size >= MAX_ENTRIES || totalBytes + incomingBytes > MAX_BYTES)
  ) {
    const oldestKey = store.keys().next().value;
    if (oldestKey === undefined) break;
    const e = store.get(oldestKey)!;
    totalBytes -= e.bytes;
    store.delete(oldestKey);
    evictions += 1;
  }
}

/* ------------------------------------------------------------------ api */

/** Get a cached geometry and mark it most-recently-used. */
export function get(hash: string): SerializedGeometry | undefined {
  const e = store.get(hash);
  if (!e) {
    misses += 1;
    return undefined;
  }
  // refresh LRU position: delete + set moves to end of insertion order.
  store.delete(hash);
  store.set(hash, e);
  hits += 1;
  return e.geom;
}

/** Insert or replace a cache entry, evicting LRU entries as needed. */
export function put(hash: string, geom: SerializedGeometry): void {
  const bytes = sizeOf(geom);
  // Reject absurd single entries outright — don't blow the whole cache.
  if (bytes > MAX_BYTES) return;
  // If replacing, refund old bytes first.
  const prev = store.get(hash);
  if (prev) {
    totalBytes -= prev.bytes;
    store.delete(hash);
  }
  evictUntilFits(bytes);
  store.set(hash, { geom, bytes });
  totalBytes += bytes;
}

/** Check membership without promoting LRU. */
export function has(hash: string): boolean {
  return store.has(hash);
}

/** Remove a single entry by hash. */
export function remove(hash: string): boolean {
  const e = store.get(hash);
  if (!e) return false;
  totalBytes -= e.bytes;
  store.delete(hash);
  return true;
}

/** Return current cache metrics (useful for /api/health debug output). */
export function stats(): CacheStats {
  return {
    entries: store.size,
    bytes: totalBytes,
    maxEntries: MAX_ENTRIES,
    maxBytes: MAX_BYTES,
    hits,
    misses,
    evictions,
  };
}

/** Drop all entries and reset counters. */
export function clear(): void {
  store.clear();
  totalBytes = 0;
  hits = 0;
  misses = 0;
  evictions = 0;
}

/* ----------------------------------------------------- alias named exports */
/** Alias for `get` — matches the feature-timeline import contract. */
export function getCachedGeometry(hash: string): SerializedGeometry | undefined {
  return get(hash);
}

/** Alias for `put` — matches the feature-timeline import contract. */
export function setCachedGeometry(hash: string, geom: SerializedGeometry): void {
  put(hash, geom);
}

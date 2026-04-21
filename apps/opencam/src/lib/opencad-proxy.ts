/**
 * opencam — opencad export proxy.
 *
 * Fetches STEP / STL bytes from the companion opencad service as a streaming
 * body so large geometries don't buffer in memory. Consumers that re-emit the
 * stream (e.g. POST to another service) MUST set `duplex: "half"` on the
 * outbound fetch — Node 20+ web-streams reject duplex uploads without it
 * (see `.claude/rules/known-pitfalls.md` → "Upload Proxy OOM" and the
 * `duplex:"half"` note in `apps/opencad/src/app/api/import/[format]/route.ts`).
 *
 * Environment:
 *   OPENCAD_URL          — base URL of the opencad service
 *                          (default http://localhost:4174)
 *   OPENSOFTWARE_API_KEY — shared per-bubble API key sent as X-API-Key.
 *
 * Typical use:
 *   const { body } = await fetchOpencadExport(id, "stl");
 *   const { hash, bytes } = await hashStreamSha256(body);
 */

import { createHash } from "crypto";

export interface OpencadFetchResult {
  body: ReadableStream<Uint8Array>;
  contentLength: number | null;
  triangleCount: number | null; // from X-Triangle-Count header (STL/3MF only)
}

export interface FetchOpencadExportOptions {
  versionId?: string;
  baseUrl?: string;
  apiKey?: string;
}

function resolveBaseUrl(override?: string): string {
  const raw = (override ?? process.env.OPENCAD_URL ?? "http://localhost:4174").trim();
  return raw.replace(/\/+$/, "");
}

function resolveApiKey(override?: string): string {
  const raw = override ?? process.env.OPENSOFTWARE_API_KEY ?? "";
  if (!raw) {
    throw new Error(
      "[opencam:opencad-proxy] OPENSOFTWARE_API_KEY is not set — opencad export requires an API key",
    );
  }
  return raw;
}

/**
 * Fetch a streaming STEP/STL export from the opencad service.
 *
 * The returned `body` is a live ReadableStream — callers must either consume
 * it fully or cancel it. Leaving it pending will hold the underlying socket.
 *
 * When re-streaming the body to another service, always pass
 * `{ body: result.body, duplex: "half" }` to the outbound fetch.
 */
export async function fetchOpencadExport(
  opencadProjectId: string,
  format: "step" | "stl",
  opts: FetchOpencadExportOptions = {},
): Promise<OpencadFetchResult> {
  if (!opencadProjectId) {
    throw new Error("[opencam:opencad-proxy] opencadProjectId is required");
  }
  const baseUrl = resolveBaseUrl(opts.baseUrl);
  const apiKey = resolveApiKey(opts.apiKey);
  const qs = opts.versionId ? `?versionId=${encodeURIComponent(opts.versionId)}` : "";
  const url = `${baseUrl}/api/projects/${encodeURIComponent(opencadProjectId)}/export/${format}${qs}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
      Accept: "application/octet-stream",
    },
  });

  if (!res.ok) {
    // Read a small excerpt for context then throw.
    let excerpt = "";
    try {
      const text = await res.text();
      excerpt = text.slice(0, 500);
    } catch {
      excerpt = res.statusText;
    }
    throw new Error(
      `[opencam:opencad-proxy] opencad export ${format} failed: ${res.status} ${res.statusText} — ${excerpt}`,
    );
  }

  if (!res.body) {
    throw new Error("[opencam:opencad-proxy] opencad export response has no body");
  }

  const clHeader = res.headers.get("content-length");
  const contentLength = clHeader ? Number.parseInt(clHeader, 10) : NaN;
  const tcHeader = res.headers.get("x-triangle-count");
  const triangleCount = tcHeader ? Number.parseInt(tcHeader, 10) : NaN;

  return {
    body: res.body,
    contentLength: Number.isFinite(contentLength) ? contentLength : null,
    triangleCount: Number.isFinite(triangleCount) ? triangleCount : null,
  };
}

/**
 * Drain a ReadableStream into a Uint8Array while computing a SHA-256 hash.
 *
 * Returns both the hex digest and the collected bytes so callers can persist
 * the payload and inspect it (e.g. parse STL header, count triangles). Note
 * this DOES buffer the full payload — fine for <~200 MB CAM imports where a
 * stable geometryHash is required. For true zero-copy passthrough, wire the
 * stream directly to another fetch body.
 */
export async function hashStreamSha256(
  stream: ReadableStream<Uint8Array>,
): Promise<{ hash: string; bytes: Uint8Array }> {
  const hasher = createHash("sha256");
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = stream.getReader();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    hasher.update(value);
    chunks.push(value);
    total += value.byteLength;
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return { hash: hasher.digest("hex"), bytes };
}

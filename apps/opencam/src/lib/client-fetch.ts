/**
 * opencam — browser-safe typed fetcher.
 *
 * Thin wrapper around fetch that:
 *   - Auto-serialises plain-object bodies as JSON (+ Content-Type header).
 *   - Strips `undefined` values before stringifying so Zod .partial() shapes
 *     don't accidentally send `"foo": undefined` (which JSON.stringify drops
 *     anyway, but nested objects need explicit cleaning).
 *   - Throws FetchError on non-2xx with parsed error body (shape
 *     `{ error: string, details?: unknown }` per api-contracts.ts ErrorResponse).
 *   - Supports streaming / binary responses via `init.asStream` → returns Response.
 *
 * Server-safe: only uses global fetch. No Node-only imports.
 */

export class FetchError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
    public readonly url?: string,
  ) {
    super(message);
    this.name = "FetchError";
  }
}

export interface FetcherInit extends Omit<RequestInit, "body"> {
  /** Plain object (JSON-stringified), string, FormData, Blob, ReadableStream, or URLSearchParams. */
  body?: unknown;
  /** When true, skip JSON parsing and return the raw Response. Used for exports + streams. */
  asStream?: boolean;
}

function stripUndefined<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T;
  }
  if (
    value instanceof FormData ||
    value instanceof Blob ||
    value instanceof ArrayBuffer ||
    (typeof ReadableStream !== "undefined" && value instanceof ReadableStream) ||
    value instanceof URLSearchParams
  ) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[k] = stripUndefined(v);
  }
  return out as T;
}

function isBodyInit(v: unknown): v is BodyInit {
  if (v == null) return false;
  if (typeof v === "string") return true;
  if (v instanceof FormData) return true;
  if (v instanceof Blob) return true;
  if (v instanceof ArrayBuffer) return true;
  if (v instanceof URLSearchParams) return true;
  if (typeof ReadableStream !== "undefined" && v instanceof ReadableStream) return true;
  if (ArrayBuffer.isView(v as ArrayBufferView)) return true;
  return false;
}

/**
 * Typed fetch wrapper.
 *
 * @example
 *   const p = await fetcher<ProjectDetail>(`/api/projects/${id}`);
 *   const created = await fetcher<ProjectSummary>("/api/projects", { method: "POST", body: { name } });
 *   const blob = await fetcher<Response>(`/api/projects/${id}/export/stl`, { asStream: true }).then(r => r.blob());
 */
export async function fetcher<T>(url: string, init?: FetcherInit): Promise<T> {
  const headers = new Headers(init?.headers);
  let body: BodyInit | null | undefined;

  if (init?.body !== undefined && init.body !== null) {
    if (isBodyInit(init.body)) {
      body = init.body;
    } else {
      // Plain object → JSON. Strip undefined to keep payloads clean.
      const cleaned = stripUndefined(init.body);
      body = JSON.stringify(cleaned);
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
    }
  }

  if (!headers.has("Accept") && !init?.asStream) {
    headers.set("Accept", "application/json");
  }

  const res = await fetch(url, {
    ...init,
    headers,
    body,
  });

  if (!res.ok) {
    let parsed: { error?: string; details?: unknown } | null = null;
    const contentType = res.headers.get("content-type") ?? "";
    try {
      if (contentType.includes("application/json")) {
        parsed = (await res.json()) as { error?: string; details?: unknown };
      } else {
        const text = await res.text();
        parsed = { error: text || res.statusText };
      }
    } catch {
      parsed = { error: res.statusText };
    }
    throw new FetchError(
      res.status,
      parsed?.error ?? `opencam request failed with status ${res.status}`,
      parsed?.details,
      url,
    );
  }

  if (init?.asStream) {
    return res as unknown as T;
  }

  // 204 No Content → return null (cast to T — caller's responsibility to type correctly).
  if (res.status === 204) {
    return null as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  // Fallback: text for unknown content types.
  return (await res.text()) as unknown as T;
}

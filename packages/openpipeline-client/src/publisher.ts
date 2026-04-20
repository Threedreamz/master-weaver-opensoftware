import { CanonicalEvent } from "./events.js";

export interface PublisherOptions {
  /** Base URL of openpipeline (e.g. "http://openpipeline:4177"). */
  baseUrl: string;
  /**
   * Shared API key for the bubble. When unset, publisher falls back to
   * best-effort logging only — useful in dev where openpipeline is offline.
   */
  apiKey?: string;
  /** Timeout per emit in ms. Defaults to 2s so publishers don't stall handlers. */
  timeoutMs?: number;
  /**
   * If true, emit failures DON'T throw. Publishers typically want fire-and-forget
   * so a broken openpipeline doesn't break customer creation. Default: true.
   */
  silent?: boolean;
  /** Override for structured-log output; defaults to console.warn on error. */
  log?: (msg: string, meta?: Record<string, unknown>) => void;
}

export interface Publisher {
  emit(event: CanonicalEvent): Promise<{ delivered: boolean; error?: string }>;
}

/**
 * Create an openpipeline publisher.
 *
 * Fire-and-forget semantics: `.emit()` never throws when `silent: true` (the
 * default). Delivery is best-effort — if openpipeline is unreachable, a warn
 * line is logged and the caller continues. At-least-once delivery guarantees
 * are openpipeline's responsibility (retries / outbox / sync log).
 *
 * Usage inside a native upsert:
 * ```ts
 * const pipeline = createPublisher({ baseUrl: process.env.OPENPIPELINE_URL!, apiKey: process.env.OPENSOFTWARE_API_KEY });
 * await store.upsert(row);
 * await pipeline.emit({
 *   eventId: randomUUID(),
 *   type: "customer.created",
 *   occurredAt: new Date().toISOString(),
 *   source: "openaccounting",
 *   workspaceId: null,
 *   payload: toCanonicalCustomer(row),
 * });
 * ```
 */
export function createPublisher(opts: PublisherOptions): Publisher {
  const baseUrl = opts.baseUrl.replace(/\/+$/, "");
  const timeoutMs = opts.timeoutMs ?? 2_000;
  const silent = opts.silent ?? true;
  const log = opts.log ?? ((msg, meta) => console.warn(msg, meta));

  return {
    async emit(event) {
      try {
        const res = await fetch(`${baseUrl}/api/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(opts.apiKey ? { "X-API-Key": opts.apiKey } : {}),
          },
          body: JSON.stringify(event),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) {
          const error = `openpipeline emit failed: HTTP ${res.status}`;
          log(error, { eventType: event.type, eventId: event.eventId });
          if (!silent) throw new Error(error);
          return { delivered: false, error };
        }
        return { delivered: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`openpipeline emit failed: ${msg}`, {
          eventType: event.type,
          eventId: event.eventId,
        });
        if (!silent) throw err;
        return { delivered: false, error: msg };
      }
    },
  };
}

/** No-op publisher for tests / SSG / environments without openpipeline. */
export const nullPublisher: Publisher = {
  async emit() {
    return { delivered: false, error: "null publisher" };
  },
};

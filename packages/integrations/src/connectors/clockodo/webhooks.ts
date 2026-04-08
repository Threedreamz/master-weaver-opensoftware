import { createHmac } from "node:crypto";
import type { ClockodoWebhookPayload, ClockodoWebhookEventType } from "./types.js";

/**
 * Verify a Clockodo webhook signature.
 *
 * Clockodo signs payloads using HMAC-SHA256.
 * The signature is sent in the `X-Clockodo-Signature` header.
 *
 * @param secret - The webhook signing secret
 * @param payload - The raw request body as a string
 * @param signature - The `X-Clockodo-Signature` header value
 * @returns true if the signature is valid
 */
export function verifyClockodoWebhook(
  secret: string,
  payload: string,
  signature: string
): boolean {
  try {
    const expected = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return expected === signature;
  } catch {
    return false;
  }
}

/**
 * Parse a Clockodo webhook payload.
 *
 * @param rawBody - The raw request body string
 * @returns Parsed webhook payload
 */
export function parseClockodoWebhookPayload(
  rawBody: string
): ClockodoWebhookPayload {
  return JSON.parse(rawBody) as ClockodoWebhookPayload;
}

/**
 * Handler function type for Clockodo webhook events.
 */
export type ClockodoWebhookHandler = (
  payload: ClockodoWebhookPayload
) => Promise<void>;

/**
 * Clockodo webhook processor.
 *
 * Register handlers per event type, then call `process()` with the
 * raw request body and signature for verification + dispatch.
 */
export class ClockodoWebhookProcessor {
  private handlers = new Map<ClockodoWebhookEventType, ClockodoWebhookHandler[]>();

  constructor(private secret: string) {}

  /** Register a handler for a specific event type. */
  on(eventType: ClockodoWebhookEventType, handler: ClockodoWebhookHandler): this {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
    return this;
  }

  /** Register a handler for all event types. */
  onAny(handler: ClockodoWebhookHandler): this {
    const allTypes: ClockodoWebhookEventType[] = [
      "timeEntry.created",
      "timeEntry.updated",
      "timeEntry.deleted",
      "customer.created",
      "customer.updated",
      "customer.deleted",
      "project.created",
      "project.updated",
      "project.deleted",
      "absence.created",
      "absence.updated",
      "absence.deleted",
    ];
    for (const eventType of allTypes) {
      this.on(eventType, handler);
    }
    return this;
  }

  /**
   * Process a webhook payload with signature verification.
   * Returns true if at least one handler was invoked.
   */
  async process(rawBody: string, signature: string): Promise<boolean> {
    if (!verifyClockodoWebhook(this.secret, rawBody, signature)) {
      throw new Error("Invalid Clockodo webhook signature");
    }

    const payload = parseClockodoWebhookPayload(rawBody);
    const handlers = this.handlers.get(payload.event);
    if (!handlers || handlers.length === 0) {
      return false;
    }

    await Promise.all(handlers.map((handler) => handler(payload)));
    return true;
  }
}

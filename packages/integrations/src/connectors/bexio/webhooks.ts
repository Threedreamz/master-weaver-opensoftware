import { createHmac } from "node:crypto";
import type { BexioWebhookPayload, BexioWebhookEventType } from "./types.js";

/**
 * Handler function type for bexio webhook events.
 */
export type BexioWebhookHandler = (
  payload: BexioWebhookPayload
) => Promise<void>;

/**
 * Verify a bexio webhook signature using HMAC-SHA256.
 *
 * @param secret - The webhook signing secret from bexio
 * @param payload - The raw request body as a string
 * @param signature - The signature from the request header
 * @returns true if the signature is valid
 */
export function verifyBexioWebhook(
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
 * bexio webhook processor.
 *
 * Register handlers per event type, then call `process()` with the
 * raw request body. Optionally verify the signature before processing.
 */
export class BexioWebhookProcessor {
  private handlers = new Map<BexioWebhookEventType, BexioWebhookHandler[]>();

  /**
   * Register a handler for a specific event type.
   */
  on(eventType: BexioWebhookEventType, handler: BexioWebhookHandler): this {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
    return this;
  }

  /**
   * Register a handler for all event types.
   */
  onAny(handler: BexioWebhookHandler): this {
    const allTypes: BexioWebhookEventType[] = [
      "contact.created",
      "contact.updated",
      "contact.deleted",
      "invoice.created",
      "invoice.updated",
      "invoice.deleted",
      "invoice.status_changed",
      "order.created",
      "order.updated",
      "order.deleted",
      "payment.created",
      "payment.updated",
      "payment.deleted",
    ];
    for (const eventType of allTypes) {
      this.on(eventType, handler);
    }
    return this;
  }

  /**
   * Process a webhook payload.
   *
   * @param rawBody - The raw request body string
   * @param secret - Optional signing secret for verification
   * @param signature - Optional signature header value
   * @returns true if at least one handler was invoked
   */
  async process(
    rawBody: string,
    secret?: string,
    signature?: string
  ): Promise<boolean> {
    if (secret && signature) {
      if (!verifyBexioWebhook(secret, rawBody, signature)) {
        throw new Error("Invalid bexio webhook signature");
      }
    }

    const payload: BexioWebhookPayload = JSON.parse(rawBody);
    const handlers = this.handlers.get(payload.event);
    if (!handlers || handlers.length === 0) {
      return false;
    }

    await Promise.all(handlers.map((handler) => handler(payload)));
    return true;
  }
}

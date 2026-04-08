import { createHmac } from "node:crypto";
import type { SageWebhookPayload, SageWebhookEventType } from "./types.js";

/**
 * Handler function type for Sage webhook events.
 */
export type SageWebhookHandler = (
  payload: SageWebhookPayload
) => Promise<void>;

/**
 * Verify a Sage webhook signature using HMAC-SHA256.
 *
 * @param secret - The webhook signing secret from Sage
 * @param payload - The raw request body as a string
 * @param signature - The signature from the `X-Sage-Signature` header
 * @returns true if the signature is valid
 */
export function verifySageWebhook(
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
 * Sage webhook processor.
 *
 * Register handlers per event type, then call `process()` with the
 * raw request body.
 */
export class SageWebhookProcessor {
  private handlers = new Map<SageWebhookEventType, SageWebhookHandler[]>();

  /**
   * Register a handler for a specific event type.
   */
  on(eventType: SageWebhookEventType, handler: SageWebhookHandler): this {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
    return this;
  }

  /**
   * Register a handler for all event types.
   */
  onAny(handler: SageWebhookHandler): this {
    const allTypes: SageWebhookEventType[] = [
      "contact.created",
      "contact.updated",
      "contact.deleted",
      "sales_invoice.created",
      "sales_invoice.updated",
      "sales_invoice.deleted",
      "purchase_invoice.created",
      "purchase_invoice.updated",
      "purchase_invoice.deleted",
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
   * @param signature - Optional `X-Sage-Signature` header value
   * @returns true if at least one handler was invoked
   */
  async process(
    rawBody: string,
    secret?: string,
    signature?: string
  ): Promise<boolean> {
    if (secret && signature) {
      if (!verifySageWebhook(secret, rawBody, signature)) {
        throw new Error("Invalid Sage webhook signature");
      }
    }

    const payload: SageWebhookPayload = JSON.parse(rawBody);
    const handlers = this.handlers.get(payload.event_type);
    if (!handlers || handlers.length === 0) {
      return false;
    }

    await Promise.all(handlers.map((handler) => handler(payload)));
    return true;
  }
}

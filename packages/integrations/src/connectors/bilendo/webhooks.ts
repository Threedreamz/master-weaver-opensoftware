import { createHmac } from "node:crypto";
import type { BilendoWebhookPayload, BilendoWebhookEventType } from "./types.js";

/**
 * Verify a Bilendo webhook signature.
 *
 * Bilendo signs payloads using HMAC-SHA256 with the webhook secret.
 * The signature is sent in the `X-Bilendo-Signature` header.
 *
 * @param secret - The webhook signing secret
 * @param payload - The raw request body as a string
 * @param signature - The `X-Bilendo-Signature` header value
 * @returns true if the signature is valid
 */
export function verifyBilendoWebhook(
  secret: string,
  payload: string,
  signature: string
): boolean {
  try {
    const expected = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return `sha256=${expected}` === signature;
  } catch {
    return false;
  }
}

/**
 * Parse a Bilendo webhook payload.
 *
 * @param rawBody - The raw request body string
 * @returns Parsed webhook payload
 */
export function parseBilendoWebhookPayload(
  rawBody: string
): BilendoWebhookPayload {
  return JSON.parse(rawBody) as BilendoWebhookPayload;
}

/**
 * Handler function type for Bilendo webhook events.
 */
export type BilendoWebhookHandler = (
  payload: BilendoWebhookPayload
) => Promise<void>;

/**
 * Bilendo webhook processor.
 *
 * Register handlers per event type, then call `process()` with the
 * raw request body and signature for verification + dispatch.
 */
export class BilendoWebhookProcessor {
  private handlers = new Map<BilendoWebhookEventType, BilendoWebhookHandler[]>();

  constructor(private secret: string) {}

  /** Register a handler for a specific event type. */
  on(eventType: BilendoWebhookEventType, handler: BilendoWebhookHandler): this {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
    return this;
  }

  /** Register a handler for all event types. */
  onAny(handler: BilendoWebhookHandler): this {
    const allTypes: BilendoWebhookEventType[] = [
      "invoice.created",
      "invoice.updated",
      "invoice.overdue",
      "invoice.paid",
      "invoice.partially_paid",
      "invoice.written_off",
      "dunning.step_executed",
      "dunning.step_failed",
      "payment.received",
      "payment.reversed",
      "customer.risk_changed",
      "customer.credit_limit_exceeded",
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
    if (!verifyBilendoWebhook(this.secret, rawBody, signature)) {
      throw new Error("Invalid Bilendo webhook signature");
    }

    const payload = parseBilendoWebhookPayload(rawBody);
    const handlers = this.handlers.get(payload.eventType);
    if (!handlers || handlers.length === 0) {
      return false;
    }

    await Promise.all(handlers.map((handler) => handler(payload)));
    return true;
  }
}

import { createHmac } from "node:crypto";
import type { AuxmoneyWebhookPayload, AuxmoneyWebhookEventType } from "./types.js";

/**
 * Verify an auxmoney webhook signature.
 *
 * auxmoney signs payloads using HMAC-SHA256.
 * The signature is sent in the `X-Auxmoney-Signature` header.
 *
 * @param secret - The webhook signing secret
 * @param payload - The raw request body as a string
 * @param signature - The `X-Auxmoney-Signature` header value
 * @returns true if the signature is valid
 */
export function verifyAuxmoneyWebhook(
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
 * Parse an auxmoney webhook payload.
 *
 * @param rawBody - The raw request body string
 * @returns Parsed webhook payload
 */
export function parseAuxmoneyWebhookPayload(
  rawBody: string
): AuxmoneyWebhookPayload {
  return JSON.parse(rawBody) as AuxmoneyWebhookPayload;
}

/**
 * Handler function type for auxmoney webhook events.
 */
export type AuxmoneyWebhookHandler = (
  payload: AuxmoneyWebhookPayload
) => Promise<void>;

/**
 * auxmoney webhook processor.
 *
 * Register handlers per event type, then call `process()` with the
 * raw request body and signature for verification + dispatch.
 */
export class AuxmoneyWebhookProcessor {
  private handlers = new Map<AuxmoneyWebhookEventType, AuxmoneyWebhookHandler[]>();

  constructor(private secret: string) {}

  /** Register a handler for a specific event type. */
  on(eventType: AuxmoneyWebhookEventType, handler: AuxmoneyWebhookHandler): this {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
    return this;
  }

  /** Register a handler for all event types. */
  onAny(handler: AuxmoneyWebhookHandler): this {
    const allTypes: AuxmoneyWebhookEventType[] = [
      "credit.submitted",
      "credit.approved",
      "credit.rejected",
      "credit.offer_made",
      "credit.accepted",
      "credit.disbursed",
      "receivable.submitted",
      "receivable.approved",
      "receivable.financed",
      "receivable.paid",
      "receivable.overdue",
      "receivable.defaulted",
      "payment.received",
      "payment.overdue",
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
    if (!verifyAuxmoneyWebhook(this.secret, rawBody, signature)) {
      throw new Error("Invalid auxmoney webhook signature");
    }

    const payload = parseAuxmoneyWebhookPayload(rawBody);
    const handlers = this.handlers.get(payload.eventType);
    if (!handlers || handlers.length === 0) {
      return false;
    }

    await Promise.all(handlers.map((handler) => handler(payload)));
    return true;
  }
}

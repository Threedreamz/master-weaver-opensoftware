import { createHmac } from "node:crypto";
import type { CreditshelfWebhookPayload, CreditshelfWebhookEventType } from "./types.js";

/**
 * Verify a creditshelf webhook signature.
 *
 * creditshelf signs payloads using HMAC-SHA256.
 * The signature is sent in the `X-Creditshelf-Signature` header.
 *
 * @param secret - The webhook signing secret
 * @param payload - The raw request body as a string
 * @param signature - The `X-Creditshelf-Signature` header value
 * @returns true if the signature is valid
 */
export function verifyCreditshelfWebhook(
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
 * Parse a creditshelf webhook payload.
 *
 * @param rawBody - The raw request body string
 * @returns Parsed webhook payload
 */
export function parseCreditshelfWebhookPayload(
  rawBody: string
): CreditshelfWebhookPayload {
  return JSON.parse(rawBody) as CreditshelfWebhookPayload;
}

/**
 * Handler function type for creditshelf webhook events.
 */
export type CreditshelfWebhookHandler = (
  payload: CreditshelfWebhookPayload
) => Promise<void>;

/**
 * creditshelf webhook processor.
 *
 * Register handlers per event type, then call `process()` with the
 * raw request body and signature for verification + dispatch.
 */
export class CreditshelfWebhookProcessor {
  private handlers = new Map<CreditshelfWebhookEventType, CreditshelfWebhookHandler[]>();

  constructor(private secret: string) {}

  /** Register a handler for a specific event type. */
  on(eventType: CreditshelfWebhookEventType, handler: CreditshelfWebhookHandler): this {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
    return this;
  }

  /** Register a handler for all event types. */
  onAny(handler: CreditshelfWebhookHandler): this {
    const allTypes: CreditshelfWebhookEventType[] = [
      "financing_request.submitted",
      "financing_request.approved",
      "financing_request.rejected",
      "financing_request.offer_sent",
      "financing_request.accepted",
      "financing_request.funded",
      "loan.payment_received",
      "loan.payment_overdue",
      "loan.status_changed",
      "loan.matured",
      "document.uploaded",
      "document.verified",
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
    if (!verifyCreditshelfWebhook(this.secret, rawBody, signature)) {
      throw new Error("Invalid creditshelf webhook signature");
    }

    const payload = parseCreditshelfWebhookPayload(rawBody);
    const handlers = this.handlers.get(payload.eventType);
    if (!handlers || handlers.length === 0) {
      return false;
    }

    await Promise.all(handlers.map((handler) => handler(payload)));
    return true;
  }
}

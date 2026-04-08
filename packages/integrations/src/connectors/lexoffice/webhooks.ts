import type { LexofficeWebhookPayload, LexofficeWebhookEventType } from "./types.js";

/**
 * Handler function type for Lexoffice webhook events.
 */
export type LexofficeWebhookHandler = (
  payload: LexofficeWebhookPayload
) => Promise<void>;

/**
 * Lexoffice webhook processor.
 *
 * Lexoffice does not sign webhook payloads, so verification relies on
 * ensuring the callback URL is kept secret and using HTTPS.
 *
 * Register handlers per event type, then call `process()` with the
 * raw request body.
 */
export class LexofficeWebhookProcessor {
  private handlers = new Map<LexofficeWebhookEventType, LexofficeWebhookHandler[]>();

  /**
   * Register a handler for a specific event type.
   */
  on(eventType: LexofficeWebhookEventType, handler: LexofficeWebhookHandler): this {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
    return this;
  }

  /**
   * Register a handler for all event types.
   */
  onAny(handler: LexofficeWebhookHandler): this {
    const allTypes: LexofficeWebhookEventType[] = [
      "contact.created",
      "contact.changed",
      "contact.deleted",
      "invoice.created",
      "invoice.changed",
      "invoice.deleted",
      "invoice.status.changed",
      "credit-note.created",
      "credit-note.changed",
      "credit-note.deleted",
      "credit-note.status.changed",
      "order-confirmation.created",
      "order-confirmation.changed",
      "order-confirmation.deleted",
      "order-confirmation.status.changed",
      "quotation.created",
      "quotation.changed",
      "quotation.deleted",
      "quotation.status.changed",
      "payment.changed",
      "voucher.created",
      "voucher.changed",
      "voucher.deleted",
      "voucher.status.changed",
    ];

    for (const eventType of allTypes) {
      this.on(eventType, handler);
    }
    return this;
  }

  /**
   * Process a webhook payload.
   *
   * Parses the JSON body and dispatches to registered handlers.
   * Returns true if at least one handler was invoked.
   */
  async process(rawBody: string): Promise<boolean> {
    const payload: LexofficeWebhookPayload = JSON.parse(rawBody);

    const handlers = this.handlers.get(payload.eventType);
    if (!handlers || handlers.length === 0) {
      return false;
    }

    await Promise.all(handlers.map((handler) => handler(payload)));
    return true;
  }
}

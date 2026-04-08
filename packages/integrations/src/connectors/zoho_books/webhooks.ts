import type { ZohoWebhookPayload, ZohoWebhookEventType } from "./types.js";

/**
 * Handler function type for Zoho Books webhook events.
 */
export type ZohoWebhookHandler = (
  payload: ZohoWebhookPayload
) => Promise<void>;

/**
 * Zoho Books webhook processor.
 *
 * Zoho Books webhooks are configured via workflow rules and use
 * URL-based verification. Payloads are sent as JSON POST requests.
 *
 * Register handlers per event type, then call `process()` with the
 * raw request body.
 */
export class ZohoBooksWebhookProcessor {
  private handlers = new Map<ZohoWebhookEventType, ZohoWebhookHandler[]>();

  /**
   * Register a handler for a specific event type.
   */
  on(eventType: ZohoWebhookEventType, handler: ZohoWebhookHandler): this {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
    return this;
  }

  /**
   * Register a handler for all event types.
   */
  onAny(handler: ZohoWebhookHandler): this {
    const allTypes: ZohoWebhookEventType[] = [
      "contact.created",
      "contact.updated",
      "contact.deleted",
      "invoice.created",
      "invoice.updated",
      "invoice.deleted",
      "bill.created",
      "bill.updated",
      "bill.deleted",
      "expense.created",
      "expense.updated",
      "expense.deleted",
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
   * @returns true if at least one handler was invoked
   */
  async process(rawBody: string): Promise<boolean> {
    const payload: ZohoWebhookPayload = JSON.parse(rawBody);
    const handlers = this.handlers.get(payload.event_type);
    if (!handlers || handlers.length === 0) {
      return false;
    }

    await Promise.all(handlers.map((handler) => handler(payload)));
    return true;
  }
}

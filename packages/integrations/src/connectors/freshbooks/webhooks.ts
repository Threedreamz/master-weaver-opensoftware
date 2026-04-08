import type { FreshBooksWebhookPayload, FreshBooksWebhookEventType } from "./types.js";

/**
 * Handler function type for FreshBooks webhook events.
 */
export type FreshBooksWebhookHandler = (
  payload: FreshBooksWebhookPayload
) => Promise<void>;

/**
 * FreshBooks webhook processor.
 *
 * FreshBooks uses a verification handshake rather than payload signing.
 * During registration, FreshBooks sends a verification code that must be
 * confirmed. After that, payloads are sent without signatures but only
 * to the verified URL.
 *
 * Register handlers per event type, then call `process()` with the
 * raw request body.
 */
export class FreshBooksWebhookProcessor {
  private handlers = new Map<FreshBooksWebhookEventType, FreshBooksWebhookHandler[]>();

  /**
   * Register a handler for a specific event type.
   */
  on(eventType: FreshBooksWebhookEventType, handler: FreshBooksWebhookHandler): this {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
    return this;
  }

  /**
   * Register a handler for all event types.
   */
  onAny(handler: FreshBooksWebhookHandler): this {
    const allTypes: FreshBooksWebhookEventType[] = [
      "client.create",
      "client.update",
      "client.delete",
      "invoice.create",
      "invoice.update",
      "invoice.delete",
      "invoice.send",
      "expense.create",
      "expense.update",
      "expense.delete",
      "payment.create",
      "payment.update",
      "payment.delete",
      "estimate.create",
      "estimate.update",
      "estimate.delete",
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
    const payload: FreshBooksWebhookPayload = JSON.parse(rawBody);
    const handlers = this.handlers.get(payload.name);
    if (!handlers || handlers.length === 0) {
      return false;
    }

    await Promise.all(handlers.map((handler) => handler(payload)));
    return true;
  }
}

import { createHmac } from "node:crypto";
import type { XeroWebhookPayload, XeroWebhookEvent, XeroWebhookResourceType, XeroWebhookEventType } from "./types.js";

/**
 * Handler function type for Xero webhook events.
 */
export type XeroWebhookHandler = (
  event: XeroWebhookEvent
) => Promise<void>;

/**
 * Verify a Xero webhook signature using HMAC-SHA256.
 *
 * Xero sends the HMAC-SHA256 signature in the `x-xero-signature` header,
 * computed over the raw request body using the webhook key.
 *
 * @param webhookKey - The webhook signing key from Xero
 * @param payload - The raw request body as a string
 * @param signature - The `x-xero-signature` header value (base64 encoded)
 * @returns true if the signature is valid
 */
export function verifyXeroWebhook(
  webhookKey: string,
  payload: string,
  signature: string
): boolean {
  try {
    const expected = createHmac("sha256", webhookKey)
      .update(payload)
      .digest("base64");
    return expected === signature;
  } catch {
    return false;
  }
}

/**
 * Xero webhook processor.
 *
 * Register handlers per resource type and event type, then call `process()`
 * with the raw request body. Verifies the signature before processing.
 *
 * Xero requires you to respond with 200 for valid signatures and 401
 * for invalid ones during the Intent to Receive verification.
 */
export class XeroWebhookProcessor {
  private handlers = new Map<string, XeroWebhookHandler[]>();

  /**
   * Register a handler for a specific resource + event type combination.
   */
  on(
    resourceType: XeroWebhookResourceType,
    eventType: XeroWebhookEventType,
    handler: XeroWebhookHandler
  ): this {
    const key = `${resourceType}:${eventType}`;
    const existing = this.handlers.get(key) ?? [];
    existing.push(handler);
    this.handlers.set(key, existing);
    return this;
  }

  /**
   * Register a handler for all events of a resource type.
   */
  onResource(
    resourceType: XeroWebhookResourceType,
    handler: XeroWebhookHandler
  ): this {
    const eventTypes: XeroWebhookEventType[] = ["CREATE", "UPDATE", "DELETE"];
    for (const eventType of eventTypes) {
      this.on(resourceType, eventType, handler);
    }
    return this;
  }

  /**
   * Register a handler for all events.
   */
  onAny(handler: XeroWebhookHandler): this {
    const resourceTypes: XeroWebhookResourceType[] = [
      "INVOICE",
      "CONTACT",
      "PAYMENT",
      "MANUALJOURNAL",
      "ACCOUNT",
      "BANKTRANSACTION",
    ];
    for (const resourceType of resourceTypes) {
      this.onResource(resourceType, handler);
    }
    return this;
  }

  /**
   * Process a webhook payload.
   *
   * @param rawBody - The raw request body string
   * @param webhookKey - The webhook signing key for verification
   * @param signature - The `x-xero-signature` header value
   * @returns true if at least one handler was invoked
   * @throws Error if the signature is invalid
   */
  async process(
    rawBody: string,
    webhookKey: string,
    signature: string
  ): Promise<boolean> {
    if (!verifyXeroWebhook(webhookKey, rawBody, signature)) {
      throw new Error("Invalid Xero webhook signature");
    }

    const payload: XeroWebhookPayload = JSON.parse(rawBody);
    let handled = false;

    for (const event of payload.events) {
      const key = `${event.eventCategory}:${event.eventType}`;
      const handlers = this.handlers.get(key);
      if (handlers && handlers.length > 0) {
        await Promise.all(handlers.map((handler) => handler(event)));
        handled = true;
      }
    }

    return handled;
  }
}

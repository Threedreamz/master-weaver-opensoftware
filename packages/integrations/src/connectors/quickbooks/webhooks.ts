import { createHmac } from "node:crypto";
import type {
  QBWebhookPayload,
  QBWebhookEntity,
  QBWebhookEntityType,
  QBWebhookEventType,
} from "./types.js";

/**
 * Handler function type for QuickBooks webhook events.
 */
export type QBWebhookHandler = (
  entity: QBWebhookEntity,
  realmId: string
) => Promise<void>;

/**
 * Verify a QuickBooks webhook signature using HMAC-SHA256.
 *
 * QuickBooks signs the payload with the verifier token. The signature
 * is sent in the `intuit-signature` header as base64-encoded HMAC-SHA256.
 *
 * @param verifierToken - The webhook verifier token from QuickBooks
 * @param payload - The raw request body as a string
 * @param signature - The `intuit-signature` header value (base64)
 * @returns true if the signature is valid
 */
export function verifyQuickBooksWebhook(
  verifierToken: string,
  payload: string,
  signature: string
): boolean {
  try {
    const expected = createHmac("sha256", verifierToken)
      .update(payload)
      .digest("base64");
    return expected === signature;
  } catch {
    return false;
  }
}

/**
 * QuickBooks webhook processor.
 *
 * Register handlers per entity type and event type, then call `process()`
 * with the raw request body.
 */
export class QuickBooksWebhookProcessor {
  private handlers = new Map<string, QBWebhookHandler[]>();

  /**
   * Register a handler for a specific entity + operation combination.
   */
  on(
    entityType: QBWebhookEntityType,
    operation: QBWebhookEventType,
    handler: QBWebhookHandler
  ): this {
    const key = `${entityType}:${operation}`;
    const existing = this.handlers.get(key) ?? [];
    existing.push(handler);
    this.handlers.set(key, existing);
    return this;
  }

  /**
   * Register a handler for all operations on an entity type.
   */
  onEntity(entityType: QBWebhookEntityType, handler: QBWebhookHandler): this {
    const operations: QBWebhookEventType[] = ["Create", "Update", "Delete", "Merge", "Void"];
    for (const op of operations) {
      this.on(entityType, op, handler);
    }
    return this;
  }

  /**
   * Register a handler for all events.
   */
  onAny(handler: QBWebhookHandler): this {
    const entityTypes: QBWebhookEntityType[] = [
      "Customer", "Invoice", "Payment", "Account",
      "Vendor", "Bill", "Estimate", "SalesReceipt",
      "CreditMemo", "PurchaseOrder", "JournalEntry",
    ];
    for (const entity of entityTypes) {
      this.onEntity(entity, handler);
    }
    return this;
  }

  /**
   * Process a webhook payload.
   *
   * @param rawBody - The raw request body string
   * @param verifierToken - The webhook verifier token for signature verification
   * @param signature - The `intuit-signature` header value
   * @returns true if at least one handler was invoked
   */
  async process(
    rawBody: string,
    verifierToken: string,
    signature: string
  ): Promise<boolean> {
    if (!verifyQuickBooksWebhook(verifierToken, rawBody, signature)) {
      throw new Error("Invalid QuickBooks webhook signature");
    }

    const payload: QBWebhookPayload = JSON.parse(rawBody);
    let handled = false;

    for (const notification of payload.eventNotifications) {
      for (const entity of notification.dataChangeEvent.entities) {
        const key = `${entity.name}:${entity.operation}`;
        const handlers = this.handlers.get(key);
        if (handlers && handlers.length > 0) {
          await Promise.all(
            handlers.map((handler) => handler(entity, notification.realmId))
          );
          handled = true;
        }
      }
    }

    return handled;
  }
}

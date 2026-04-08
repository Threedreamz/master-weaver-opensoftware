import { createHmac } from "node:crypto";
import type { HarvestWebhookPayload, HarvestWebhookEventType } from "./types.js";

/**
 * Verify a Harvest webhook signature.
 *
 * Harvest signs webhook payloads using HMAC-SHA256.
 * The signature is sent in the `Harvest-Webhook-Signature` header.
 *
 * @param secret - The webhook signing secret
 * @param payload - The raw request body as a string
 * @param signature - The `Harvest-Webhook-Signature` header value
 * @returns true if the signature is valid
 */
export function verifyHarvestWebhook(
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
 * Parse a Harvest webhook payload.
 *
 * @param rawBody - The raw request body string
 * @returns Parsed webhook payload
 */
export function parseHarvestWebhookPayload(
  rawBody: string
): HarvestWebhookPayload {
  return JSON.parse(rawBody) as HarvestWebhookPayload;
}

/**
 * Handler function type for Harvest webhook events.
 */
export type HarvestWebhookHandler = (
  payload: HarvestWebhookPayload
) => Promise<void>;

/**
 * Harvest webhook processor.
 *
 * Register handlers per event type, then call `process()` with the
 * raw request body and signature for verification + dispatch.
 */
export class HarvestWebhookProcessor {
  private handlers = new Map<HarvestWebhookEventType, HarvestWebhookHandler[]>();

  constructor(private secret: string) {}

  /** Register a handler for a specific event type. */
  on(eventType: HarvestWebhookEventType, handler: HarvestWebhookHandler): this {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
    return this;
  }

  /** Register a handler for all event types. */
  onAny(handler: HarvestWebhookHandler): this {
    const allTypes: HarvestWebhookEventType[] = [
      "TimeEntries.create",
      "TimeEntries.update",
      "TimeEntries.delete",
      "Projects.create",
      "Projects.update",
      "Projects.delete",
      "Invoices.create",
      "Invoices.update",
      "Invoices.delete",
      "Expenses.create",
      "Expenses.update",
      "Expenses.delete",
      "Clients.create",
      "Clients.update",
      "Clients.delete",
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
    if (!verifyHarvestWebhook(this.secret, rawBody, signature)) {
      throw new Error("Invalid Harvest webhook signature");
    }

    const payload = parseHarvestWebhookPayload(rawBody);
    const handlers = this.handlers.get(payload.event);
    if (!handlers || handlers.length === 0) {
      return false;
    }

    await Promise.all(handlers.map((handler) => handler(payload)));
    return true;
  }
}

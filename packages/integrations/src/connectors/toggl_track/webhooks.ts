import { createHmac } from "node:crypto";
import type { TogglWebhookPayload, TogglWebhookEventType } from "./types.js";

/**
 * Verify a Toggl Track webhook signature.
 *
 * Toggl signs webhook payloads using HMAC-SHA256 with the subscription secret.
 * The signature is sent in the `X-Webhook-Signature-256` header.
 *
 * @param secret - The webhook subscription secret
 * @param payload - The raw request body as a string
 * @param signature - The `X-Webhook-Signature-256` header value
 * @returns true if the signature is valid
 */
export function verifyTogglWebhook(
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
 * Parse a Toggl Track webhook payload.
 *
 * @param rawBody - The raw request body string
 * @returns Parsed webhook payload
 */
export function parseTogglWebhookPayload(
  rawBody: string
): TogglWebhookPayload {
  return JSON.parse(rawBody) as TogglWebhookPayload;
}

/**
 * Handler function type for Toggl webhook events.
 */
export type TogglWebhookHandler = (
  payload: TogglWebhookPayload
) => Promise<void>;

/**
 * Toggl Track webhook processor.
 *
 * Register handlers per event type, then call `process()` with the
 * raw request body and signature for verification + dispatch.
 */
export class TogglWebhookProcessor {
  private handlers = new Map<TogglWebhookEventType, TogglWebhookHandler[]>();

  constructor(private secret: string) {}

  /** Register a handler for a specific event type. */
  on(eventType: TogglWebhookEventType, handler: TogglWebhookHandler): this {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
    return this;
  }

  /** Register a handler for all event types. */
  onAny(handler: TogglWebhookHandler): this {
    const allTypes: TogglWebhookEventType[] = [
      "time_entry.created",
      "time_entry.updated",
      "time_entry.deleted",
      "project.created",
      "project.updated",
      "project.deleted",
      "client.created",
      "client.updated",
      "client.deleted",
      "tag.created",
      "tag.updated",
      "tag.deleted",
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
    if (!verifyTogglWebhook(this.secret, rawBody, signature)) {
      throw new Error("Invalid Toggl Track webhook signature");
    }

    const payload = parseTogglWebhookPayload(rawBody);
    const handlers = this.handlers.get(payload.event);
    if (!handlers || handlers.length === 0) {
      return false;
    }

    await Promise.all(handlers.map((handler) => handler(payload)));
    return true;
  }
}

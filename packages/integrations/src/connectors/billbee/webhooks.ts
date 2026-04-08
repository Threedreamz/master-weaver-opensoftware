// ==================== Billbee Webhook Verification ====================

import { createHmac, timingSafeEqual } from "node:crypto";
import type { BillbeeWebhookEvent, BillbeeWebhookPayload } from "./types.js";

/**
 * Verify a Billbee webhook signature.
 *
 * Billbee signs webhooks with a shared secret using HMAC-SHA256.
 * The signature is sent in the `X-Billbee-Signature` header.
 */
export function verifyBillbeeWebhook(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64");

  try {
    return timingSafeEqual(
      Buffer.from(signature, "base64"),
      Buffer.from(expectedSignature, "base64")
    );
  } catch {
    return false;
  }
}

/**
 * Parse a Billbee webhook request into a typed payload.
 */
export function parseBillbeeWebhook(
  body: string,
  headers: Record<string, string | undefined>
): BillbeeWebhookPayload {
  const parsed = JSON.parse(body) as Record<string, unknown>;

  // Billbee sends the event type in the payload
  const event = (parsed.Event ?? parsed.event ?? headers["x-billbee-event"]) as
    | BillbeeWebhookEvent
    | undefined;

  if (!event) {
    throw new Error("Unable to determine Billbee webhook event type");
  }

  return {
    event,
    body: parsed,
  };
}

export type BillbeeWebhookHandler = (payload: BillbeeWebhookPayload) => Promise<void>;

/**
 * Create a router that dispatches Billbee webhook events by type.
 */
export function createBillbeeWebhookRouter(
  handlers: Partial<Record<BillbeeWebhookEvent, BillbeeWebhookHandler>>
): (
  body: string,
  signature: string,
  secret: string,
  headers: Record<string, string | undefined>
) => Promise<void> {
  return async (body, signature, secret, headers) => {
    if (!verifyBillbeeWebhook(body, signature, secret)) {
      throw new Error("Invalid Billbee webhook signature");
    }

    const payload = parseBillbeeWebhook(body, headers);
    const handler = handlers[payload.event];

    if (handler) {
      await handler(payload);
    }
  };
}

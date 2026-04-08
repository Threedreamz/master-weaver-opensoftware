// ==================== WooCommerce Webhook Verification ====================

import { createHmac, timingSafeEqual } from "node:crypto";
import type { WooWebhookTopic, WooWebhookPayload } from "./types.js";

/**
 * Verify a WooCommerce webhook signature.
 *
 * WooCommerce sends the signature in the `X-WC-Webhook-Signature` header
 * as a base64-encoded HMAC-SHA256 digest of the payload body.
 */
export function verifyWooCommerceWebhook(
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
 * Parse a WooCommerce webhook request into a typed payload.
 *
 * Extracts topic and resource from standard WooCommerce headers.
 */
export function parseWooCommerceWebhook(
  body: string,
  headers: Record<string, string | undefined>
): WooWebhookPayload {
  const topic = (headers["x-wc-webhook-topic"] ?? headers["X-WC-Webhook-Topic"]) as WooWebhookTopic | undefined;
  const resource = headers["x-wc-webhook-resource"] ?? headers["X-WC-Webhook-Resource"];

  if (!topic) {
    throw new Error("Missing X-WC-Webhook-Topic header");
  }

  const parsed = JSON.parse(body) as Record<string, unknown>;

  return {
    topic,
    resource: resource ?? topic.split(".")[0],
    body: parsed,
  };
}

export type WooWebhookHandler = (payload: WooWebhookPayload) => Promise<void>;

/**
 * Create a router that dispatches WooCommerce webhook events by topic.
 */
export function createWooCommerceWebhookRouter(
  handlers: Partial<Record<WooWebhookTopic, WooWebhookHandler>>
): (
  body: string,
  signature: string,
  secret: string,
  headers: Record<string, string | undefined>
) => Promise<void> {
  return async (body, signature, secret, headers) => {
    if (!verifyWooCommerceWebhook(body, signature, secret)) {
      throw new Error("Invalid WooCommerce webhook signature");
    }

    const payload = parseWooCommerceWebhook(body, headers);
    const handler = handlers[payload.topic];

    if (handler) {
      await handler(payload);
    }
  };
}

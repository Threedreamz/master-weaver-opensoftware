// ==================== Shopify Webhook Verification ====================

import { createHmac, timingSafeEqual } from "node:crypto";
import type { ShopifyWebhookTopic, ShopifyWebhookPayload } from "./types.js";

/**
 * Verify a Shopify webhook HMAC-SHA256 signature.
 *
 * Shopify sends the signature in the `X-Shopify-Hmac-Sha256` header
 * as a base64-encoded HMAC-SHA256 digest.
 */
export function verifyShopifyWebhook(
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
 * Parse a Shopify webhook request into a typed payload.
 *
 * Extracts topic and shop domain from standard Shopify webhook headers.
 */
export function parseShopifyWebhook(
  body: string,
  headers: Record<string, string | undefined>
): ShopifyWebhookPayload {
  const topic = (headers["x-shopify-topic"] ?? headers["X-Shopify-Topic"]) as ShopifyWebhookTopic | undefined;
  const shopDomain = headers["x-shopify-shop-domain"] ?? headers["X-Shopify-Shop-Domain"];

  if (!topic) {
    throw new Error("Missing X-Shopify-Topic header");
  }
  if (!shopDomain) {
    throw new Error("Missing X-Shopify-Shop-Domain header");
  }

  const parsed = JSON.parse(body) as Record<string, unknown>;

  return {
    topic,
    shopDomain,
    body: parsed,
  };
}

export type ShopifyWebhookHandler = (payload: ShopifyWebhookPayload) => Promise<void>;

/**
 * Create a router that dispatches Shopify webhook events by topic.
 */
export function createShopifyWebhookRouter(
  handlers: Partial<Record<ShopifyWebhookTopic, ShopifyWebhookHandler>>
): (
  body: string,
  signature: string,
  secret: string,
  headers: Record<string, string | undefined>
) => Promise<void> {
  return async (body, signature, secret, headers) => {
    if (!verifyShopifyWebhook(body, signature, secret)) {
      throw new Error("Invalid Shopify webhook signature");
    }

    const payload = parseShopifyWebhook(body, headers);
    const handler = handlers[payload.topic];

    if (handler) {
      await handler(payload);
    }
  };
}

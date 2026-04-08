// ==================== eBay Webhook (Notification) Handling ====================

import { createHash } from "node:crypto";
import { verifyWebhookSignature } from "../../core/webhook-verifier.js";
import type { WebhookConfig } from "../../core/types.js";
import type { EbayNotification, EbayNotificationType } from "./types.js";

export interface EbayWebhookConfig {
  /** Verification token from eBay Developer Portal */
  verificationToken: string;
  /** Endpoint URL registered with eBay */
  endpointUrl: string;
}

/**
 * Handle the eBay webhook challenge (endpoint validation).
 * eBay sends a GET request with a challenge_code that must be
 * returned as a hash to prove ownership.
 */
export function handleEbayChallenge(
  challengeCode: string,
  config: EbayWebhookConfig
): { challengeResponse: string } {
  // eBay expects: SHA-256 hash of (challengeCode + verificationToken + endpointUrl)
  const input = challengeCode + config.verificationToken + config.endpointUrl;
  const hash = createHash("sha256").update(input).digest("hex");

  return { challengeResponse: hash };
}

/**
 * Verify an eBay webhook notification signature using HMAC-SHA256.
 */
export function verifyEbayWebhook(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  const webhookConfig: WebhookConfig = {
    secret,
    signatureHeader: "x-ebay-signature",
    signatureAlgorithm: "hmac-sha256",
  };
  return verifyWebhookSignature(payload, signature, webhookConfig);
}

/**
 * Parse an eBay notification payload.
 */
export function parseEbayNotification(payload: string): EbayNotification {
  const parsed = JSON.parse(payload) as EbayNotification;

  if (!parsed.metadata?.topic || !parsed.notification?.notificationId) {
    throw new Error("Invalid eBay notification payload: missing required fields");
  }

  return parsed;
}

export type EbayWebhookHandler = (notification: EbayNotification) => Promise<void>;

/**
 * Create a webhook handler that routes notifications by topic.
 */
export function createEbayWebhookRouter(
  handlers: Partial<Record<EbayNotificationType, EbayWebhookHandler>>
): (payload: string, signature: string, secret: string) => Promise<void> {
  return async (payload: string, signature: string, secret: string) => {
    if (!verifyEbayWebhook(payload, signature, secret)) {
      throw new Error("Invalid eBay webhook signature");
    }

    const notification = parseEbayNotification(payload);
    const handler = handlers[notification.metadata.topic];

    if (handler) {
      await handler(notification);
    }
  };
}

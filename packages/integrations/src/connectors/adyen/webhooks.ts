import { createHmac } from "node:crypto";
import type { AdyenWebhookPayload, AdyenNotificationItem } from "./types.js";

/**
 * Adyen webhook signature verification and parsing.
 *
 * Adyen signs webhook notifications using HMAC-SHA256 with a hex-encoded key.
 * The signature is computed over a concatenation of specific notification fields.
 * The HMAC key is configured in the Adyen Customer Area under Webhooks settings.
 */

/**
 * Verify an Adyen webhook HMAC signature.
 *
 * The signed payload is built by concatenating specific fields from the notification
 * in a defined order, separated by colons.
 *
 * @param hmacKey - The HMAC key from Adyen Customer Area (hex-encoded)
 * @param notification - A single NotificationRequestItem
 * @returns true if the HMAC signature matches
 */
export function verifyAdyenWebhook(
  hmacKey: string,
  notification: AdyenNotificationItem
): boolean {
  try {
    const item = notification.NotificationRequestItem;
    const providedHmac = item.additionalData?.["hmacSignature"];
    if (!providedHmac) return false;

    const signedPayload = [
      item.pspReference,
      item.originalReference ?? "",
      item.merchantAccountCode,
      item.merchantReference,
      item.amount.value,
      item.amount.currency,
      item.eventCode,
      item.success,
    ].join(":");

    const keyBuffer = Buffer.from(hmacKey, "hex");
    const expectedHmac = createHmac("sha256", keyBuffer)
      .update(signedPayload, "utf-8")
      .digest("base64");

    return expectedHmac === providedHmac;
  } catch {
    return false;
  }
}

/**
 * Parse an Adyen webhook payload.
 *
 * @param rawBody - The raw JSON request body string
 * @returns Parsed webhook payload with notification items
 */
export function parseAdyenWebhookPayload(
  rawBody: string
): AdyenWebhookPayload {
  const parsed = JSON.parse(rawBody) as AdyenWebhookPayload;
  if (!parsed.notificationItems || !Array.isArray(parsed.notificationItems)) {
    throw new Error("Invalid Adyen webhook payload: missing notificationItems");
  }
  return parsed;
}

/**
 * Verify all notification items in a webhook payload.
 *
 * @param hmacKey - The HMAC key from Adyen Customer Area (hex-encoded)
 * @param payload - The parsed webhook payload
 * @returns true if all notification items have valid signatures
 */
export function verifyAdyenWebhookPayload(
  hmacKey: string,
  payload: AdyenWebhookPayload
): boolean {
  return payload.notificationItems.every((item) =>
    verifyAdyenWebhook(hmacKey, item)
  );
}

/**
 * Extract the standard headers Adyen sends with webhooks.
 */
export interface AdyenWebhookHeaders {
  contentType: string;
}

export function extractAdyenWebhookHeaders(
  headers: Record<string, string | string[] | undefined>
): AdyenWebhookHeaders {
  const ct = headers["content-type"] ?? headers["Content-Type"];
  return {
    contentType: Array.isArray(ct) ? ct[0] ?? "" : ct ?? "",
  };
}

import { createHmac, timingSafeEqual } from "node:crypto";
import type { MailgunWebhookPayload, MailgunEvent } from "./types.js";

/**
 * Mailgun Webhook verification and parsing.
 *
 * Mailgun signs webhooks using HMAC-SHA256 with the webhook signing key.
 * The signature is computed over: timestamp + token.
 */

/**
 * Verify a Mailgun webhook signature.
 *
 * @param signingKey - The Webhook Signing Key from Mailgun (HTTP webhook signing key)
 * @param timestamp - The `timestamp` field from the signature object
 * @param token - The `token` field from the signature object
 * @param signature - The `signature` field from the signature object
 * @returns true if the signature is valid
 */
export function verifyMailgunWebhook(
  signingKey: string,
  timestamp: string,
  token: string,
  signature: string
): boolean {
  try {
    const encodedToken = createHmac("sha256", signingKey)
      .update(timestamp + token)
      .digest("hex");

    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(encodedToken, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Verify a Mailgun webhook payload using the embedded signature object.
 *
 * @param signingKey - The Webhook Signing Key from Mailgun
 * @param payload - The parsed webhook payload
 * @returns true if the signature is valid
 */
export function verifyMailgunWebhookPayload(
  signingKey: string,
  payload: MailgunWebhookPayload
): boolean {
  const { timestamp, token, signature } = payload.signature;
  return verifyMailgunWebhook(signingKey, timestamp, token, signature);
}

/**
 * Parse a Mailgun webhook payload from a raw JSON body.
 *
 * @param rawBody - The raw request body string
 * @returns Parsed webhook payload
 */
export function parseMailgunWebhookPayload(
  rawBody: string
): MailgunWebhookPayload {
  const parsed = JSON.parse(rawBody) as MailgunWebhookPayload;

  if (!parsed.signature || !parsed["event-data"]) {
    throw new Error(
      "Invalid Mailgun webhook payload: missing signature or event-data"
    );
  }

  return parsed;
}

/**
 * Extract the event data from a Mailgun webhook payload.
 *
 * @param payload - The parsed webhook payload
 * @returns The event data
 */
export function extractMailgunEvent(
  payload: MailgunWebhookPayload
): MailgunEvent {
  return payload["event-data"];
}

/**
 * Check if a Mailgun webhook timestamp is within acceptable tolerance.
 * Prevents replay attacks.
 *
 * @param timestamp - The timestamp string from the webhook signature
 * @param toleranceSeconds - Maximum age in seconds (default: 300 = 5 minutes)
 * @returns true if the timestamp is within tolerance
 */
export function isMailgunWebhookTimestampValid(
  timestamp: string,
  toleranceSeconds = 300
): boolean {
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;

  const age = Math.abs(Date.now() / 1000 - ts);
  return age <= toleranceSeconds;
}

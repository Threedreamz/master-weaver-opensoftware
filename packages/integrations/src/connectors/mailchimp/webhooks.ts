import { createHmac, timingSafeEqual } from "node:crypto";
import type { MailchimpWebhookEvent, MailchimpWebhookEventType } from "./types.js";

export interface MailchimpWebhookConfig {
  /** Secret key configured in Mailchimp webhook settings. */
  secret: string;
}

/**
 * Verify a Mailchimp webhook request.
 *
 * Mailchimp webhook verification uses an HMAC-SHA1 signature sent in the
 * `X-Mailchimp-Signature` header. The signature is a Base64-encoded HMAC
 * of the raw request body using the webhook secret key.
 */
export function verifyMailchimpWebhook(
  rawBody: string,
  signature: string,
  config: MailchimpWebhookConfig
): boolean {
  if (!signature || !config.secret) return false;

  const expectedSignature = createHmac("sha1", config.secret)
    .update(rawBody)
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
 * Parse a Mailchimp webhook payload from the POST body.
 *
 * Mailchimp sends webhooks as `application/x-www-form-urlencoded` data.
 * The "type" field indicates the event type, and "data" contains the event details.
 * The "fired_at" field contains the timestamp.
 */
export function parseMailchimpWebhook(
  body: Record<string, unknown>
): MailchimpWebhookEvent {
  const type = body.type as MailchimpWebhookEventType | undefined;
  if (!type) {
    throw new Error("Missing 'type' field in Mailchimp webhook payload");
  }

  const firedAt = (body.fired_at as string) ?? new Date().toISOString();

  // Mailchimp sends "data[email]", "data[list_id]" etc. as flat keys.
  // If the body has been pre-parsed into a nested object, use it directly.
  // Otherwise, extract data fields from flat key format.
  let data: Record<string, unknown>;
  if (body.data && typeof body.data === "object") {
    data = body.data as Record<string, unknown>;
  } else {
    data = {};
    for (const [key, value] of Object.entries(body)) {
      if (key.startsWith("data[")) {
        const fieldName = key.slice(5, -1); // extract "email" from "data[email]"
        data[fieldName] = value;
      }
    }
  }

  return {
    type,
    fired_at: firedAt,
    data,
  };
}

/** Type guard for supported Mailchimp webhook event types. */
export function isMailchimpWebhookEventType(
  type: string
): type is MailchimpWebhookEventType {
  const validTypes: MailchimpWebhookEventType[] = [
    "subscribe",
    "unsubscribe",
    "profile",
    "upemail",
    "cleaned",
    "campaign",
  ];
  return validTypes.includes(type as MailchimpWebhookEventType);
}

/**
 * Handle Mailchimp's webhook URL verification request.
 *
 * When you register a webhook URL, Mailchimp sends a GET request to verify it.
 * You must respond with a 200 status and an empty body.
 */
export function handleMailchimpWebhookVerification(): {
  status: number;
  body: string;
} {
  return { status: 200, body: "" };
}

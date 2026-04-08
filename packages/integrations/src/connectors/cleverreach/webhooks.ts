import { createHmac, timingSafeEqual } from "node:crypto";
import type { CleverReachWebhookPayload, CleverReachWebhookEventType } from "./types.js";

export interface CleverReachWebhookConfig {
  /** Shared secret configured when registering the webhook. */
  secret: string;
}

/**
 * Verify a CleverReach webhook request.
 *
 * CleverReach sends a `X-CR-Calltoken` header containing an HMAC-SHA256
 * signature of the raw request body using the shared secret.
 */
export function verifyCleverReachWebhook(
  rawBody: string,
  callToken: string,
  config: CleverReachWebhookConfig
): boolean {
  if (!callToken || !config.secret) return false;

  const expectedToken = createHmac("sha256", config.secret)
    .update(rawBody)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(callToken, "hex"),
      Buffer.from(expectedToken, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Parse a CleverReach webhook payload from the JSON body.
 *
 * CleverReach webhooks are sent as JSON POST requests with the following structure:
 * - `event`: The event type (e.g., "receiver.subscribed")
 * - `group_id`: The group ID the event relates to (optional)
 * - `payload`: An object with event-specific data
 */
export function parseCleverReachWebhook(
  body: Record<string, unknown>
): CleverReachWebhookPayload {
  const event = body.event as CleverReachWebhookEventType | undefined;
  if (!event) {
    throw new Error("Missing 'event' field in CleverReach webhook payload");
  }

  return {
    event,
    group_id: body.group_id as number | undefined,
    payload: (body.payload as CleverReachWebhookPayload["payload"]) ?? {},
  };
}

/** Type guard for supported CleverReach webhook event types. */
export function isCleverReachWebhookEventType(
  type: string
): type is CleverReachWebhookEventType {
  const validTypes: CleverReachWebhookEventType[] = [
    "receiver.subscribed",
    "receiver.unsubscribed",
    "receiver.activated",
    "receiver.deactivated",
    "mailing.sent",
    "mailing.finished",
    "form.submitted",
  ];
  return validTypes.includes(type as CleverReachWebhookEventType);
}

/**
 * Handle CleverReach's webhook verification (challenge-response).
 *
 * When registering a webhook, CleverReach sends a GET request with a
 * `secret` query parameter. Respond with the secret as plain text to verify.
 */
export function handleCleverReachWebhookVerification(secret: string): {
  status: number;
  body: string;
  headers: Record<string, string>;
} {
  return {
    status: 200,
    body: secret,
    headers: { "Content-Type": "text/plain" },
  };
}

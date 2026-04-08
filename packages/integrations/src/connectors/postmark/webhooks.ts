import { createHmac, timingSafeEqual } from "node:crypto";
import type { PostmarkWebhookEvent } from "./types.js";

/**
 * Postmark Webhook verification and parsing.
 *
 * Postmark uses basic auth or a custom webhook password for authentication.
 * For newer integrations, Postmark can also use HMAC-SHA256 signature verification
 * via a custom header.
 *
 * Additionally, Postmark sends a custom header to identify the webhook type.
 */

/**
 * Verify a Postmark webhook using HTTP Basic Auth credentials.
 *
 * When configuring a Postmark webhook, you can set a username/password.
 * The webhook request includes an Authorization header with Basic auth.
 *
 * @param authHeader - The Authorization header value from the request
 * @param expectedUsername - The expected webhook username
 * @param expectedPassword - The expected webhook password
 * @returns true if credentials match
 */
export function verifyPostmarkWebhookBasicAuth(
  authHeader: string,
  expectedUsername: string,
  expectedPassword: string
): boolean {
  try {
    if (!authHeader.startsWith("Basic ")) return false;

    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
    const [username, password] = decoded.split(":");

    if (!username || !password) return false;

    const usernameMatch = timingSafeEqual(
      Buffer.from(username),
      Buffer.from(expectedUsername)
    );
    const passwordMatch = timingSafeEqual(
      Buffer.from(password),
      Buffer.from(expectedPassword)
    );

    return usernameMatch && passwordMatch;
  } catch {
    return false;
  }
}

/**
 * Verify a Postmark webhook using HMAC-SHA256 signature.
 *
 * Some Postmark webhook configurations support signing the payload
 * with a shared secret.
 *
 * @param secret - The webhook secret
 * @param payload - The raw request body as a string
 * @param signature - The signature header value
 * @returns true if the signature is valid
 */
export function verifyPostmarkWebhookSignature(
  secret: string,
  payload: string,
  signature: string
): boolean {
  try {
    const expectedSignature = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Parse a Postmark webhook payload from a raw JSON body.
 *
 * Postmark sends individual events (not batched) as JSON objects.
 *
 * @param rawBody - The raw request body string
 * @returns Parsed webhook event
 */
export function parsePostmarkWebhookEvent(
  rawBody: string
): PostmarkWebhookEvent {
  const parsed = JSON.parse(rawBody) as PostmarkWebhookEvent;

  if (!("RecordType" in parsed)) {
    throw new Error(
      "Invalid Postmark webhook payload: missing RecordType field"
    );
  }

  return parsed;
}

/**
 * Determine the webhook event type from a Postmark payload.
 *
 * @param event - The parsed webhook event
 * @returns The record type string
 */
export function getPostmarkWebhookType(
  event: PostmarkWebhookEvent
): string {
  return event.RecordType;
}

import type { BrevoWebhookEvent } from "./types.js";

/**
 * Brevo Webhook parsing and validation.
 *
 * Brevo webhooks do not use cryptographic signatures for verification.
 * Instead, they recommend:
 * 1. Verifying the source IP (Brevo's IP ranges)
 * 2. Using a secret token in the webhook URL path
 * 3. Checking the payload structure
 *
 * For security, always use HTTPS endpoints and validate the expected payload shape.
 */

/** Known Brevo webhook sending IP ranges (as of 2025). */
const BREVO_WEBHOOK_IPS = [
  "1.179.112.0/20",
  "185.107.232.0/24",
] as const;

/**
 * Verify a Brevo webhook by checking a secret token embedded in the URL.
 *
 * Best practice: append a secret token to your webhook URL as a query parameter
 * or path segment, then verify it here.
 *
 * @param providedToken - The token extracted from the webhook URL
 * @param expectedToken - Your expected secret token
 * @returns true if tokens match
 */
export function verifyBrevoWebhookToken(
  providedToken: string,
  expectedToken: string
): boolean {
  if (!providedToken || !expectedToken) return false;
  // Use constant-time comparison for the token
  if (providedToken.length !== expectedToken.length) return false;

  let result = 0;
  for (let i = 0; i < providedToken.length; i++) {
    result |= providedToken.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validate that an IP address falls within Brevo's known webhook IP ranges.
 *
 * Note: IP ranges may change. Always refer to Brevo's documentation for the latest ranges.
 *
 * @param ip - The source IP address from the request
 * @returns true if the IP matches a known Brevo range
 */
export function isBrevoWebhookIP(ip: string): boolean {
  // Simple check for known Brevo IPs. For production use, implement proper CIDR matching.
  for (const range of BREVO_WEBHOOK_IPS) {
    const [network] = range.split("/");
    if (ip.startsWith(network!.split(".").slice(0, 2).join("."))) {
      return true;
    }
  }
  return false;
}

/**
 * Parse a Brevo webhook payload from a raw JSON body.
 *
 * Brevo sends individual events as JSON objects.
 *
 * @param rawBody - The raw request body string
 * @returns Parsed webhook event
 */
export function parseBrevoWebhookEvent(rawBody: string): BrevoWebhookEvent {
  const parsed = JSON.parse(rawBody) as BrevoWebhookEvent;

  if (!parsed.event || !parsed.email) {
    throw new Error(
      "Invalid Brevo webhook payload: missing event or email field"
    );
  }

  return parsed;
}

/**
 * Parse a batch of Brevo webhook events.
 *
 * Some Brevo webhook configurations may send events as an array.
 *
 * @param rawBody - The raw request body string
 * @returns Array of parsed webhook events
 */
export function parseBrevoWebhookEvents(rawBody: string): BrevoWebhookEvent[] {
  const parsed = JSON.parse(rawBody);

  if (Array.isArray(parsed)) {
    return parsed as BrevoWebhookEvent[];
  }

  // Single event — wrap in array
  return [parsed as BrevoWebhookEvent];
}

/**
 * Check if a Brevo webhook event indicates a delivery failure.
 *
 * @param event - The parsed webhook event
 * @returns true if the event represents a bounce, block, or error
 */
export function isBrevoDeliveryFailure(event: BrevoWebhookEvent): boolean {
  return [
    "soft_bounce",
    "hard_bounce",
    "invalid_email",
    "blocked",
    "error",
  ].includes(event.event);
}

/**
 * Check if a Brevo webhook event indicates engagement.
 *
 * @param event - The parsed webhook event
 * @returns true if the event represents an open, click, or similar engagement
 */
export function isBrevoEngagementEvent(event: BrevoWebhookEvent): boolean {
  return ["opened", "unique_opened", "click"].includes(event.event);
}

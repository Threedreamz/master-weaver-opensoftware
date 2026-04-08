import { createHmac, timingSafeEqual } from "node:crypto";
import type { ResendWebhookEvent } from "./types.js";

/**
 * Resend Webhook verification and parsing.
 *
 * Resend uses Svix under the hood for webhook delivery.
 * Webhooks are signed using HMAC-SHA256 with the webhook secret.
 *
 * Headers:
 * - `svix-id`: Unique message ID
 * - `svix-timestamp`: Unix timestamp (seconds)
 * - `svix-signature`: Comma-separated list of versioned signatures (v1,xxx)
 */

/**
 * Verify a Resend webhook signature (Svix-based).
 *
 * @param secret - The webhook signing secret (whsec_xxx format)
 * @param payload - The raw request body string
 * @param svixId - The `svix-id` header value
 * @param svixTimestamp - The `svix-timestamp` header value
 * @param svixSignature - The `svix-signature` header value
 * @param toleranceSeconds - Max age of the webhook (default: 300s)
 * @returns true if the signature is valid
 */
export function verifyResendWebhook(
  secret: string,
  payload: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  toleranceSeconds = 300
): boolean {
  try {
    // Check timestamp tolerance
    const ts = parseInt(svixTimestamp, 10);
    if (isNaN(ts)) return false;
    const age = Math.abs(Date.now() / 1000 - ts);
    if (age > toleranceSeconds) return false;

    // Decode the secret (strip whsec_ prefix, base64-decode)
    let secretBytes: Buffer;
    if (secret.startsWith("whsec_")) {
      secretBytes = Buffer.from(secret.slice(6), "base64");
    } else {
      secretBytes = Buffer.from(secret, "base64");
    }

    // Compute expected signature
    const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
    const expectedSignature = createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64");

    // Parse the signature header (may contain multiple versions)
    const signatures = svixSignature
      .split(" ")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const versionedSig of signatures) {
      const [version, sig] = versionedSig.split(",", 2);
      if (version !== "v1" || !sig) continue;

      try {
        const isValid = timingSafeEqual(
          Buffer.from(sig, "base64"),
          Buffer.from(expectedSignature, "base64")
        );
        if (isValid) return true;
      } catch {
        // Length mismatch, continue to next
        continue;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Parse a Resend webhook payload from a raw JSON body.
 *
 * @param rawBody - The raw request body string
 * @returns Parsed webhook event
 */
export function parseResendWebhookEvent(rawBody: string): ResendWebhookEvent {
  const parsed = JSON.parse(rawBody) as ResendWebhookEvent;

  if (!parsed.type || !parsed.data) {
    throw new Error("Invalid Resend webhook payload: missing type or data");
  }

  return parsed;
}

/**
 * Extract Svix webhook headers from an incoming request.
 */
export interface ResendWebhookHeaders {
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
}

export function extractResendWebhookHeaders(
  headers: Record<string, string | string[] | undefined>
): ResendWebhookHeaders {
  return {
    svixId: getHeader(headers, "svix-id") ?? "",
    svixTimestamp: getHeader(headers, "svix-timestamp") ?? "",
    svixSignature: getHeader(headers, "svix-signature") ?? "",
  };
}

function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

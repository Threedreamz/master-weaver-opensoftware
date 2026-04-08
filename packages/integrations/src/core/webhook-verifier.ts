import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookConfig } from "./types";

/**
 * Verify the signature of an incoming webhook request.
 *
 * Supports HMAC-SHA256, HMAC-SHA1, and HMAC-SHA512.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  config: WebhookConfig
): boolean {
  const algorithm = config.signatureAlgorithm.replace("hmac-", "");
  const expectedSignature = createHmac(algorithm, config.secret)
    .update(payload)
    .digest("hex");

  // Some providers prefix the signature (e.g., "sha256=...")
  const cleanSignature = signature.replace(/^(sha256|sha1|sha512)=/, "");

  try {
    return timingSafeEqual(
      Buffer.from(cleanSignature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    // Lengths don't match
    return false;
  }
}

/**
 * Verify a Stripe-style signature (v1=..., t=...).
 */
export function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300
): boolean {
  const elements = signatureHeader.split(",");
  const timestamp = elements.find((e) => e.startsWith("t="))?.slice(2);
  const signatures = elements
    .filter((e) => e.startsWith("v1="))
    .map((e) => e.slice(3));

  if (!timestamp || signatures.length === 0) return false;

  // Check timestamp tolerance
  const ts = parseInt(timestamp, 10);
  const age = Math.abs(Date.now() / 1000 - ts);
  if (age > toleranceSeconds) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return signatures.some((sig) => {
    try {
      return timingSafeEqual(
        Buffer.from(sig, "hex"),
        Buffer.from(expectedSignature, "hex")
      );
    } catch {
      return false;
    }
  });
}

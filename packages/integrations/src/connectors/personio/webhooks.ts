import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  PersonioWebhookEvent,
  PersonioWebhookEventType,
} from "./types.js";

export interface PersonioWebhookConfig {
  /** Shared secret configured in Personio webhook settings */
  secret: string;
}

/**
 * Verify a Personio webhook signature.
 *
 * Personio signs payloads with HMAC-SHA256 and sends the signature
 * in the `X-Personio-Signature` header (hex-encoded).
 */
export function verifyPersonioWebhook(
  payload: string | Buffer,
  signature: string,
  config: PersonioWebhookConfig,
): boolean {
  const expected = createHmac("sha256", config.secret)
    .update(payload)
    .digest("hex");

  const cleanSignature = signature.replace(/^sha256=/, "");

  try {
    return timingSafeEqual(
      Buffer.from(cleanSignature, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Parse and validate a raw Personio webhook payload.
 *
 * Returns a typed `PersonioWebhookEvent` or throws if the payload
 * is malformed.
 */
export function parsePersonioWebhook(rawBody: string): PersonioWebhookEvent {
  const parsed = JSON.parse(rawBody) as Record<string, unknown>;

  if (!parsed.event || typeof parsed.event !== "string") {
    throw new Error("Invalid Personio webhook payload: missing 'event' field");
  }

  return {
    event: parsed.event as PersonioWebhookEventType,
    triggered_at: (parsed.triggered_at as string) ?? new Date().toISOString(),
    data: (parsed.data as Record<string, unknown>) ?? {},
  };
}

/**
 * Convenience: verify + parse in one step.
 *
 * Returns `null` if the signature is invalid.
 */
export function handlePersonioWebhook(
  rawBody: string,
  signature: string,
  config: PersonioWebhookConfig,
): PersonioWebhookEvent | null {
  if (!verifyPersonioWebhook(rawBody, signature, config)) {
    return null;
  }
  return parsePersonioWebhook(rawBody);
}

import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  BambooHRWebhookEvent,
  BambooHRWebhookEventType,
} from "./types.js";

export interface BambooHRWebhookConfig {
  /**
   * Shared secret from BambooHR webhook configuration.
   * BambooHR uses this to sign payloads with HMAC-SHA256.
   */
  secret: string;
}

/**
 * Verify a BambooHR webhook signature.
 *
 * BambooHR sends the signature in the `X-BambooHR-Signature` header
 * as a hex-encoded HMAC-SHA256 digest.
 */
export function verifyBambooHRWebhook(
  payload: string | Buffer,
  signature: string,
  config: BambooHRWebhookConfig,
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
 * Parse and validate a raw BambooHR webhook payload.
 *
 * Returns a typed `BambooHRWebhookEvent` or throws if the payload
 * is malformed.
 */
export function parseBambooHRWebhook(rawBody: string): BambooHRWebhookEvent {
  const parsed = JSON.parse(rawBody) as Record<string, unknown>;

  if (!parsed.type || typeof parsed.type !== "string") {
    throw new Error("Invalid BambooHR webhook payload: missing 'type' field");
  }
  if (!parsed.employeeId) {
    throw new Error("Invalid BambooHR webhook payload: missing 'employeeId' field");
  }

  return {
    id: (parsed.id as string) ?? "",
    webhookId: (parsed.webhookId as string) ?? "",
    employeeId: String(parsed.employeeId),
    type: parsed.type as BambooHRWebhookEventType,
    changedFields: (parsed.changedFields as Record<string, { old: unknown; new: unknown }>) ?? {},
    timestamp: (parsed.timestamp as string) ?? new Date().toISOString(),
  };
}

/**
 * Convenience: verify + parse in one step.
 *
 * Returns `null` if the signature is invalid.
 */
export function handleBambooHRWebhook(
  rawBody: string,
  signature: string,
  config: BambooHRWebhookConfig,
): BambooHRWebhookEvent | null {
  if (!verifyBambooHRWebhook(rawBody, signature, config)) {
    return null;
  }
  return parseBambooHRWebhook(rawBody);
}

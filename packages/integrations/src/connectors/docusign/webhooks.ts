import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  DocuSignConnectEvent,
  DocuSignWebhookEventType,
  DocuSignEnvelopeStatus,
} from "./types.js";

// ==================== DocuSign Connect Webhook Handler ====================

export interface DocuSignWebhookConfig {
  /** HMAC secret key configured in DocuSign Connect */
  hmacSecretKey: string;
}

export interface DocuSignWebhookResult {
  /** Whether the signature was valid */
  verified: boolean;
  /** Parsed event data (only if verified) */
  event?: DocuSignConnectEvent;
  /** Event type extracted from the payload */
  eventType?: DocuSignWebhookEventType;
  /** Envelope ID from the event */
  envelopeId?: string;
  /** Envelope status */
  envelopeStatus?: DocuSignEnvelopeStatus;
}

/**
 * Verify a DocuSign Connect webhook HMAC signature.
 *
 * DocuSign Connect sends HMAC-SHA256 signatures in the following headers:
 * - `x-docusign-signature-1` (primary)
 * - `x-docusign-signature-2` (optional, secondary)
 *
 * The signature is Base64-encoded HMAC-SHA256 of the raw request body.
 *
 * @see https://developers.docusign.com/platform/webhooks/connect/hmac/
 */
export function verifyDocuSignWebhook(
  payload: string | Buffer,
  signatureHeader: string,
  config: DocuSignWebhookConfig
): boolean {
  if (!signatureHeader || !config.hmacSecretKey) {
    return false;
  }

  const computedHmac = createHmac("sha256", config.hmacSecretKey)
    .update(payload)
    .digest("base64");

  try {
    return timingSafeEqual(
      Buffer.from(signatureHeader, "base64"),
      Buffer.from(computedHmac, "base64")
    );
  } catch {
    return false;
  }
}

/**
 * Parse and verify an incoming DocuSign Connect webhook request.
 *
 * @param payload - Raw request body (string or Buffer)
 * @param signatureHeader - Value of the `x-docusign-signature-1` header
 * @param config - Webhook configuration with HMAC secret
 * @returns Parsed and verified webhook result
 */
export function parseDocuSignWebhook(
  payload: string | Buffer,
  signatureHeader: string,
  config: DocuSignWebhookConfig
): DocuSignWebhookResult {
  const verified = verifyDocuSignWebhook(payload, signatureHeader, config);

  if (!verified) {
    return { verified: false };
  }

  try {
    const body = typeof payload === "string" ? payload : payload.toString("utf-8");
    const event = JSON.parse(body) as DocuSignConnectEvent;

    return {
      verified: true,
      event,
      eventType: event.event as DocuSignWebhookEventType,
      envelopeId: event.data?.envelopeId,
      envelopeStatus: event.data?.envelopeSummary?.status,
    };
  } catch {
    return { verified: true };
  }
}

/**
 * Determine which events to subscribe to for a DocuSign Connect configuration.
 * Returns commonly used event types for legal document workflows.
 */
export function getDefaultConnectEvents(): {
  envelopeEvents: DocuSignWebhookEventType[];
  recipientEvents: DocuSignWebhookEventType[];
} {
  return {
    envelopeEvents: [
      "envelope-sent",
      "envelope-delivered",
      "envelope-completed",
      "envelope-declined",
      "envelope-voided",
    ],
    recipientEvents: [
      "recipient-sent",
      "recipient-delivered",
      "recipient-completed",
      "recipient-declined",
      "recipient-authenticationfailed",
    ],
  };
}

/**
 * Check if a Connect event represents a terminal envelope state.
 */
export function isTerminalEnvelopeEvent(eventType: DocuSignWebhookEventType): boolean {
  const terminalEvents: DocuSignWebhookEventType[] = [
    "envelope-completed",
    "envelope-declined",
    "envelope-voided",
    "envelope-deleted",
    "envelope-purge",
  ];
  return terminalEvents.includes(eventType);
}

/**
 * Map a DocuSign Connect event type to a normalized event category.
 */
export function categorizeWebhookEvent(
  eventType: DocuSignWebhookEventType
): "envelope" | "recipient" | "unknown" {
  if (eventType.startsWith("envelope-")) return "envelope";
  if (eventType.startsWith("recipient-")) return "recipient";
  return "unknown";
}

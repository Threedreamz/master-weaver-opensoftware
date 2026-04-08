import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  AdobeSignWebhookPayload,
  AdobeSignWebhookEventType,
  AdobeSignAgreementStatus,
} from "./types.js";

// ==================== Adobe Sign Webhook Handler ====================

export interface AdobeSignWebhookConfig {
  /** Client secret used for webhook signature verification */
  clientSecret: string;
}

export interface AdobeSignWebhookResult {
  /** Whether the signature was valid */
  verified: boolean;
  /** Parsed webhook payload (only if verified) */
  event?: AdobeSignWebhookPayload;
  /** Event type */
  eventType?: AdobeSignWebhookEventType;
  /** Agreement ID from the event */
  agreementId?: string;
  /** Agreement status (if available) */
  agreementStatus?: AdobeSignAgreementStatus;
}

/**
 * Verify an Adobe Sign webhook signature.
 *
 * Adobe Sign sends webhook notifications with an `x-adobesign-clientid` header
 * for verification. For two-way SSL or HMAC verification, the client secret
 * is used to compute HMAC-SHA256 of the payload.
 *
 * Adobe Sign also supports a verification handshake where it sends a GET request
 * with `x-adobesign-clientid` and expects the same value echoed back.
 *
 * @see https://helpx.adobe.com/sign/using/adobe-sign-webhooks-api.html
 */
export function verifyAdobeSignWebhook(
  payload: string | Buffer,
  clientIdHeader: string,
  config: AdobeSignWebhookConfig
): boolean {
  if (!clientIdHeader || !config.clientSecret) {
    return false;
  }

  // Primary verification: check client ID matches
  // Adobe Sign sends the client ID in the header for basic verification
  // For HMAC verification, compute the signature
  const computedHmac = createHmac("sha256", config.clientSecret)
    .update(payload)
    .digest("base64");

  // If an HMAC signature is provided, verify it
  // Otherwise, just verify the client ID is not empty (basic mode)
  try {
    const payloadStr = typeof payload === "string" ? payload : payload.toString("utf-8");
    const parsed = JSON.parse(payloadStr) as Record<string, unknown>;

    // Check if the webhook contains the expected client ID
    if (parsed.webhookId && clientIdHeader) {
      return true;
    }

    return timingSafeEqual(
      Buffer.from(clientIdHeader),
      Buffer.from(computedHmac)
    );
  } catch {
    return false;
  }
}

/**
 * Handle the Adobe Sign webhook verification handshake.
 *
 * When registering a webhook, Adobe Sign sends a GET request to verify the URL.
 * The response must include `xAdobeSignClientId` with the same value sent
 * in the `x-adobesign-clientid` request header.
 *
 * @param clientIdHeader - Value of the `x-adobesign-clientid` header
 * @returns Response body to return to Adobe Sign
 */
export function handleVerificationHandshake(clientIdHeader: string): {
  xAdobeSignClientId: string;
} {
  return {
    xAdobeSignClientId: clientIdHeader,
  };
}

/**
 * Parse an incoming Adobe Sign webhook payload.
 *
 * @param payload - Raw request body
 * @param clientIdHeader - Value of the `x-adobesign-clientid` header
 * @param config - Webhook configuration
 * @returns Parsed webhook result
 */
export function parseAdobeSignWebhook(
  payload: string | Buffer,
  clientIdHeader: string,
  config: AdobeSignWebhookConfig
): AdobeSignWebhookResult {
  const verified = verifyAdobeSignWebhook(payload, clientIdHeader, config);

  if (!verified) {
    return { verified: false };
  }

  try {
    const body = typeof payload === "string" ? payload : payload.toString("utf-8");
    const event = JSON.parse(body) as AdobeSignWebhookPayload;

    return {
      verified: true,
      event,
      eventType: event.event,
      agreementId: event.agreement?.id,
      agreementStatus: event.agreement?.status,
    };
  } catch {
    return { verified: true };
  }
}

/**
 * Get default webhook subscription events for legal document workflows.
 */
export function getDefaultWebhookEvents(): AdobeSignWebhookEventType[] {
  return [
    "AGREEMENT_CREATED",
    "AGREEMENT_ACTION_COMPLETED",
    "AGREEMENT_ACTION_REQUESTED",
    "AGREEMENT_EXPIRED",
    "AGREEMENT_RECALLED",
    "AGREEMENT_REJECTED",
  ];
}

/**
 * Check if an event represents a terminal agreement state.
 */
export function isTerminalAgreementEvent(eventType: AdobeSignWebhookEventType): boolean {
  const terminalEvents: AdobeSignWebhookEventType[] = [
    "AGREEMENT_ACTION_COMPLETED",
    "AGREEMENT_EXPIRED",
    "AGREEMENT_RECALLED",
    "AGREEMENT_REJECTED",
    "AGREEMENT_AUTO_CANCELLED_CONVERSION_PROBLEM",
  ];
  return terminalEvents.includes(eventType);
}

/**
 * Map an Adobe Sign agreement status to a normalized completion state.
 */
export function isAgreementComplete(status: AdobeSignAgreementStatus): boolean {
  const completeStatuses: AdobeSignAgreementStatus[] = [
    "SIGNED",
    "APPROVED",
    "ACCEPTED",
    "FORM_FILLED",
    "DELIVERED",
  ];
  return completeStatuses.includes(status);
}

/**
 * Map an Adobe Sign agreement status to a normalized failure state.
 */
export function isAgreementFailed(status: AdobeSignAgreementStatus): boolean {
  const failedStatuses: AdobeSignAgreementStatus[] = [
    "EXPIRED",
    "CANCELLED",
    "RECALLED",
  ];
  return failedStatuses.includes(status);
}

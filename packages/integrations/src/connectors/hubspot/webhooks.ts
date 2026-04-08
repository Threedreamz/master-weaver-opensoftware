import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { HubSpotWebhookEvent, HubSpotWebhookSubscriptionType } from "./types.js";

export interface HubSpotWebhookConfig {
  /** HubSpot app's client secret, used to verify webhook signatures. */
  clientSecret: string;
}

/**
 * Verify a HubSpot webhook request signature.
 *
 * HubSpot signs webhook payloads using the v3 signature method:
 * 1. Concatenate: requestMethod + requestUri + requestBody + timestamp
 * 2. Compute HMAC-SHA256 using the app's client secret
 * 3. Compare with the `X-HubSpot-Signature-v3` header
 *
 * Also validates the timestamp is within the tolerance window (5 minutes)
 * to prevent replay attacks.
 *
 * @see https://developers.hubspot.com/docs/api/webhooks#security
 */
export function verifyHubSpotWebhook(
  requestMethod: string,
  requestUri: string,
  rawBody: string,
  signatureHeader: string,
  timestampHeader: string,
  config: HubSpotWebhookConfig,
  toleranceMs = 300_000
): boolean {
  if (!signatureHeader || !timestampHeader || !config.clientSecret) return false;

  // Validate timestamp to prevent replay attacks
  const timestamp = parseInt(timestampHeader, 10);
  if (isNaN(timestamp)) return false;

  const now = Date.now();
  if (Math.abs(now - timestamp) > toleranceMs) return false;

  // v3 signature: HMAC-SHA256(clientSecret, method + uri + body + timestamp)
  const sourceString =
    requestMethod.toUpperCase() + requestUri + rawBody + timestampHeader;

  const expectedSignature = createHmac("sha256", config.clientSecret)
    .update(sourceString)
    .digest("base64");

  try {
    return timingSafeEqual(
      Buffer.from(signatureHeader, "base64"),
      Buffer.from(expectedSignature, "base64")
    );
  } catch {
    return false;
  }
}

/**
 * Verify a HubSpot webhook using the legacy v1 signature method.
 *
 * v1 signature: SHA-256(clientSecret + requestBody)
 * Sent in the `X-HubSpot-Signature` header.
 *
 * Use this for older webhook subscriptions that haven't been migrated to v3.
 */
export function verifyHubSpotWebhookV1(
  rawBody: string,
  signatureHeader: string,
  config: HubSpotWebhookConfig
): boolean {
  if (!signatureHeader || !config.clientSecret) return false;

  // v1 uses a plain SHA-256 hash (not HMAC)
  const sourceString = config.clientSecret + rawBody;
  const expected = createHash("sha256").update(sourceString).digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signatureHeader, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Parse HubSpot webhook events from the request body.
 *
 * HubSpot sends an array of events in each webhook request.
 * Each event contains the subscription type, object ID, and change details.
 */
export function parseHubSpotWebhookEvents(
  body: unknown
): HubSpotWebhookEvent[] {
  if (!Array.isArray(body)) {
    throw new Error("HubSpot webhook body must be an array of events");
  }

  return body.map((event: Record<string, unknown>) => ({
    eventId: event.eventId as number,
    subscriptionId: event.subscriptionId as number,
    portalId: event.portalId as number,
    appId: event.appId as number,
    occurredAt: event.occurredAt as number,
    subscriptionType: event.subscriptionType as HubSpotWebhookSubscriptionType,
    attemptNumber: event.attemptNumber as number,
    objectId: event.objectId as number,
    propertyName: event.propertyName as string | undefined,
    propertyValue: event.propertyValue as string | undefined,
    changeSource: event.changeSource as string | undefined,
    sourceId: event.sourceId as string | undefined,
  }));
}

/** Type guard for supported HubSpot webhook subscription types. */
export function isHubSpotWebhookSubscriptionType(
  type: string
): type is HubSpotWebhookSubscriptionType {
  const validTypes: HubSpotWebhookSubscriptionType[] = [
    "contact.creation",
    "contact.deletion",
    "contact.propertyChange",
    "contact.privacyDeletion",
    "company.creation",
    "company.deletion",
    "company.propertyChange",
    "deal.creation",
    "deal.deletion",
    "deal.propertyChange",
  ];
  return validTypes.includes(type as HubSpotWebhookSubscriptionType);
}

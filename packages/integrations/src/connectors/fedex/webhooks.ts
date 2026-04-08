import { createHmac, timingSafeEqual } from "node:crypto";
import type { FedExWebhookPayload, FedExWebhookEventType, FedExTrackingStatus } from "./types.js";

// ==================== FedEx Webhook Verification ====================

export interface FedExWebhookConfig {
  /** Webhook secret key from FedEx developer portal */
  secretKey: string;
  /** Maximum age of a webhook event in seconds (default: 300) */
  toleranceSeconds?: number;
}

/**
 * Verify the authenticity of an incoming FedEx webhook request.
 *
 * FedEx signs webhook payloads using HMAC-SHA512 with the secret key.
 * The signature is sent in the `x-fedex-signature` header.
 */
export function verifyFedExWebhook(
  payload: string | Buffer,
  signatureHeader: string,
  config: FedExWebhookConfig
): boolean {
  const expectedSignature = createHmac("sha512", config.secretKey)
    .update(payload)
    .digest("hex");

  const cleanSignature = signatureHeader.replace(/^sha512=/, "");

  try {
    return timingSafeEqual(
      Buffer.from(cleanSignature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Parse a raw FedEx webhook payload into a typed event object.
 */
export function parseFedExWebhookPayload(rawBody: string): FedExWebhookPayload {
  const body = JSON.parse(rawBody) as Record<string, unknown>;

  const eventType = mapFedExEventType(body);
  const trackingNumber = extractTrackingNumber(body);
  const status = extractStatus(body);

  return {
    eventType,
    trackingNumber,
    masterTrackingNumber: (body.masterTrackingNumber ?? body.masterTrackingNo) as string | undefined,
    timestamp: (body.timestamp ?? body.eventTimestamp ?? new Date().toISOString()) as string,
    status,
    description: (body.description ?? body.eventDescription ?? "") as string,
    location: extractLocation(body),
    details: body,
  };
}

function mapFedExEventType(body: Record<string, unknown>): FedExWebhookEventType {
  const type = ((body.eventType ?? body.type ?? "") as string).toUpperCase();
  if (type.includes("DELIVER") && !type.includes("EXCEPTION")) return "DELIVERED";
  if (type.includes("EXCEPTION")) return "DELIVERY_EXCEPTION";
  if (type.includes("OUT_FOR")) return "OUT_FOR_DELIVERY";
  if (type.includes("TRANSIT")) return "IN_TRANSIT";
  if (type.includes("RETURN")) return "RETURN_TO_SHIPPER";
  if (type.includes("CLEARANCE")) return "CLEARANCE_DELAY";
  if (type.includes("PICKUP")) return "PICKUP_COMPLETED";
  if (type.includes("CREATED")) return "SHIPMENT_CREATED";
  return "IN_TRANSIT";
}

function extractTrackingNumber(body: Record<string, unknown>): string {
  if (typeof body.trackingNumber === "string") return body.trackingNumber;
  if (typeof body.trackingNo === "string") return body.trackingNo;
  const info = body.trackingNumberInfo as Record<string, unknown> | undefined;
  if (info && typeof info.trackingNumber === "string") return info.trackingNumber;
  return "";
}

function extractStatus(body: Record<string, unknown>): FedExTrackingStatus {
  const raw = ((body.statusCode ?? body.derivedStatusCode ?? body.status ?? "") as string).toUpperCase();
  if (raw === "DL" || raw.includes("DELIVER")) return "DL";
  if (raw === "IT" || raw.includes("TRANSIT")) return "IT";
  if (raw === "OD" || raw.includes("OUT")) return "OD";
  if (raw === "DE" || raw.includes("EXCEPTION")) return "DE";
  if (raw === "PU" || raw.includes("PICKUP")) return "PU";
  if (raw === "CA" || raw.includes("CANCEL")) return "CA";
  if (raw === "RS" || raw.includes("RETURN")) return "RS";
  if (raw === "CD" || raw.includes("CLEARANCE")) return "CD";
  if (raw === "HL" || raw.includes("HOLD")) return "HL";
  if (raw === "SE") return "SE";
  return "IT";
}

function extractLocation(
  body: Record<string, unknown>
): FedExWebhookPayload["location"] | undefined {
  const loc = (body.scanLocation ?? body.location) as Record<string, unknown> | undefined;
  if (!loc) return undefined;
  return {
    city: loc.city as string | undefined,
    stateOrProvinceCode: loc.stateOrProvinceCode as string | undefined,
    countryCode: loc.countryCode as string | undefined,
    postalCode: loc.postalCode as string | undefined,
  };
}

// ==================== Webhook Event Router ====================

export type FedExWebhookHandler = (event: FedExWebhookPayload) => Promise<void>;

export interface FedExWebhookRouter {
  handlers: Map<FedExWebhookEventType | "*", FedExWebhookHandler[]>;
  on(eventType: FedExWebhookEventType | "*", handler: FedExWebhookHandler): void;
  process(payload: FedExWebhookPayload): Promise<void>;
}

/**
 * Create a webhook router that dispatches FedEx events to registered handlers.
 */
export function createFedExWebhookRouter(): FedExWebhookRouter {
  const handlers = new Map<FedExWebhookEventType | "*", FedExWebhookHandler[]>();

  return {
    handlers,

    on(eventType: FedExWebhookEventType | "*", handler: FedExWebhookHandler): void {
      const existing = handlers.get(eventType) ?? [];
      existing.push(handler);
      handlers.set(eventType, existing);
    },

    async process(payload: FedExWebhookPayload): Promise<void> {
      const specificHandlers = handlers.get(payload.eventType) ?? [];
      const wildcardHandlers = handlers.get("*") ?? [];
      const allHandlers = [...specificHandlers, ...wildcardHandlers];

      await Promise.all(allHandlers.map((h) => h(payload)));
    },
  };
}

import { createHmac, timingSafeEqual } from "node:crypto";
import type { UpsWebhookPayload, UpsWebhookEventType, UpsTrackingStatus } from "./types.js";

// ==================== UPS Webhook Verification ====================

export interface UpsWebhookConfig {
  /** Signing secret from UPS developer portal webhook subscription */
  signingSecret: string;
  /** Maximum age of a webhook event in seconds (default: 300) */
  toleranceSeconds?: number;
}

/**
 * Verify the authenticity of an incoming UPS webhook request.
 *
 * UPS signs webhook payloads using HMAC-SHA256. The signature
 * is sent in the `x-ups-signature` header.
 */
export function verifyUpsWebhook(
  payload: string | Buffer,
  signatureHeader: string,
  config: UpsWebhookConfig
): boolean {
  const expectedSignature = createHmac("sha256", config.signingSecret)
    .update(payload)
    .digest("hex");

  const cleanSignature = signatureHeader.replace(/^sha256=/, "");

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
 * Parse a raw UPS webhook payload into a typed event object.
 */
export function parseUpsWebhookPayload(rawBody: string): UpsWebhookPayload {
  const body = JSON.parse(rawBody) as Record<string, unknown>;

  const eventType = mapUpsEventType(body);
  const trackingNumber = extractTrackingNumber(body);
  const status = extractStatus(body);

  return {
    eventType,
    trackingNumber,
    shipmentIdentificationNumber: (body.shipmentIdentificationNumber ?? body.shipmentId) as string | undefined,
    timestamp: (body.dateTime ?? body.timestamp ?? new Date().toISOString()) as string,
    status,
    description: (body.description ?? body.activityDescription ?? "") as string,
    location: extractLocation(body),
    details: body,
  };
}

function mapUpsEventType(body: Record<string, unknown>): UpsWebhookEventType {
  const type = ((body.eventType ?? body.type ?? "") as string).toLowerCase();
  if (type.includes("deliver")) return "delivery_confirmation";
  if (type.includes("exception")) return "exception_notification";
  if (type.includes("pickup")) return "pickup_notification";
  return "tracking_update";
}

function extractTrackingNumber(body: Record<string, unknown>): string {
  if (typeof body.trackingNumber === "string") return body.trackingNumber;
  if (typeof body.inquiryNumber === "string") return body.inquiryNumber;
  // Nested in package info
  const pkg = body.package as Record<string, unknown> | undefined;
  if (pkg && typeof pkg.trackingNumber === "string") return pkg.trackingNumber;
  return "";
}

function extractStatus(body: Record<string, unknown>): UpsTrackingStatus {
  const raw = ((body.statusCode ?? body.status ?? "") as string).toUpperCase();
  if (raw === "D" || raw.includes("DELIVER")) return "D";
  if (raw === "I" || raw.includes("TRANSIT")) return "I";
  if (raw === "X" || raw.includes("EXCEPTION")) return "X";
  if (raw === "P" || raw.includes("PICKUP")) return "P";
  if (raw === "M" || raw.includes("MANIFEST")) return "M";
  if (raw === "RS" || raw.includes("RETURN")) return "RS";
  return "NA";
}

function extractLocation(
  body: Record<string, unknown>
): UpsWebhookPayload["location"] | undefined {
  const loc = body.location as Record<string, unknown> | undefined;
  if (!loc) return undefined;
  const addr = (loc.address ?? loc) as Record<string, unknown>;
  return {
    city: (addr.city ?? "") as string,
    stateProvinceCode: addr.stateProvinceCode as string | undefined,
    countryCode: (addr.countryCode ?? "") as string,
  };
}

// ==================== Webhook Event Router ====================

export type UpsWebhookHandler = (event: UpsWebhookPayload) => Promise<void>;

export interface UpsWebhookRouter {
  handlers: Map<UpsWebhookEventType | "*", UpsWebhookHandler[]>;
  on(eventType: UpsWebhookEventType | "*", handler: UpsWebhookHandler): void;
  process(payload: UpsWebhookPayload): Promise<void>;
}

/**
 * Create a webhook router that dispatches UPS events to registered handlers.
 */
export function createUpsWebhookRouter(): UpsWebhookRouter {
  const handlers = new Map<UpsWebhookEventType | "*", UpsWebhookHandler[]>();

  return {
    handlers,

    on(eventType: UpsWebhookEventType | "*", handler: UpsWebhookHandler): void {
      const existing = handlers.get(eventType) ?? [];
      existing.push(handler);
      handlers.set(eventType, existing);
    },

    async process(payload: UpsWebhookPayload): Promise<void> {
      const specificHandlers = handlers.get(payload.eventType) ?? [];
      const wildcardHandlers = handlers.get("*") ?? [];
      const allHandlers = [...specificHandlers, ...wildcardHandlers];

      await Promise.all(allHandlers.map((h) => h(payload)));
    },
  };
}

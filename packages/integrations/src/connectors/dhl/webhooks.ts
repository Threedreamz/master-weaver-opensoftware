import { createHmac, timingSafeEqual } from "node:crypto";
import type { DhlWebhookPayload, DhlWebhookEventType, DhlShipmentStatus } from "./types.js";

// ==================== DHL Webhook Verification ====================

export interface DhlWebhookConfig {
  /** Shared secret configured in DHL developer portal for webhook signing */
  signingSecret: string;
  /** Maximum age of a webhook event in seconds (default: 300 = 5 min) */
  toleranceSeconds?: number;
}

/**
 * Verify the authenticity of an incoming DHL webhook request.
 *
 * DHL signs webhook payloads using HMAC-SHA256. The signature is
 * sent in the `x-dhl-signature-sha256` header as a hex string.
 */
export function verifyDhlWebhook(
  payload: string | Buffer,
  signatureHeader: string,
  config: DhlWebhookConfig
): boolean {
  const expectedSignature = createHmac("sha256", config.signingSecret)
    .update(payload)
    .digest("hex");

  // DHL may prefix with "sha256="
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
 * Parse a raw DHL webhook payload into a typed event object.
 *
 * Extracts the event type, shipment number, and status from the
 * DHL push notification body.
 */
export function parseDhlWebhookPayload(rawBody: string): DhlWebhookPayload {
  const body = JSON.parse(rawBody) as Record<string, unknown>;

  const eventType = (body.eventType ?? body.event ?? "shipment-status-change") as DhlWebhookEventType;
  const shipmentNo = (body.shipmentNo ?? body.trackingNumber ?? body.barcode ?? "") as string;

  // Map DHL status strings to our normalized status
  const rawStatus = (body.status ?? body.statusCode ?? "") as string;
  const status = mapDhlStatus(rawStatus);

  return {
    eventType,
    shipmentNo,
    timestamp: (body.timestamp ?? body.datetime ?? new Date().toISOString()) as string,
    status,
    description: (body.description ?? body.statusText ?? "") as string,
    location: body.location as DhlWebhookPayload["location"],
    details: body,
  };
}

/** Map DHL's raw status strings to normalized status values. */
function mapDhlStatus(raw: string): DhlShipmentStatus {
  const normalized = raw.toLowerCase();
  if (normalized.includes("deliver")) return "delivered";
  if (normalized.includes("transit") || normalized.includes("process")) return "transit";
  if (normalized.includes("return")) return "return";
  if (normalized.includes("fail") || normalized.includes("exception")) return "failure";
  if (normalized.includes("pre-transit") || normalized.includes("created")) return "pre-transit";
  return "unknown";
}

// ==================== Webhook Event Handlers ====================

export type DhlWebhookHandler = (event: DhlWebhookPayload) => Promise<void>;

export interface DhlWebhookRouter {
  handlers: Map<DhlWebhookEventType | "*", DhlWebhookHandler[]>;
  on(eventType: DhlWebhookEventType | "*", handler: DhlWebhookHandler): void;
  process(payload: DhlWebhookPayload): Promise<void>;
}

/**
 * Create a webhook router that dispatches DHL events to registered handlers.
 */
export function createDhlWebhookRouter(): DhlWebhookRouter {
  const handlers = new Map<DhlWebhookEventType | "*", DhlWebhookHandler[]>();

  return {
    handlers,

    on(eventType: DhlWebhookEventType | "*", handler: DhlWebhookHandler): void {
      const existing = handlers.get(eventType) ?? [];
      existing.push(handler);
      handlers.set(eventType, existing);
    },

    async process(payload: DhlWebhookPayload): Promise<void> {
      const specificHandlers = handlers.get(payload.eventType) ?? [];
      const wildcardHandlers = handlers.get("*") ?? [];
      const allHandlers = [...specificHandlers, ...wildcardHandlers];

      await Promise.all(allHandlers.map((h) => h(payload)));
    },
  };
}

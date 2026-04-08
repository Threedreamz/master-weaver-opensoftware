import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  MossWebhookEvent,
  MossWebhookConfig,
  MossWebhookEventType,
} from "./types.js";

/** Result of verifying a webhook signature. */
interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
  event?: WebhookEvent;
}

/** Parsed webhook event. */
interface WebhookEvent {
  id: string;
  type: string;
  timestamp: number;
  data: unknown;
  raw: unknown;
}

const DEFAULT_TOLERANCE_SECONDS = 300;

export function verifyMossWebhook(
  payload: string | Buffer,
  signatureHeader: string,
  config: MossWebhookConfig,
): WebhookVerificationResult {
  const tolerance = config.tolerance ?? DEFAULT_TOLERANCE_SECONDS;
  const rawPayload =
    typeof payload === "string" ? payload : payload.toString("utf8");

  const expectedSignature = createHmac("sha256", config.signingSecret)
    .update(rawPayload, "utf8")
    .digest("hex");

  const sigBuffer = Buffer.from(signatureHeader, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return { valid: false, error: "Webhook signature verification failed" };
  }

  const event: MossWebhookEvent = JSON.parse(rawPayload);

  const eventTimestamp = new Date(event.timestamp).getTime();
  const now = Date.now();
  if (Math.abs(now - eventTimestamp) > tolerance * 1000) {
    return {
      valid: false,
      error: `Webhook timestamp is outside tolerance of ${tolerance} seconds`,
    };
  }

  return {
    valid: true,
    event: {
      id: event.id,
      type: event.event,
      timestamp: eventTimestamp,
      data: event.data,
      raw: event,
    },
  };
}

export type MossWebhookHandler = (event: WebhookEvent) => Promise<void>;

export type MossWebhookHandlerMap = Partial<
  Record<MossWebhookEventType, MossWebhookHandler>
>;

export async function handleMossWebhook(
  payload: string | Buffer,
  signatureHeader: string,
  config: MossWebhookConfig,
  handlers: MossWebhookHandlerMap,
): Promise<{ handled: boolean; eventType?: string; error?: string }> {
  const result = verifyMossWebhook(payload, signatureHeader, config);

  if (!result.valid || !result.event) {
    return { handled: false, error: result.error };
  }

  const handler = handlers[result.event.type as MossWebhookEventType];
  if (!handler) {
    return { handled: false, eventType: result.event.type };
  }

  await handler(result.event);
  return { handled: true, eventType: result.event.type };
}

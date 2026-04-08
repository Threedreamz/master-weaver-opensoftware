import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  KlippaWebhookEvent,
  KlippaWebhookConfig,
  KlippaWebhookEventType,
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

export function verifyKlippaWebhook(
  payload: string | Buffer,
  signatureHeader: string,
  config: KlippaWebhookConfig,
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

  const event: KlippaWebhookEvent = JSON.parse(rawPayload);

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
      id: event.request_id,
      type: event.event,
      timestamp: eventTimestamp,
      data: event.data,
      raw: event,
    },
  };
}

export type KlippaWebhookHandler = (event: WebhookEvent) => Promise<void>;

export type KlippaWebhookHandlerMap = Partial<
  Record<KlippaWebhookEventType, KlippaWebhookHandler>
>;

export async function handleKlippaWebhook(
  payload: string | Buffer,
  signatureHeader: string,
  config: KlippaWebhookConfig,
  handlers: KlippaWebhookHandlerMap,
): Promise<{ handled: boolean; eventType?: string; error?: string }> {
  const result = verifyKlippaWebhook(payload, signatureHeader, config);

  if (!result.valid || !result.event) {
    return { handled: false, error: result.error };
  }

  const handler = handlers[result.event.type as KlippaWebhookEventType];
  if (!handler) {
    return { handled: false, eventType: result.event.type };
  }

  await handler(result.event);
  return { handled: true, eventType: result.event.type };
}

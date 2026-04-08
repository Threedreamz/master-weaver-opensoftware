import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  RossumWebhookEvent,
  RossumWebhookConfig,
  RossumWebhookEventType,
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

export function verifyRossumWebhook(
  payload: string | Buffer,
  signatureHeader: string,
  config: RossumWebhookConfig,
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

  const event: RossumWebhookEvent = JSON.parse(rawPayload);

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
      type: event.action,
      timestamp: eventTimestamp,
      data: { annotation: event.annotation, document: event.document },
      raw: event,
    },
  };
}

export type RossumWebhookHandler = (event: WebhookEvent) => Promise<void>;

export type RossumWebhookHandlerMap = Partial<
  Record<RossumWebhookEventType, RossumWebhookHandler>
>;

export async function handleRossumWebhook(
  payload: string | Buffer,
  signatureHeader: string,
  config: RossumWebhookConfig,
  handlers: RossumWebhookHandlerMap,
): Promise<{ handled: boolean; eventType?: string; error?: string }> {
  const result = verifyRossumWebhook(payload, signatureHeader, config);

  if (!result.valid || !result.event) {
    return { handled: false, error: result.error };
  }

  const handler = handlers[result.event.type as RossumWebhookEventType];
  if (!handler) {
    return { handled: false, eventType: result.event.type };
  }

  await handler(result.event);
  return { handled: true, eventType: result.event.type };
}

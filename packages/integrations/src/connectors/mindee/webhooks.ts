import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  MindeeWebhookEvent,
  MindeeWebhookConfig,
  MindeeWebhookEventType,
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

export function verifyMindeeWebhook(
  payload: string | Buffer,
  signatureHeader: string,
  config: MindeeWebhookConfig,
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

  const event: MindeeWebhookEvent = JSON.parse(rawPayload);

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
      id: event.job_id,
      type: event.event_type,
      timestamp: eventTimestamp,
      data: event.data,
      raw: event,
    },
  };
}

export type MindeeWebhookHandler = (event: WebhookEvent) => Promise<void>;

export type MindeeWebhookHandlerMap = Partial<
  Record<MindeeWebhookEventType, MindeeWebhookHandler>
>;

export async function handleMindeeWebhook(
  payload: string | Buffer,
  signatureHeader: string,
  config: MindeeWebhookConfig,
  handlers: MindeeWebhookHandlerMap,
): Promise<{ handled: boolean; eventType?: string; error?: string }> {
  const result = verifyMindeeWebhook(payload, signatureHeader, config);

  if (!result.valid || !result.event) {
    return { handled: false, error: result.error };
  }

  const handler = handlers[result.event.type as MindeeWebhookEventType];
  if (!handler) {
    return { handled: false, eventType: result.event.type };
  }

  await handler(result.event);
  return { handled: true, eventType: result.event.type };
}

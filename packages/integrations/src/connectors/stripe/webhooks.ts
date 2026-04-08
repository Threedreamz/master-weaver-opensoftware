import { createHmac, timingSafeEqual } from 'node:crypto';
import type { StripeWebhookEvent, StripeWebhookConfig, StripeWebhookEventType } from './types.js';

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

export function verifyStripeWebhook(
  payload: string | Buffer,
  signatureHeader: string,
  config: StripeWebhookConfig,
): WebhookVerificationResult {
  const tolerance = config.tolerance ?? DEFAULT_TOLERANCE_SECONDS;
  const rawPayload = typeof payload === 'string' ? payload : payload.toString('utf8');

  const parts = signatureHeader.split(',');
  const timestampStr = parts.find((p) => p.startsWith('t='))?.slice(2);
  const signatures = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));

  if (!timestampStr || signatures.length === 0) {
    return { valid: false, error: 'Invalid Stripe-Signature header format' };
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return { valid: false, error: 'Invalid timestamp in Stripe-Signature header' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) {
    return { valid: false, error: `Webhook timestamp is outside tolerance of ${tolerance} seconds` };
  }

  const signedPayload = `${timestamp}.${rawPayload}`;
  const expectedSignature = createHmac('sha256', config.signingSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  const isValid = signatures.some((sig) => {
    const sigBuffer = Buffer.from(sig, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, expectedBuffer);
  });

  if (!isValid) {
    return { valid: false, error: 'Webhook signature verification failed' };
  }

  const event: StripeWebhookEvent = JSON.parse(rawPayload);

  return {
    valid: true,
    event: {
      id: event.id,
      type: event.type,
      timestamp: event.created * 1000,
      data: event.data.object,
      raw: event,
    },
  };
}

export type StripeWebhookHandler = (event: WebhookEvent) => Promise<void>;

export type StripeWebhookHandlerMap = Partial<Record<StripeWebhookEventType, StripeWebhookHandler>>;

export async function handleStripeWebhook(
  payload: string | Buffer,
  signatureHeader: string,
  config: StripeWebhookConfig,
  handlers: StripeWebhookHandlerMap,
): Promise<{ handled: boolean; eventType?: string; error?: string }> {
  const result = verifyStripeWebhook(payload, signatureHeader, config);

  if (!result.valid || !result.event) {
    return { handled: false, error: result.error };
  }

  const handler = handlers[result.event.type as StripeWebhookEventType];
  if (!handler) {
    return { handled: false, eventType: result.event.type };
  }

  await handler(result.event);
  return { handled: true, eventType: result.event.type };
}

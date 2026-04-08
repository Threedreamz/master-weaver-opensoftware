import { timingSafeEqual } from 'node:crypto';
import type { KlarnaWebhookEvent, KlarnaWebhookEventType, KlarnaWebhookConfig } from './types.js';

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

/**
 * Verifies a Klarna webhook using basic authentication.
 * Klarna sends webhooks with basic auth credentials in the Authorization header
 * that match the merchant's API credentials.
 */
export function verifyKlarnaWebhook(
  payload: string | Buffer,
  authorizationHeader: string,
  config: KlarnaWebhookConfig,
): WebhookVerificationResult {
  const rawPayload = typeof payload === 'string' ? payload : payload.toString('utf8');

  if (!authorizationHeader.startsWith('Basic ')) {
    return { valid: false, error: 'Missing or invalid Authorization header' };
  }

  const receivedCredentials = authorizationHeader.slice(6);
  const expectedCredentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');

  const receivedBuffer = Buffer.from(receivedCredentials, 'utf8');
  const expectedBuffer = Buffer.from(expectedCredentials, 'utf8');

  if (receivedBuffer.length !== expectedBuffer.length) {
    return { valid: false, error: 'Webhook authentication failed' };
  }

  const isValid = timingSafeEqual(receivedBuffer, expectedBuffer);
  if (!isValid) {
    return { valid: false, error: 'Webhook authentication failed' };
  }

  const webhookEvent: KlarnaWebhookEvent = JSON.parse(rawPayload);

  return {
    valid: true,
    event: {
      id: webhookEvent.event_id,
      type: webhookEvent.event_type,
      timestamp: new Date(webhookEvent.timestamp).getTime(),
      data: webhookEvent.data,
      raw: webhookEvent,
    },
  };
}

export type KlarnaWebhookHandler = (event: WebhookEvent) => Promise<void>;

export type KlarnaWebhookHandlerMap = Partial<Record<KlarnaWebhookEventType, KlarnaWebhookHandler>>;

export async function handleKlarnaWebhook(
  payload: string | Buffer,
  authorizationHeader: string,
  config: KlarnaWebhookConfig,
  handlers: KlarnaWebhookHandlerMap,
): Promise<{ handled: boolean; eventType?: string; error?: string }> {
  const result = verifyKlarnaWebhook(payload, authorizationHeader, config);

  if (!result.valid || !result.event) {
    return { handled: false, error: result.error };
  }

  const handler = handlers[result.event.type as KlarnaWebhookEventType];
  if (!handler) {
    return { handled: false, eventType: result.event.type };
  }

  await handler(result.event);
  return { handled: true, eventType: result.event.type };
}

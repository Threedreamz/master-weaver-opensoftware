import type { MollieWebhookEventType, MollieWebhookConfig, MolliePayment } from './types.js';

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
import { MollieClient } from './client.js';

/**
 * Mollie uses a unique webhook pattern: they POST only the resource ID.
 * Verification is done by fetching the resource from the API to confirm it exists.
 * This prevents spoofed webhooks since only Mollie knows the real payment state.
 */
export async function verifyMollieWebhook(
  payload: string | URLSearchParams,
  config: MollieWebhookConfig,
): Promise<WebhookVerificationResult> {
  let resourceId: string | null;

  if (payload instanceof URLSearchParams) {
    resourceId = payload.get('id');
  } else {
    const params = new URLSearchParams(payload);
    resourceId = params.get('id');
  }

  if (!resourceId) {
    return { valid: false, error: 'Missing resource ID in webhook payload' };
  }

  const client = new MollieClient({ apiKey: config.apiKey });

  try {
    const response = await client.getPayment(resourceId);
    const payment = response.data;

    let eventType: MollieWebhookEventType;
    switch (payment.status) {
      case 'paid':
        eventType = 'payment.paid';
        break;
      case 'expired':
        eventType = 'payment.expired';
        break;
      case 'failed':
        eventType = 'payment.failed';
        break;
      case 'canceled':
        eventType = 'payment.canceled';
        break;
      default:
        eventType = 'payment.paid';
    }

    return {
      valid: true,
      event: {
        id: payment.id,
        type: eventType,
        timestamp: new Date(payment.createdAt).getTime(),
        data: payment,
        raw: { id: resourceId },
      },
    };
  } catch {
    return { valid: false, error: `Failed to verify webhook: resource ${resourceId} not found` };
  }
}

export type MollieWebhookHandler = (event: WebhookEvent) => Promise<void>;

export type MollieWebhookHandlerMap = Partial<Record<MollieWebhookEventType, MollieWebhookHandler>>;

export async function handleMollieWebhook(
  payload: string | URLSearchParams,
  config: MollieWebhookConfig,
  handlers: MollieWebhookHandlerMap,
): Promise<{ handled: boolean; eventType?: string; error?: string }> {
  const result = await verifyMollieWebhook(payload, config);

  if (!result.valid || !result.event) {
    return { handled: false, error: result.error };
  }

  const handler = handlers[result.event.type as MollieWebhookEventType];
  if (!handler) {
    return { handled: false, eventType: result.event.type };
  }

  await handler(result.event);
  return { handled: true, eventType: result.event.type };
}

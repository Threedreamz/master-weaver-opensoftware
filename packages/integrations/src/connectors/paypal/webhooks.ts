import type { PayPalWebhookEvent, PayPalWebhookEventType, PayPalWebhookConfig } from './types.js';

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
 * Verifies a PayPal webhook by calling the PayPal verification API.
 * PayPal uses a server-side verification model where the webhook payload
 * and headers are sent back to PayPal for verification.
 */
export async function verifyPayPalWebhook(
  payload: string | Buffer,
  headers: Record<string, string>,
  config: PayPalWebhookConfig,
): Promise<WebhookVerificationResult> {
  const rawPayload = typeof payload === 'string' ? payload : payload.toString('utf8');

  const transmissionId = headers['paypal-transmission-id'];
  const transmissionTime = headers['paypal-transmission-time'];
  const transmissionSig = headers['paypal-transmission-sig'];
  const certUrl = headers['paypal-cert-url'];
  const authAlgo = headers['paypal-auth-algo'];

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    return { valid: false, error: 'Missing required PayPal webhook headers' };
  }

  const baseUrl = config.sandbox
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!tokenResponse.ok) {
    return { valid: false, error: 'Failed to authenticate with PayPal for webhook verification' };
  }

  const tokenData = (await tokenResponse.json()) as { access_token: string };

  const verifyResponse = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: config.webhookId,
      webhook_event: JSON.parse(rawPayload),
    }),
  });

  if (!verifyResponse.ok) {
    return { valid: false, error: 'PayPal webhook verification API returned an error' };
  }

  const verifyResult = (await verifyResponse.json()) as { verification_status: string };

  if (verifyResult.verification_status !== 'SUCCESS') {
    return { valid: false, error: 'PayPal webhook signature verification failed' };
  }

  const webhookEvent: PayPalWebhookEvent = JSON.parse(rawPayload);

  return {
    valid: true,
    event: {
      id: webhookEvent.id,
      type: webhookEvent.event_type,
      timestamp: new Date(webhookEvent.create_time).getTime(),
      data: webhookEvent.resource,
      raw: webhookEvent,
    },
  };
}

export type PayPalWebhookHandler = (event: WebhookEvent) => Promise<void>;

export type PayPalWebhookHandlerMap = Partial<Record<PayPalWebhookEventType, PayPalWebhookHandler>>;

export async function handlePayPalWebhook(
  payload: string | Buffer,
  headers: Record<string, string>,
  config: PayPalWebhookConfig,
  handlers: PayPalWebhookHandlerMap,
): Promise<{ handled: boolean; eventType?: string; error?: string }> {
  const result = await verifyPayPalWebhook(payload, headers, config);

  if (!result.valid || !result.event) {
    return { handled: false, error: result.error };
  }

  const handler = handlers[result.event.type as PayPalWebhookEventType];
  if (!handler) {
    return { handled: false, eventType: result.event.type };
  }

  await handler(result.event);
  return { handled: true, eventType: result.event.type };
}

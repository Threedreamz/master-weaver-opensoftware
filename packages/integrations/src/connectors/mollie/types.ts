// ── Shared ──────────────────────────────────────────────────────────────────

export interface MollieAmount {
  currency: string;
  value: string;
}

export interface MollieLink {
  href: string;
  type: string;
}

export interface MollieLinks {
  self: MollieLink;
  documentation?: MollieLink;
  next?: MollieLink;
  previous?: MollieLink;
  [key: string]: MollieLink | undefined;
}

export interface MollieListParams {
  from?: string;
  limit?: number;
}

export interface MollieList<T> {
  count: number;
  _embedded: Record<string, T[]>;
  _links: MollieLinks;
}

export interface MollieClientConfig {
  apiKey: string;
  testMode?: boolean;
  timeout?: number;
  retries?: number;
}

// ── Payments ────────────────────────────────────────────────────────────────

export type MolliePaymentMethod =
  | 'ideal'
  | 'creditcard'
  | 'bancontact'
  | 'banktransfer'
  | 'belfius'
  | 'eps'
  | 'giropay'
  | 'kbc'
  | 'paypal'
  | 'sofort'
  | 'applepay'
  | 'przelewy24'
  | 'klarnapaylater'
  | 'klarnasliceit';

export type MolliePaymentStatus =
  | 'open'
  | 'canceled'
  | 'pending'
  | 'authorized'
  | 'expired'
  | 'failed'
  | 'paid';

export interface MolliePayment {
  resource: 'payment';
  id: string;
  mode: 'test' | 'live';
  createdAt: string;
  amount: MollieAmount;
  description: string;
  method: MolliePaymentMethod | null;
  metadata: Record<string, unknown> | null;
  status: MolliePaymentStatus;
  isCancelable: boolean;
  authorizedAt?: string;
  paidAt?: string;
  canceledAt?: string;
  expiresAt: string;
  expiredAt?: string;
  failedAt?: string;
  amountRefunded?: MollieAmount;
  amountRemaining?: MollieAmount;
  amountCaptured?: MollieAmount;
  amountChargedBack?: MollieAmount;
  locale: string | null;
  countryCode: string | null;
  profileId: string;
  customerId?: string;
  mandateId?: string;
  subscriptionId?: string;
  sequenceType: 'oneoff' | 'first' | 'recurring';
  redirectUrl: string | null;
  webhookUrl: string | null;
  _links: MollieLinks & {
    checkout?: MollieLink;
    dashboard?: MollieLink;
    refunds?: MollieLink;
    chargebacks?: MollieLink;
  };
}

export interface CreatePaymentParams {
  amount: MollieAmount;
  description: string;
  redirectUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  locale?: string;
  method?: MolliePaymentMethod | MolliePaymentMethod[];
  metadata?: Record<string, unknown>;
  sequenceType?: 'oneoff' | 'first' | 'recurring';
  customerId?: string;
  mandateId?: string;
}

export interface UpdatePaymentParams {
  description?: string;
  redirectUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}

// ── Refunds ─────────────────────────────────────────────────────────────────

export type MollieRefundStatus = 'queued' | 'pending' | 'processing' | 'refunded' | 'failed';

export interface MollieRefund {
  resource: 'refund';
  id: string;
  amount: MollieAmount;
  status: MollieRefundStatus;
  createdAt: string;
  description: string;
  metadata: Record<string, unknown> | null;
  paymentId: string;
  settlementAmount?: MollieAmount;
  _links: MollieLinks;
}

export interface CreateRefundParams {
  amount: MollieAmount;
  description?: string;
  metadata?: Record<string, unknown>;
}

// ── Customers ───────────────────────────────────────────────────────────────

export interface MollieCustomer {
  resource: 'customer';
  id: string;
  mode: 'test' | 'live';
  name: string | null;
  email: string | null;
  locale: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  _links: MollieLinks;
}

export interface CreateCustomerParams {
  name?: string;
  email?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCustomerParams extends CreateCustomerParams {}

// ── Mandates ────────────────────────────────────────────────────────────────

export type MollieMandateStatus = 'valid' | 'invalid' | 'pending';

export interface MollieMandate {
  resource: 'mandate';
  id: string;
  status: MollieMandateStatus;
  method: string;
  details: {
    consumerName?: string;
    consumerAccount?: string;
    consumerBic?: string;
    cardHolder?: string;
    cardNumber?: string;
    cardLabel?: string;
    cardFingerprint?: string;
    cardExpiryDate?: string;
  };
  mandateReference: string | null;
  signatureDate: string | null;
  createdAt: string;
  _links: MollieLinks;
}

export interface CreateMandateParams {
  method: 'directdebit' | 'paypal';
  consumerName: string;
  consumerAccount?: string;
  consumerBic?: string;
  consumerEmail?: string;
  signatureDate?: string;
  mandateReference?: string;
}

// ── Subscriptions ───────────────────────────────────────────────────────────

export type MollieSubscriptionStatus = 'pending' | 'active' | 'canceled' | 'suspended' | 'completed';

export interface MollieSubscription {
  resource: 'subscription';
  id: string;
  mode: 'test' | 'live';
  createdAt: string;
  status: MollieSubscriptionStatus;
  amount: MollieAmount;
  times: number | null;
  timesRemaining: number | null;
  interval: string;
  startDate: string;
  nextPaymentDate: string | null;
  description: string;
  method: MolliePaymentMethod | null;
  mandateId: string | null;
  canceledAt: string | null;
  webhookUrl: string | null;
  metadata: Record<string, unknown> | null;
  _links: MollieLinks;
}

export interface CreateSubscriptionParams {
  amount: MollieAmount;
  interval: string;
  description: string;
  times?: number;
  startDate?: string;
  method?: MolliePaymentMethod;
  mandateId?: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateSubscriptionParams {
  amount?: MollieAmount;
  description?: string;
  interval?: string;
  times?: number;
  startDate?: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
  mandateId?: string;
}

// ── Webhook Events ──────────────────────────────────────────────────────────

export type MollieWebhookEventType =
  | 'payment.paid'
  | 'payment.expired'
  | 'payment.failed'
  | 'payment.canceled'
  | 'payment.chargedback'
  | 'refund.created'
  | 'refund.refunded'
  | 'refund.failed'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'subscription.completed';

export interface MollieWebhookPayload {
  id: string;
}

export interface MollieWebhookConfig {
  apiKey: string;
}

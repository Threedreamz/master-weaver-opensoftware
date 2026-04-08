// ── Shared ──────────────────────────────────────────────────────────────────

export interface StripeListParams {
  limit?: number;
  starting_after?: string;
  ending_before?: string;
}

export interface StripeList<T> {
  object: 'list';
  data: T[];
  has_more: boolean;
  url: string;
}

export interface StripeAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

export interface StripeMetadata {
  [key: string]: string;
}

// ── Customers ───────────────────────────────────────────────────────────────

export interface StripeCustomer {
  id: string;
  object: 'customer';
  name: string | null;
  email: string | null;
  phone: string | null;
  address: StripeAddress | null;
  description: string | null;
  metadata: StripeMetadata;
  default_source: string | null;
  invoice_settings: {
    default_payment_method: string | null;
  };
  balance: number;
  currency: string | null;
  created: number;
  livemode: boolean;
  delinquent: boolean;
}

export interface CreateCustomerParams {
  name?: string;
  email?: string;
  phone?: string;
  address?: Partial<StripeAddress>;
  description?: string;
  metadata?: StripeMetadata;
  payment_method?: string;
  invoice_settings?: {
    default_payment_method?: string;
  };
}

export interface UpdateCustomerParams extends CreateCustomerParams {}

// ── Charges ─────────────────────────────────────────────────────────────────

export interface StripeCharge {
  id: string;
  object: 'charge';
  amount: number;
  amount_captured: number;
  amount_refunded: number;
  currency: string;
  customer: string | null;
  description: string | null;
  metadata: StripeMetadata;
  payment_intent: string | null;
  payment_method: string | null;
  receipt_url: string | null;
  status: 'succeeded' | 'pending' | 'failed';
  refunded: boolean;
  created: number;
  livemode: boolean;
}

export interface CreateChargeParams {
  amount: number;
  currency: string;
  customer?: string;
  source?: string;
  description?: string;
  metadata?: StripeMetadata;
  capture?: boolean;
  receipt_email?: string;
}

// ── Payment Intents ─────────────────────────────────────────────────────────

export interface StripePaymentIntent {
  id: string;
  object: 'payment_intent';
  amount: number;
  amount_received: number;
  currency: string;
  customer: string | null;
  description: string | null;
  metadata: StripeMetadata;
  payment_method: string | null;
  payment_method_types: string[];
  client_secret: string;
  status:
    | 'requires_payment_method'
    | 'requires_confirmation'
    | 'requires_action'
    | 'processing'
    | 'requires_capture'
    | 'canceled'
    | 'succeeded';
  capture_method: 'automatic' | 'manual';
  confirmation_method: 'automatic' | 'manual';
  created: number;
  livemode: boolean;
  latest_charge: string | null;
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  customer?: string;
  description?: string;
  metadata?: StripeMetadata;
  payment_method?: string;
  payment_method_types?: string[];
  capture_method?: 'automatic' | 'manual';
  confirmation_method?: 'automatic' | 'manual';
  confirm?: boolean;
  receipt_email?: string;
  setup_future_usage?: 'on_session' | 'off_session';
  return_url?: string;
}

export interface UpdatePaymentIntentParams {
  amount?: number;
  currency?: string;
  customer?: string;
  description?: string;
  metadata?: StripeMetadata;
  payment_method?: string;
  receipt_email?: string;
}

export interface ConfirmPaymentIntentParams {
  payment_method?: string;
  return_url?: string;
}

// ── Invoices ────────────────────────────────────────────────────────────────

export interface StripeInvoice {
  id: string;
  object: 'invoice';
  customer: string;
  subscription: string | null;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  currency: string;
  description: string | null;
  metadata: StripeMetadata;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  number: string | null;
  due_date: number | null;
  period_start: number;
  period_end: number;
  created: number;
  livemode: boolean;
}

export interface CreateInvoiceParams {
  customer: string;
  description?: string;
  metadata?: StripeMetadata;
  auto_advance?: boolean;
  collection_method?: 'charge_automatically' | 'send_invoice';
  due_date?: number;
  days_until_due?: number;
}

export interface UpdateInvoiceParams {
  description?: string;
  metadata?: StripeMetadata;
  auto_advance?: boolean;
  due_date?: number;
  days_until_due?: number;
}

// ── Subscriptions ───────────────────────────────────────────────────────────

export interface StripeSubscriptionItem {
  id: string;
  object: 'subscription_item';
  price: {
    id: string;
    object: 'price';
    currency: string;
    unit_amount: number | null;
    recurring: {
      interval: 'day' | 'week' | 'month' | 'year';
      interval_count: number;
    } | null;
  };
  quantity: number;
}

export interface StripeSubscription {
  id: string;
  object: 'subscription';
  customer: string;
  status:
    | 'active'
    | 'past_due'
    | 'unpaid'
    | 'canceled'
    | 'incomplete'
    | 'incomplete_expired'
    | 'trialing'
    | 'paused';
  items: StripeList<StripeSubscriptionItem>;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  metadata: StripeMetadata;
  default_payment_method: string | null;
  latest_invoice: string | null;
  created: number;
  livemode: boolean;
}

export interface CreateSubscriptionParams {
  customer: string;
  items: Array<{
    price: string;
    quantity?: number;
  }>;
  metadata?: StripeMetadata;
  default_payment_method?: string;
  cancel_at_period_end?: boolean;
  trial_period_days?: number;
  payment_behavior?: 'default_incomplete' | 'error_if_incomplete' | 'allow_incomplete';
}

export interface UpdateSubscriptionParams {
  items?: Array<{
    id?: string;
    price?: string;
    quantity?: number;
    deleted?: boolean;
  }>;
  metadata?: StripeMetadata;
  default_payment_method?: string;
  cancel_at_period_end?: boolean;
  proration_behavior?: 'create_prorations' | 'none' | 'always_invoice';
}

// ── Webhook Events ──────────────────────────────────────────────────────────

export type StripeWebhookEventType =
  | 'charge.succeeded'
  | 'charge.failed'
  | 'charge.refunded'
  | 'payment_intent.created'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.canceled'
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  | 'invoice.created'
  | 'invoice.finalized'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'invoice.voided'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.trial_will_end';

export interface StripeWebhookEvent {
  id: string;
  object: 'event';
  type: StripeWebhookEventType;
  api_version: string;
  created: number;
  livemode: boolean;
  data: {
    object: Record<string, unknown>;
    previous_attributes?: Record<string, unknown>;
  };
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
}

export interface StripeWebhookConfig {
  signingSecret: string;
  tolerance?: number;
}

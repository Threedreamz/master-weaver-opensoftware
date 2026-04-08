// ==================== GoCardless API Types ====================

/** GoCardless API environment */
export type GoCardlessEnvironment = "sandbox" | "live";

/** Currency codes supported by GoCardless */
export type GoCardlessCurrency = "GBP" | "EUR" | "SEK" | "DKK" | "AUD" | "NZD" | "CAD" | "USD";

/** Mandate status lifecycle */
export type GoCardlessMandateStatus =
  | "pending_customer_approval"
  | "pending_submission"
  | "submitted"
  | "active"
  | "failed"
  | "cancelled"
  | "expired"
  | "consumed"
  | "blocked";

/** Payment status lifecycle */
export type GoCardlessPaymentStatus =
  | "pending_customer_approval"
  | "pending_submission"
  | "submitted"
  | "confirmed"
  | "paid_out"
  | "cancelled"
  | "customer_approval_denied"
  | "failed"
  | "charged_back";

/** Payout status */
export type GoCardlessPayoutStatus = "pending" | "paid" | "bounced";

/** Subscription status */
export type GoCardlessSubscriptionStatus =
  | "pending_customer_approval"
  | "customer_approval_denied"
  | "active"
  | "finished"
  | "cancelled"
  | "paused";

/** Subscription interval unit */
export type GoCardlessIntervalUnit = "weekly" | "monthly" | "yearly";

/** Scheme (payment network) */
export type GoCardlessScheme =
  | "ach"
  | "autogiro"
  | "bacs"
  | "becs"
  | "becs_nz"
  | "betalingsservice"
  | "faster_payments"
  | "pad"
  | "pay_to"
  | "sepa_core"
  | "sepa_cor1";

// ==================== Pagination ====================

export interface GoCardlessCursors {
  before: string | null;
  after: string | null;
}

export interface GoCardlessMeta {
  cursors: GoCardlessCursors;
  limit: number;
}

export interface GoCardlessListParams {
  after?: string;
  before?: string;
  limit?: number;
  created_at?: {
    gt?: string;
    gte?: string;
    lt?: string;
    lte?: string;
  };
}

// ==================== Customers ====================

export interface GoCardlessCustomer {
  id: string;
  created_at: string;
  email: string;
  given_name: string;
  family_name: string;
  company_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country_code: string | null;
  language: string;
  phone_number: string | null;
  swedish_identity_number: string | null;
  danish_identity_number: string | null;
  metadata: Record<string, string>;
}

export interface GoCardlessCustomerCreateRequest {
  email: string;
  given_name: string;
  family_name: string;
  company_name?: string;
  address_line1?: string;
  address_line2?: string;
  address_line3?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country_code?: string;
  language?: string;
  phone_number?: string;
  swedish_identity_number?: string;
  danish_identity_number?: string;
  metadata?: Record<string, string>;
}

export interface GoCardlessCustomerUpdateRequest {
  email?: string;
  given_name?: string;
  family_name?: string;
  company_name?: string;
  address_line1?: string;
  address_line2?: string;
  address_line3?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country_code?: string;
  language?: string;
  phone_number?: string;
  metadata?: Record<string, string>;
}

export interface GoCardlessCustomerListParams extends GoCardlessListParams {
  email?: string;
  sort_field?: "name" | "company_name" | "created_at";
  sort_direction?: "asc" | "desc";
}

// ==================== Customer Bank Accounts ====================

export interface GoCardlessCustomerBankAccount {
  id: string;
  created_at: string;
  account_number_ending: string;
  account_holder_name: string;
  bank_name: string;
  currency: GoCardlessCurrency;
  country_code: string;
  enabled: boolean;
  metadata: Record<string, string>;
  links: {
    customer: string;
  };
}

export interface GoCardlessCustomerBankAccountCreateRequest {
  account_number?: string;
  sort_code?: string;
  branch_code?: string;
  iban?: string;
  account_holder_name: string;
  country_code: string;
  currency?: GoCardlessCurrency;
  metadata?: Record<string, string>;
  links: {
    customer: string;
  };
}

// ==================== Mandates ====================

export interface GoCardlessMandate {
  id: string;
  created_at: string;
  reference: string;
  status: GoCardlessMandateStatus;
  scheme: GoCardlessScheme;
  next_possible_charge_date: string | null;
  payments_require_approval: boolean;
  metadata: Record<string, string>;
  links: {
    customer_bank_account: string;
    creditor: string;
    customer: string;
    new_mandate?: string;
  };
}

export interface GoCardlessMandateCreateRequest {
  scheme?: GoCardlessScheme;
  metadata?: Record<string, string>;
  payer_ip_address?: string;
  reference?: string;
  links: {
    customer_bank_account: string;
    creditor?: string;
  };
}

export interface GoCardlessMandateListParams extends GoCardlessListParams {
  customer?: string;
  customer_bank_account?: string;
  creditor?: string;
  reference?: string;
  scheme?: GoCardlessScheme;
  status?: GoCardlessMandateStatus;
}

// ==================== Payments ====================

export interface GoCardlessPayment {
  id: string;
  created_at: string;
  charge_date: string;
  amount: number;
  description: string | null;
  currency: GoCardlessCurrency;
  status: GoCardlessPaymentStatus;
  reference: string | null;
  metadata: Record<string, string>;
  fx: {
    fx_currency: string;
    fx_amount: number | null;
    exchange_rate: string | null;
    estimated_exchange_rate: string | null;
  } | null;
  links: {
    mandate: string;
    creditor: string;
    payout: string | null;
    subscription: string | null;
  };
}

export interface GoCardlessPaymentCreateRequest {
  amount: number;
  currency: GoCardlessCurrency;
  charge_date?: string;
  description?: string;
  reference?: string;
  metadata?: Record<string, string>;
  retry_if_possible?: boolean;
  links: {
    mandate: string;
  };
}

export interface GoCardlessPaymentListParams extends GoCardlessListParams {
  charge_date?: {
    gt?: string;
    gte?: string;
    lt?: string;
    lte?: string;
  };
  creditor?: string;
  customer?: string;
  mandate?: string;
  payout?: string;
  subscription?: string;
  status?: GoCardlessPaymentStatus;
  sort_field?: "charge_date" | "amount";
  sort_direction?: "asc" | "desc";
}

// ==================== Payouts ====================

export interface GoCardlessPayout {
  id: string;
  created_at: string;
  reference: string;
  amount: number;
  deducted_fees: number;
  currency: GoCardlessCurrency;
  status: GoCardlessPayoutStatus;
  payout_type: "merchant" | "partner";
  arrival_date: string | null;
  fx: {
    fx_currency: string;
    fx_amount: number | null;
    exchange_rate: string | null;
    estimated_exchange_rate: string | null;
  } | null;
  tax_currency: string | null;
  metadata: Record<string, string>;
  links: {
    creditor: string;
    creditor_bank_account: string;
  };
}

export interface GoCardlessPayoutListParams extends GoCardlessListParams {
  creditor?: string;
  creditor_bank_account?: string;
  status?: GoCardlessPayoutStatus;
  payout_type?: "merchant" | "partner";
}

export interface GoCardlessPayoutItem {
  amount: number;
  type: "payment_paid_out" | "payment_failed" | "payment_charged_back" | "payment_refunded" | "refund" | "gocardless_fee" | "app_fee" | "revenue_share" | "surcharge_fee";
  links: {
    payment?: string;
    mandate?: string;
    refund?: string;
  };
}

export interface GoCardlessPayoutItemListParams {
  payout: string;
  after?: string;
  before?: string;
  limit?: number;
}

// ==================== Subscriptions ====================

export interface GoCardlessSubscription {
  id: string;
  created_at: string;
  amount: number;
  currency: GoCardlessCurrency;
  status: GoCardlessSubscriptionStatus;
  name: string | null;
  start_date: string | null;
  end_date: string | null;
  interval: number;
  interval_unit: GoCardlessIntervalUnit;
  day_of_month: number | null;
  month: string | null;
  count: number | null;
  payment_reference: string | null;
  upcoming_payments: Array<{
    charge_date: string;
    amount: number;
  }>;
  metadata: Record<string, string>;
  links: {
    mandate: string;
  };
}

export interface GoCardlessSubscriptionCreateRequest {
  amount: number;
  currency: GoCardlessCurrency;
  name?: string;
  interval_unit: GoCardlessIntervalUnit;
  interval?: number;
  day_of_month?: number;
  month?: string;
  start_date?: string;
  end_date?: string;
  count?: number;
  payment_reference?: string;
  retry_if_possible?: boolean;
  metadata?: Record<string, string>;
  links: {
    mandate: string;
  };
}

export interface GoCardlessSubscriptionUpdateRequest {
  name?: string;
  amount?: number;
  payment_reference?: string;
  retry_if_possible?: boolean;
  metadata?: Record<string, string>;
}

export interface GoCardlessSubscriptionListParams extends GoCardlessListParams {
  customer?: string;
  mandate?: string;
  status?: GoCardlessSubscriptionStatus;
}

// ==================== Webhooks ====================

export type GoCardlessResourceType =
  | "payments"
  | "mandates"
  | "payouts"
  | "refunds"
  | "subscriptions"
  | "instalment_schedules";

export type GoCardlessAction = string;

export interface GoCardlessWebhookEvent {
  id: string;
  created_at: string;
  resource_type: GoCardlessResourceType;
  action: GoCardlessAction;
  details: {
    origin: string;
    cause: string;
    description: string;
    scheme?: GoCardlessScheme;
    reason_code?: string;
  };
  metadata: Record<string, string>;
  links: Record<string, string>;
  resource_metadata?: Record<string, unknown>;
}

export interface GoCardlessWebhookPayload {
  events: GoCardlessWebhookEvent[];
}

// ==================== Errors ====================

export interface GoCardlessErrorDetail {
  message: string;
  field: string;
  request_pointer: string;
}

export interface GoCardlessApiError {
  message: string;
  type: "validation_failed" | "invalid_api_usage" | "invalid_state" | "gocardless" | "internal";
  code: number;
  errors: GoCardlessErrorDetail[];
  documentation_url: string;
  request_id: string;
}

// ==================== Client Config ====================

export interface GoCardlessClientConfig {
  accessToken: string;
  environment?: GoCardlessEnvironment;
  timeout?: number;
}

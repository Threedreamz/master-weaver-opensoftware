// ==================== Revolut Business API Types ====================

/** Revolut account states */
export type RevolutAccountState = "active" | "inactive";

/** Revolut payment states */
export type RevolutPaymentState =
  | "created"
  | "pending"
  | "completed"
  | "declined"
  | "failed"
  | "cancelled"
  | "reverted";

/** Revolut counterparty types */
export type RevolutCounterpartyType = "personal" | "business";

/** Revolut transfer reason codes */
export type RevolutTransferReasonCode =
  | "invoices"
  | "goods"
  | "services"
  | "personal"
  | "salary"
  | "tax"
  | "loan"
  | "other"
  | string;

// ==================== Accounts ====================

export interface RevolutAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  state: RevolutAccountState;
  public: boolean;
  created_at: string;
  updated_at: string;
}

export interface RevolutAccountsResponse {
  accounts: RevolutAccount[];
}

// ==================== Counterparties ====================

export interface RevolutCounterparty {
  id: string;
  name: string;
  phone?: string;
  profile_type?: RevolutCounterpartyType;
  country?: string;
  state: "created" | "active" | "deleted";
  created_at: string;
  updated_at: string;
  accounts?: RevolutCounterpartyAccount[];
}

export interface RevolutCounterpartyAccount {
  id: string;
  name?: string;
  currency: string;
  type: "revolut" | "external";
  account_no?: string;
  sort_code?: string;
  iban?: string;
  bic?: string;
  routing_number?: string;
  bank_country?: string;
  recipient_charges?: "no" | "expected";
}

export interface RevolutCreateCounterpartyRequest {
  company_name?: string;
  individual_name?: {
    first_name: string;
    last_name: string;
  };
  profile_type: RevolutCounterpartyType;
  bank_country: string;
  currency: string;
  phone?: string;
  email?: string;
  revtag?: string;
  account_no?: string;
  sort_code?: string;
  iban?: string;
  bic?: string;
  routing_number?: string;
}

// ==================== Payments / Transfers ====================

export interface RevolutCreatePaymentRequest {
  request_id: string; // Idempotency key
  account_id: string;
  receiver: {
    counterparty_id: string;
    account_id?: string;
  };
  amount: number;
  currency: string;
  reference?: string;
  reason?: RevolutTransferReasonCode;
  schedule_for?: string; // ISO 8601 date
}

export interface RevolutPayment {
  id: string;
  state: RevolutPaymentState;
  reason_code?: string;
  created_at: string;
  completed_at?: string;
  request_id: string;
  type: "atm" | "card_payment" | "card_refund" | "card_chargeback" | "card_credit" | "exchange" | "transfer" | "loan" | "fee" | "refund" | "topup" | "topup_return" | "tax" | "tax_refund";
  reference?: string;
  legs: RevolutPaymentLeg[];
  scheduled_for?: string;
}

export interface RevolutPaymentLeg {
  leg_id: string;
  account_id: string;
  counterparty?: {
    id: string;
    type: "revolut" | "external";
    account_id?: string;
  };
  amount: number;
  currency: string;
  bill_amount?: number;
  bill_currency?: string;
  description?: string;
  balance?: number;
}

// ==================== Transactions ====================

export interface RevolutTransaction {
  id: string;
  type: string;
  state: RevolutPaymentState;
  request_id?: string;
  reason_code?: string;
  created_at: string;
  completed_at?: string;
  updated_at: string;
  reference?: string;
  legs: RevolutPaymentLeg[];
  card?: {
    card_number: string;
    first_name: string;
    last_name: string;
    phone: string;
  };
  merchant?: {
    name: string;
    city: string;
    category_code: string;
    country: string;
  };
}

export interface RevolutTransactionsParams {
  from?: string;  // ISO 8601 datetime
  to?: string;    // ISO 8601 datetime
  counterparty?: string;
  count?: number;
  type?: string;
}

// ==================== FX Exchange ====================

export interface RevolutExchangeRequest {
  request_id: string;
  from: {
    account_id: string;
    currency: string;
    amount?: number;
  };
  to: {
    account_id: string;
    currency: string;
    amount?: number;
  };
  reference?: string;
}

export interface RevolutExchangeResponse {
  id: string;
  state: RevolutPaymentState;
  created_at: string;
  completed_at?: string;
  reason_code?: string;
}

export interface RevolutExchangeRateResponse {
  from: {
    currency: string;
    amount: number;
  };
  to: {
    currency: string;
    amount: number;
  };
  rate: number;
  fee: {
    currency: string;
    amount: number;
  };
  rate_date: string;
}

// ==================== Webhooks ====================

export type RevolutWebhookEventType =
  | "TransactionCreated"
  | "TransactionStateChanged"
  | "PayoutLinkCreated"
  | "PayoutLinkStateChanged";

export interface RevolutWebhookEvent {
  event: RevolutWebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface RevolutCreateWebhookRequest {
  url: string;
  events?: RevolutWebhookEventType[];
}

export interface RevolutWebhookResponse {
  id: string;
  url: string;
  events?: RevolutWebhookEventType[];
}

// ==================== Client Config ====================

export interface RevolutBusinessClientConfig {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  /** Use sandbox environment (default: false) */
  sandbox?: boolean;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

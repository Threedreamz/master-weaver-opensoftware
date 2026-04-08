// ── Shared ──────────────────────────────────────────────────────────────────

export interface CurrencycloudClientConfig {
  loginId: string;
  apiKey: string;
  environment?: CurrencycloudEnvironment;
  timeout?: number;
  retries?: number;
}

export type CurrencycloudEnvironment = "demo" | "production";

export interface CurrencycloudPagination {
  total_entries: number;
  total_pages: number;
  current_page: number;
  per_page: number;
  previous_page: number;
  next_page: number;
  order: string;
  order_asc_desc: string;
}

export interface CurrencycloudListParams {
  page?: number;
  per_page?: number;
  order?: string;
  order_asc_desc?: "asc" | "desc";
}

// ── Authentication ─────────────────────────────────────────────────────────

export interface CurrencycloudAuthResponse {
  auth_token: string;
}

// ── Balances ───────────────────────────────────────────────────────────────

export interface CurrencycloudBalance {
  id: string;
  account_id: string;
  currency: string;
  amount: string;
  created_at: string;
  updated_at: string;
}

export interface CurrencycloudBalanceListResponse {
  balances: CurrencycloudBalance[];
  pagination: CurrencycloudPagination;
}

// ── Beneficiaries ──────────────────────────────────────────────────────────

export interface CurrencycloudBeneficiary {
  id: string;
  bank_account_holder_name: string;
  bank_country: string;
  currency: string;
  name: string;
  email: string | null;
  beneficiary_address: string[];
  beneficiary_country: string;
  account_number: string | null;
  routing_code_type_1: string | null;
  routing_code_value_1: string | null;
  routing_code_type_2: string | null;
  routing_code_value_2: string | null;
  bic_swift: string | null;
  iban: string | null;
  bank_name: string;
  bank_address: string[];
  default_beneficiary: boolean;
  created_at: string;
  updated_at: string;
}

export interface CurrencycloudBeneficiaryListResponse {
  beneficiaries: CurrencycloudBeneficiary[];
  pagination: CurrencycloudPagination;
}

export interface CurrencycloudCreateBeneficiaryParams {
  bank_account_holder_name: string;
  bank_country: string;
  currency: string;
  name: string;
  email?: string;
  beneficiary_address?: string;
  beneficiary_country?: string;
  account_number?: string;
  routing_code_type_1?: string;
  routing_code_value_1?: string;
  bic_swift?: string;
  iban?: string;
  default_beneficiary?: boolean;
}

// ── Conversions ────────────────────────────────────────────────────────────

export interface CurrencycloudConversion {
  id: string;
  settlement_date: string;
  conversion_date: string;
  short_reference: string;
  creator_contact_id: string;
  account_id: string;
  currency_pair: string;
  status: string;
  buy_currency: string;
  sell_currency: string;
  client_buy_amount: string;
  client_sell_amount: string;
  fixed_side: string;
  core_rate: string;
  partner_rate: string;
  partner_buy_amount: string;
  partner_sell_amount: string;
  client_rate: string;
  deposit_required: boolean;
  deposit_amount: string;
  deposit_currency: string;
  deposit_status: string;
  deposit_required_at: string;
  payment_ids: string[];
  unallocated_funds: string;
  created_at: string;
  updated_at: string;
  mid_market_rate: string;
}

export interface CurrencycloudConversionListResponse {
  conversions: CurrencycloudConversion[];
  pagination: CurrencycloudPagination;
}

export interface CurrencycloudCreateConversionParams {
  buy_currency: string;
  sell_currency: string;
  fixed_side: "buy" | "sell";
  amount: string;
  term_agreement?: boolean;
  conversion_date?: string;
  reason?: string;
}

// ── Payments ───────────────────────────────────────────────────────────────

export interface CurrencycloudPayment {
  id: string;
  amount: string;
  beneficiary_id: string;
  currency: string;
  reference: string;
  reason: string;
  status: string;
  creator_contact_id: string;
  payment_type: string;
  payment_date: string;
  transferred_at: string;
  authorisation_steps_required: number;
  last_updater_contact_id: string;
  short_reference: string;
  conversion_id: string | null;
  failure_reason: string;
  payer_id: string;
  payer_details_source: string;
  created_at: string;
  updated_at: string;
  unique_request_id: string | null;
  fee_amount: string | null;
  fee_currency: string | null;
}

export interface CurrencycloudPaymentListResponse {
  payments: CurrencycloudPayment[];
  pagination: CurrencycloudPagination;
}

export interface CurrencycloudCreatePaymentParams {
  currency: string;
  beneficiary_id: string;
  amount: string;
  reason: string;
  reference: string;
  payment_date?: string;
  payment_type?: string;
  conversion_id?: string;
  payer_entity_type?: string;
  unique_request_id?: string;
}

// ── Rates ──────────────────────────────────────────────────────────────────

export interface CurrencycloudRate {
  currency_pair: string;
  bid: string;
  offer: string;
}

export interface CurrencycloudRatesResponse {
  rates: Record<string, CurrencycloudRate>;
  unavailable: string[];
}

// ── Accounts ───────────────────────────────────────────────────────────────

export interface CurrencycloudAccount {
  id: string;
  legal_entity_type: string;
  account_name: string;
  brand: string;
  your_reference: string | null;
  status: string;
  street: string | null;
  city: string | null;
  state_or_province: string | null;
  country: string | null;
  postal_code: string | null;
  created_at: string;
  updated_at: string;
}

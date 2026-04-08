// ── Auth ────────────────────────────────────────────────────────────────────

export interface SumUpClientConfig {
  accessToken: string;
  merchantCode?: string;
  timeout?: number;
  retries?: number;
}

export interface SumUpOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

export interface SumUpOAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

// ── Merchant ────────────────────────────────────────────────────────────────

export interface SumUpMerchantProfile {
  merchant_code: string;
  company_name: string;
  legal_type: {
    id: number;
    description: string;
  };
  merchant_category_code: string;
  mobile_phone: string;
  company_registration_number: string;
  vat_id: string;
  permanent_certificate_access_code: string;
  nature_and_purpose: string;
  address: {
    address_line1: string;
    address_line2?: string;
    city: string;
    country: string;
    region_id?: number;
    region_name?: string;
    post_code: string;
    landline: string;
  };
  business_owners: Array<{
    first_name: string;
    last_name: string;
    date_of_birth: string;
    ownership: number;
  }>;
  doing_business_as: {
    business_name: string;
    company_registration_number: string;
    vat_id: string;
    website: string;
    email: string;
  };
  settings: {
    tax_enabled: boolean;
    payout_type: string;
    payout_period: string;
    payout_on_demand_available: boolean;
    printers_enabled: boolean;
    payout_instrument: {
      type: string;
    };
  };
}

// ── Checkouts ───────────────────────────────────────────────────────────────

export type SumUpCheckoutStatus = 'PENDING' | 'FAILED' | 'PAID' | 'EXPIRED';

export interface SumUpCheckout {
  id: string;
  checkout_reference: string;
  amount: number;
  currency: string;
  pay_to_email: string;
  merchant_code: string;
  description: string;
  return_url?: string;
  status: SumUpCheckoutStatus;
  date: string;
  valid_until?: string;
  merchant_name: string;
  purpose: string;
  transactions: SumUpTransaction[];
}

export interface CreateCheckoutParams {
  checkout_reference: string;
  amount: number;
  currency: string;
  pay_to_email?: string;
  merchant_code: string;
  description?: string;
  return_url?: string;
  redirect_url?: string;
}

export interface ProcessCheckoutParams {
  payment_type: 'card' | 'boleto';
  card?: {
    name: string;
    number: string;
    expiry_month: string;
    expiry_year: string;
    cvv: string;
  };
  token?: string;
}

// ── Transactions ────────────────────────────────────────────────────────────

export type SumUpTransactionStatus = 'SUCCESSFUL' | 'CANCELLED' | 'FAILED' | 'PENDING';

export interface SumUpTransaction {
  id: string;
  transaction_code: string;
  merchant_code: string;
  amount: number;
  vat_amount: number;
  tip_amount: number;
  currency: string;
  timestamp: string;
  status: SumUpTransactionStatus;
  payment_type: string;
  entry_mode: string;
  installments_count: number;
  card_type?: string;
  last_4_digits?: string;
  type: string;
  product_summary?: string;
  payout_plan: string;
  payout_type: string;
  internal_id: number;
  auth_code?: string;
  events: Array<{
    id: number;
    event_type: string;
    status: string;
    amount: number;
    timestamp: string;
  }>;
  links: Array<{
    rel: string;
    href: string;
    type: string;
  }>;
}

export interface TransactionListParams {
  order?: 'ascending' | 'descending';
  limit?: number;
  oldest_time?: string;
  newest_time?: string;
  changes_since?: string;
  statuses?: SumUpTransactionStatus[];
  payment_types?: string[];
}

export interface RefundTransactionParams {
  amount: number;
}

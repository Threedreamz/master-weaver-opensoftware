// ==================== Plaid API Types ====================

/** Plaid environment identifier */
export type PlaidEnvironment = "sandbox" | "development" | "production";

/** Product types available via Plaid */
export type PlaidProduct =
  | "assets"
  | "auth"
  | "balance"
  | "identity"
  | "investments"
  | "liabilities"
  | "payment_initiation"
  | "transactions"
  | "credit_details"
  | "income"
  | "deposit_switch"
  | "standing_orders"
  | "transfer"
  | "employment"
  | "signal";

/** Supported country codes */
export type PlaidCountryCode = "US" | "GB" | "ES" | "NL" | "FR" | "IE" | "CA" | "DE" | "IT" | "PL" | "DK" | "NO" | "SE" | "EE" | "LT" | "LV" | "PT" | "BE";

/** Account type classification */
export type PlaidAccountType = "depository" | "credit" | "loan" | "investment" | "other";

/** Account subtype */
export type PlaidAccountSubtype =
  | "checking"
  | "savings"
  | "cd"
  | "money market"
  | "ira"
  | "401k"
  | "student"
  | "mortgage"
  | "credit card"
  | "paypal"
  | "prepaid"
  | "auto"
  | "commercial"
  | "construction"
  | "consumer"
  | "home equity"
  | "line of credit"
  | "overdraft"
  | string;

/** Transaction payment channel */
export type PlaidTransactionPaymentChannel = "online" | "in store" | "other";

// ==================== Link Token ====================

export interface PlaidLinkTokenCreateRequest {
  client_name: string;
  language: string;
  country_codes: PlaidCountryCode[];
  user: {
    client_user_id: string;
    legal_name?: string;
    phone_number?: string;
    email_address?: string;
  };
  products: PlaidProduct[];
  redirect_uri?: string;
  webhook?: string;
  access_token?: string;
  link_customization_name?: string;
  account_filters?: Record<string, { account_subtypes: string[] }>;
}

export interface PlaidLinkTokenCreateResponse {
  link_token: string;
  expiration: string;
  request_id: string;
}

// ==================== Item / Token Exchange ====================

export interface PlaidItemPublicTokenExchangeRequest {
  public_token: string;
}

export interface PlaidItemPublicTokenExchangeResponse {
  access_token: string;
  item_id: string;
  request_id: string;
}

export interface PlaidItem {
  item_id: string;
  institution_id: string | null;
  webhook: string | null;
  error: PlaidError | null;
  available_products: PlaidProduct[];
  billed_products: PlaidProduct[];
  consent_expiration_time: string | null;
  update_type: "background" | "user_present_required";
}

export interface PlaidItemGetResponse {
  item: PlaidItem;
  status: {
    investments: { last_successful_update: string | null; last_failed_update: string | null } | null;
    transactions: { last_successful_update: string | null; last_failed_update: string | null } | null;
    last_webhook: { sent_at: string | null; code_sent: string | null } | null;
  };
  request_id: string;
}

// ==================== Accounts ====================

export interface PlaidAccountBalance {
  available: number | null;
  current: number | null;
  limit: number | null;
  iso_currency_code: string | null;
  unofficial_currency_code: string | null;
  last_updated_datetime: string | null;
}

export interface PlaidAccount {
  account_id: string;
  balances: PlaidAccountBalance;
  mask: string | null;
  name: string;
  official_name: string | null;
  type: PlaidAccountType;
  subtype: PlaidAccountSubtype | null;
  verification_status?: string;
  persistent_account_id?: string;
}

export interface PlaidAccountsGetRequest {
  access_token: string;
  options?: {
    account_ids?: string[];
  };
}

export interface PlaidAccountsGetResponse {
  accounts: PlaidAccount[];
  item: PlaidItem;
  request_id: string;
}

// ==================== Balances ====================

export interface PlaidBalanceGetRequest {
  access_token: string;
  options?: {
    account_ids?: string[];
    min_last_updated_datetime?: string;
  };
}

export interface PlaidBalanceGetResponse {
  accounts: PlaidAccount[];
  item: PlaidItem;
  request_id: string;
}

// ==================== Transactions ====================

export interface PlaidTransactionLocation {
  address: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
  store_number: string | null;
}

export interface PlaidTransactionPaymentMeta {
  reference_number: string | null;
  ppd_id: string | null;
  payee: string | null;
  by_order_of: string | null;
  payer: string | null;
  payment_method: string | null;
  payment_processor: string | null;
  reason: string | null;
}

export interface PlaidPersonalFinanceCategory {
  primary: string;
  detailed: string;
  confidence_level: string | null;
}

export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  iso_currency_code: string | null;
  unofficial_currency_code: string | null;
  category: string[] | null;
  category_id: string | null;
  date: string;
  datetime: string | null;
  authorized_date: string | null;
  authorized_datetime: string | null;
  location: PlaidTransactionLocation;
  name: string;
  merchant_name: string | null;
  merchant_entity_id: string | null;
  payment_meta: PlaidTransactionPaymentMeta;
  payment_channel: PlaidTransactionPaymentChannel;
  pending: boolean;
  pending_transaction_id: string | null;
  account_owner: string | null;
  transaction_code: string | null;
  transaction_type: string;
  logo_url: string | null;
  website: string | null;
  personal_finance_category: PlaidPersonalFinanceCategory | null;
  personal_finance_category_icon_url: string | null;
}

export interface PlaidTransactionsSyncRequest {
  access_token: string;
  cursor?: string;
  count?: number;
  options?: {
    include_original_description?: boolean;
    include_personal_finance_category?: boolean;
  };
}

export interface PlaidTransactionsSyncResponse {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: Array<{ transaction_id: string }>;
  next_cursor: string;
  has_more: boolean;
  request_id: string;
}

export interface PlaidTransactionsGetRequest {
  access_token: string;
  start_date: string;
  end_date: string;
  options?: {
    account_ids?: string[];
    count?: number;
    offset?: number;
    include_original_description?: boolean;
    include_personal_finance_category?: boolean;
  };
}

export interface PlaidTransactionsGetResponse {
  accounts: PlaidAccount[];
  transactions: PlaidTransaction[];
  total_transactions: number;
  item: PlaidItem;
  request_id: string;
}

// ==================== Identity ====================

export interface PlaidIdentityAddress {
  data: {
    street: string | null;
    city: string | null;
    region: string | null;
    postal_code: string | null;
    country: string | null;
  };
  primary: boolean;
}

export interface PlaidIdentityEmail {
  data: string;
  primary: boolean;
  type: string;
}

export interface PlaidIdentityPhoneNumber {
  data: string;
  primary: boolean;
  type: string;
}

export interface PlaidOwner {
  names: string[];
  phone_numbers: PlaidIdentityPhoneNumber[];
  emails: PlaidIdentityEmail[];
  addresses: PlaidIdentityAddress[];
}

export interface PlaidAccountWithOwners extends PlaidAccount {
  owners: PlaidOwner[];
}

export interface PlaidIdentityGetRequest {
  access_token: string;
  options?: {
    account_ids?: string[];
  };
}

export interface PlaidIdentityGetResponse {
  accounts: PlaidAccountWithOwners[];
  item: PlaidItem;
  request_id: string;
}

// ==================== Webhooks ====================

export type PlaidWebhookType =
  | "TRANSACTIONS"
  | "ITEM"
  | "AUTH"
  | "ASSETS"
  | "INVESTMENTS_TRANSACTIONS"
  | "HOLDINGS"
  | "LIABILITIES"
  | "PAYMENT_INITIATION"
  | "TRANSFER"
  | "INCOME"
  | "IDENTITY";

export type PlaidWebhookCode =
  | "INITIAL_UPDATE"
  | "HISTORICAL_UPDATE"
  | "DEFAULT_UPDATE"
  | "TRANSACTIONS_REMOVED"
  | "SYNC_UPDATES_AVAILABLE"
  | "ERROR"
  | "PENDING_EXPIRATION"
  | "USER_PERMISSION_REVOKED"
  | "USER_ACCOUNT_REVOKED"
  | "WEBHOOK_UPDATE_ACKNOWLEDGED"
  | "LOGIN_REPAIRED";

export interface PlaidWebhookPayload {
  webhook_type: PlaidWebhookType;
  webhook_code: PlaidWebhookCode;
  item_id: string;
  error: PlaidError | null;
  new_transactions?: number;
  removed_transactions?: string[];
  consent_expiration_time?: string;
  environment: PlaidEnvironment;
}

export interface PlaidWebhookVerificationKeyResponse {
  key: {
    alg: string;
    created_at: number;
    crv: string;
    expired_at: number | null;
    kid: string;
    kty: string;
    use: string;
    x: string;
    y: string;
  };
  request_id: string;
}

// ==================== Errors ====================

export interface PlaidError {
  error_type: string;
  error_code: string;
  error_message: string;
  display_message: string | null;
  request_id?: string;
  causes?: PlaidError[];
  status?: number;
  documentation_url?: string;
  suggested_action?: string;
}

// ==================== Client Config ====================

export interface PlaidClientConfig {
  clientId: string;
  secret: string;
  environment?: PlaidEnvironment;
  timeout?: number;
}

// ==================== N26 Business API Types ====================

/** ISO 4217 currency code */
export type CurrencyCode = string;

/** N26 account type */
export type N26AccountType = "CHECKING" | "SAVINGS" | "BUSINESS";

/** N26 account status */
export type N26AccountStatus = "ACTIVE" | "BLOCKED" | "CLOSED" | "PENDING_CLOSURE";

/** Transaction type */
export type N26TransactionType =
  | "PT" // Payment Transfer
  | "DT" // Direct Transfer
  | "CT" // Card Transaction
  | "DD" // Direct Debit
  | "AA" // ATM
  | "FT" // Fee Transaction
  | "INT"; // Interest

/** Transaction status */
export type N26TransactionStatus = "CONFIRMED" | "PENDING" | "CANCELLED" | "REVERTED";

// ==================== Accounts ====================

export interface N26Account {
  id: string;
  iban: string;
  bic: string;
  bankName: string;
  accountType: N26AccountType;
  status: N26AccountStatus;
  currency: CurrencyCode;
  ownerName: string;
  createdAt: number; // Unix timestamp in ms
}

export interface N26AccountsResponse {
  data: N26Account[];
  paging: N26Paging;
}

// ==================== Balances ====================

export interface N26Balance {
  availableBalance: number;
  usableBalance: number;
  bankBalance: number;
  currency: CurrencyCode;
  overdraftAmount?: number;
}

// ==================== Transactions ====================

export interface N26Transaction {
  id: string;
  userId: string;
  type: N26TransactionType;
  amount: number;
  currencyCode: CurrencyCode;
  originalAmount?: number;
  originalCurrency?: CurrencyCode;
  exchangeRate?: number;
  merchantName?: string;
  merchantCity?: string;
  merchantCountry?: string;
  mcc?: number; // Merchant Category Code
  visibleTS: number; // Visible timestamp in ms
  bookingDate: number; // Unix timestamp in ms
  valueDate: number;
  partnerIban?: string;
  partnerName?: string;
  partnerBic?: string;
  referenceText?: string;
  category?: string;
  status: N26TransactionStatus;
  smartLinkId?: string;
  linkId?: string;
  confirmed: number; // Unix timestamp in ms
}

export interface N26TransactionsResponse {
  data: N26Transaction[];
  paging: N26Paging;
}

export interface N26Paging {
  totalResults: number;
  limit: number;
  offset: number;
}

// ==================== Request Parameters ====================

export interface N26TransactionsParams {
  from?: number; // Unix timestamp in ms
  to?: number;   // Unix timestamp in ms
  limit?: number;
  offset?: number;
  textFilter?: string;
}

export interface N26ClientConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  redirectUri: string;
}

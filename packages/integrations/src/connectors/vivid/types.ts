// ==================== Vivid Money API Types ====================

/** ISO 4217 currency code */
export type CurrencyCode = string;

/** Account status in the Vivid system */
export type VividAccountStatus = "ACTIVE" | "BLOCKED" | "CLOSED";

/** Transaction status */
export type VividTransactionStatus =
  | "BOOKED"
  | "PENDING"
  | "CANCELLED"
  | "REVERSED";

/** Transaction direction */
export type VividTransactionDirection = "CREDIT" | "DEBIT";

// ==================== Monetary Amount ====================

export interface VividAmount {
  value: number;
  currency: CurrencyCode;
}

// ==================== Accounts ====================

export interface VividAccount {
  id: string;
  iban: string;
  bic: string;
  name: string;
  ownerName: string;
  status: VividAccountStatus;
  currency: CurrencyCode;
  createdAt: string;
}

export interface VividAccountsResponse {
  accounts: VividAccount[];
}

// ==================== Balances ====================

export interface VividBalance {
  accountId: string;
  available: VividAmount;
  booked: VividAmount;
  pending: VividAmount;
  asOf: string;
}

export interface VividBalanceResponse {
  balances: VividBalance[];
}

// ==================== Transactions ====================

export interface VividTransaction {
  id: string;
  accountId: string;
  amount: VividAmount;
  direction: VividTransactionDirection;
  status: VividTransactionStatus;
  bookingDate: string;
  valueDate: string;
  description: string;
  counterpartyName?: string;
  counterpartyIban?: string;
  reference?: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface VividTransactionsResponse {
  transactions: VividTransaction[];
  pagination: VividPagination;
}

export interface VividPagination {
  offset: number;
  limit: number;
  totalCount: number;
  hasMore: boolean;
}

// ==================== Request Parameters ====================

export interface VividTransactionsParams {
  accountId: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface VividClientConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  redirectUri: string;
}

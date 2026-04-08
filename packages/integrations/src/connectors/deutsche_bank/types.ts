// ==================== Deutsche Bank PSD2 API Types ====================
// Follows PSD2/XS2A with Deutsche Bank specific extensions

/** ISO 4217 currency code */
export type CurrencyCode = string;

/** Account product type */
export type DBAccountProductType =
  | "CURRENT_ACCOUNT"
  | "SAVINGS_ACCOUNT"
  | "LOAN_ACCOUNT"
  | "CARD_ACCOUNT";

/** Balance type */
export type DBBalanceType =
  | "closingBooked"
  | "expected"
  | "openingBooked"
  | "interimAvailable"
  | "interimBooked"
  | "forwardAvailable";

/** Booking status filter */
export type DBBookingStatus = "booked" | "pending" | "both";

// ==================== Monetary Amount ====================

export interface DBAmount {
  currencyCode: CurrencyCode;
  amount: string; // Decimal string
}

// ==================== Accounts ====================

export interface DBAccount {
  accountId: string;
  iban: string;
  bic?: string;
  currencyCode: CurrencyCode;
  accountType: string;
  productDescription?: string;
  productType?: DBAccountProductType;
  ownerName?: string;
  branchCode?: string;
}

export interface DBAccountsResponse {
  accounts: DBAccount[];
}

// ==================== Balances ====================

export interface DBBalance {
  balanceType: DBBalanceType;
  balanceAmount: DBAmount;
  creditLimitIncluded?: boolean;
  lastChangeDateTime?: string;
  referenceDate?: string;
}

export interface DBBalancesResponse {
  accountId: string;
  balances: DBBalance[];
}

// ==================== Transactions ====================

export interface DBTransaction {
  originIban?: string;
  amount: number;
  currencyCode: CurrencyCode;
  counterPartyName?: string;
  counterPartyIban?: string;
  counterPartyBic?: string;
  paymentReference?: string;
  bookingDate: string;
  valueDate: string;
  transactionCode?: string;
  externalBankTransactionDomainCode?: string;
  externalBankTransactionFamilyCode?: string;
  externalBankTransactionSubFamilyCode?: string;
  mandateReference?: string;
  creditorId?: string;
  e2eReference?: string;
  transactionId?: string;
}

export interface DBTransactionsResponse {
  transactions: DBTransaction[];
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
}

// ==================== Consent / Authorization ====================

export interface DBConsentAccess {
  iban: string;
}

export interface DBConsentRequest {
  accounts: DBConsentAccess[];
  balances: DBConsentAccess[];
  transactions: DBConsentAccess[];
  validUntil: string;
  frequencyPerDay: number;
  recurringIndicator: boolean;
}

export interface DBConsentResponse {
  consentId: string;
  consentStatus: "received" | "valid" | "rejected" | "expired" | "terminatedByTpp";
  _links: {
    scaRedirect?: { href: string };
    scaOAuth?: { href: string };
    status?: { href: string };
    [key: string]: { href: string } | undefined;
  };
}

// ==================== Request Parameters ====================

export interface DBTransactionsParams {
  accountId: string;
  dateFrom?: string;
  dateTo?: string;
  bookingStatus?: DBBookingStatus;
  limit?: number;
  page?: number;
}

export interface DBClientConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  redirectUri: string;
  /** PSU-IP-Address required by PSD2 regulation */
  psuIpAddress?: string;
  /** Active consent ID for account access */
  consentId?: string;
}

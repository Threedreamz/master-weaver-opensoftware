// ==================== Postbank PSD2 Open Banking API Types ====================
// Deutsche Postbank follows the Berlin Group NextGenPSD2 standard (via Deutsche Bank infrastructure)

/** ISO 4217 currency code */
export type CurrencyCode = string;

/** Balance type per PSD2 */
export type PostbankBalanceType =
  | "closingBooked"
  | "expected"
  | "openingBooked"
  | "interimAvailable"
  | "interimBooked"
  | "forwardAvailable";

/** Booking status filter */
export type PostbankBookingStatus = "booked" | "pending" | "both";

// ==================== Monetary Amount ====================

export interface PostbankAmount {
  currency: CurrencyCode;
  amount: string; // Decimal string
}

// ==================== Account Reference ====================

export interface PostbankAccountReference {
  iban?: string;
  bban?: string;
  currency?: CurrencyCode;
}

// ==================== Accounts ====================

export interface PostbankAccount {
  resourceId: string;
  iban: string;
  currency: CurrencyCode;
  name?: string;
  product?: string;
  cashAccountType?: string;
  status?: "enabled" | "deleted" | "blocked";
  bic?: string;
  ownerName?: string;
  _links?: Record<string, PostbankHrefLink>;
}

export interface PostbankAccountsResponse {
  accounts: PostbankAccount[];
}

// ==================== Balances ====================

export interface PostbankBalance {
  balanceAmount: PostbankAmount;
  balanceType: PostbankBalanceType;
  creditLimitIncluded?: boolean;
  lastChangeDateTime?: string;
  referenceDate?: string;
  lastCommittedTransaction?: string;
}

export interface PostbankBalancesResponse {
  account: PostbankAccountReference;
  balances: PostbankBalance[];
}

// ==================== Transactions ====================

export interface PostbankTransaction {
  transactionId?: string;
  entryReference?: string;
  endToEndId?: string;
  mandateId?: string;
  creditorId?: string;
  bookingDate?: string;
  valueDate?: string;
  transactionAmount: PostbankAmount;
  creditorName?: string;
  creditorAccount?: PostbankAccountReference;
  debtorName?: string;
  debtorAccount?: PostbankAccountReference;
  remittanceInformationUnstructured?: string;
  remittanceInformationStructured?: string;
  bankTransactionCode?: string;
  proprietaryBankTransactionCode?: string;
  additionalInformation?: string;
}

export interface PostbankTransactionsResponse {
  account: PostbankAccountReference;
  transactions: {
    booked: PostbankTransaction[];
    pending: PostbankTransaction[];
    _links?: Record<string, PostbankHrefLink>;
  };
}

// ==================== Consent ====================

export interface PostbankConsentRequest {
  access: {
    accounts?: PostbankAccountReference[];
    balances?: PostbankAccountReference[];
    transactions?: PostbankAccountReference[];
    availableAccounts?: "allAccounts" | "allAccountsWithOwnerName";
  };
  recurringIndicator: boolean;
  validUntil: string;
  frequencyPerDay: number;
  combinedServiceIndicator?: boolean;
}

export interface PostbankConsentResponse {
  consentId: string;
  consentStatus: "received" | "valid" | "rejected" | "expired" | "terminatedByTpp" | "revokedByPsu";
  _links: {
    scaRedirect?: PostbankHrefLink;
    scaOAuth?: PostbankHrefLink;
    status?: PostbankHrefLink;
    [key: string]: PostbankHrefLink | undefined;
  };
}

export interface PostbankConsentStatusResponse {
  consentStatus: string;
}

// ==================== Shared ====================

export interface PostbankHrefLink {
  href: string;
}

// ==================== Request Parameters ====================

export interface PostbankTransactionsParams {
  accountId: string;
  dateFrom?: string;
  dateTo?: string;
  bookingStatus?: PostbankBookingStatus;
  withBalance?: boolean;
}

// ==================== Client Config ====================

export interface PostbankClientConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  redirectUri: string;
  /** PSU-IP-Address header required by PSD2 */
  psuIpAddress?: string;
  /** Active consent ID */
  consentId?: string;
}

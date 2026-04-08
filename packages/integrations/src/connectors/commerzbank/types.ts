// ==================== Commerzbank PSD2 Open Banking API Types ====================
// Follows the Berlin Group NextGenPSD2 standard (XS2A)

/** ISO 4217 currency code */
export type CurrencyCode = string;

/** Account status per PSD2 */
export type PSD2AccountStatus = "enabled" | "deleted" | "blocked";

/** Balance type per Berlin Group specification */
export type BalanceType =
  | "closingBooked"
  | "expected"
  | "openingBooked"
  | "interimAvailable"
  | "interimBooked"
  | "forwardAvailable"
  | "nonInvoiced";

/** Booking status for transaction queries */
export type BookingStatus = "booked" | "pending" | "both";

/** Transaction status per PSD2 */
export type TransactionStatus = "booked" | "pending";

// ==================== Monetary Amount ====================

export interface PSD2Amount {
  currency: CurrencyCode;
  amount: string; // Decimal string per Berlin Group spec
}

// ==================== Account Reference ====================

export interface AccountReference {
  iban?: string;
  bban?: string;
  pan?: string;
  maskedPan?: string;
  msisdn?: string;
  currency?: CurrencyCode;
}

// ==================== Accounts ====================

export interface CommerzbankAccount {
  resourceId: string;
  iban: string;
  bban?: string;
  currency: CurrencyCode;
  name?: string;
  product?: string;
  cashAccountType?: string;
  status?: PSD2AccountStatus;
  bic?: string;
  ownerName?: string;
  _links?: Record<string, HrefLink>;
}

export interface CommerzbankAccountsResponse {
  accounts: CommerzbankAccount[];
}

// ==================== Balances ====================

export interface CommerzbankBalance {
  balanceAmount: PSD2Amount;
  balanceType: BalanceType;
  creditLimitIncluded?: boolean;
  lastChangeDateTime?: string;
  referenceDate?: string;
  lastCommittedTransaction?: string;
}

export interface CommerzbankBalancesResponse {
  account: AccountReference;
  balances: CommerzbankBalance[];
}

// ==================== Transactions ====================

export interface CommerzbankTransaction {
  transactionId?: string;
  entryReference?: string;
  endToEndId?: string;
  mandateId?: string;
  checkId?: string;
  creditorId?: string;
  bookingDate?: string;
  valueDate?: string;
  transactionAmount: PSD2Amount;
  creditorName?: string;
  creditorAccount?: AccountReference;
  debtorName?: string;
  debtorAccount?: AccountReference;
  remittanceInformationUnstructured?: string;
  remittanceInformationStructured?: string;
  additionalInformation?: string;
  purposeCode?: string;
  bankTransactionCode?: string;
  proprietaryBankTransactionCode?: string;
}

export interface CommerzbankTransactionsResponse {
  account: AccountReference;
  transactions: {
    booked: CommerzbankTransaction[];
    pending: CommerzbankTransaction[];
    _links?: Record<string, HrefLink>;
  };
}

// ==================== Consent ====================

export interface ConsentRequest {
  access: {
    accounts?: AccountReference[];
    balances?: AccountReference[];
    transactions?: AccountReference[];
    availableAccounts?: "allAccounts" | "allAccountsWithOwnerName";
  };
  recurringIndicator: boolean;
  validUntil: string;
  frequencyPerDay: number;
  combinedServiceIndicator?: boolean;
}

export interface ConsentResponse {
  consentId: string;
  consentStatus: "received" | "valid" | "rejected" | "expired" | "terminatedByTpp";
  _links: {
    scaRedirect?: HrefLink;
    scaOAuth?: HrefLink;
    status?: HrefLink;
    [key: string]: HrefLink | undefined;
  };
}

export interface ConsentStatusResponse {
  consentStatus: string;
}

// ==================== Shared ====================

export interface HrefLink {
  href: string;
}

// ==================== Request Parameters ====================

export interface CommerzbankTransactionsParams {
  accountId: string;
  dateFrom?: string;
  dateTo?: string;
  bookingStatus?: BookingStatus;
  withBalance?: boolean;
}

export interface CommerzbankClientConfig {
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

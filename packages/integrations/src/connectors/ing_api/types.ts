// ==================== ING Open Banking PSD2 API Types ====================
// Follows the Berlin Group NextGenPSD2 standard

/** ISO 4217 currency code */
export type CurrencyCode = string;

/** Balance type per PSD2 */
export type INGBalanceType =
  | "closingBooked"
  | "expected"
  | "openingBooked"
  | "interimAvailable"
  | "interimBooked"
  | "forwardAvailable";

/** Booking status filter */
export type INGBookingStatus = "booked" | "pending" | "both";

/** Account type */
export type INGAccountType = "CACC" | "SVGS" | "CARD" | "LOAN";

// ==================== Monetary Amount ====================

export interface INGAmount {
  currency: CurrencyCode;
  amount: string; // Decimal string
}

// ==================== Account Reference ====================

export interface INGAccountReference {
  iban?: string;
  bban?: string;
  currency?: CurrencyCode;
}

// ==================== Accounts ====================

export interface INGAccount {
  resourceId: string;
  iban: string;
  currency: CurrencyCode;
  name?: string;
  product?: string;
  cashAccountType?: INGAccountType;
  status?: "enabled" | "deleted" | "blocked";
  bic?: string;
  ownerName?: string;
  _links?: Record<string, INGHrefLink>;
}

export interface INGAccountsResponse {
  accounts: INGAccount[];
}

// ==================== Balances ====================

export interface INGBalance {
  balanceAmount: INGAmount;
  balanceType: INGBalanceType;
  creditLimitIncluded?: boolean;
  lastChangeDateTime?: string;
  referenceDate?: string;
  lastCommittedTransaction?: string;
}

export interface INGBalancesResponse {
  account: INGAccountReference;
  balances: INGBalance[];
}

// ==================== Transactions ====================

export interface INGTransaction {
  transactionId?: string;
  entryReference?: string;
  endToEndId?: string;
  mandateId?: string;
  creditorId?: string;
  bookingDate?: string;
  valueDate?: string;
  transactionAmount: INGAmount;
  creditorName?: string;
  creditorAccount?: INGAccountReference;
  debtorName?: string;
  debtorAccount?: INGAccountReference;
  remittanceInformationUnstructured?: string;
  remittanceInformationStructured?: string;
  bankTransactionCode?: string;
  proprietaryBankTransactionCode?: string;
  additionalInformation?: string;
}

export interface INGTransactionsResponse {
  account: INGAccountReference;
  transactions: {
    booked: INGTransaction[];
    pending: INGTransaction[];
    _links?: Record<string, INGHrefLink>;
  };
}

// ==================== Consent ====================

export interface INGConsentRequest {
  access: {
    accounts?: INGAccountReference[];
    balances?: INGAccountReference[];
    transactions?: INGAccountReference[];
    availableAccounts?: "allAccounts" | "allAccountsWithOwnerName";
  };
  recurringIndicator: boolean;
  validUntil: string;
  frequencyPerDay: number;
  combinedServiceIndicator?: boolean;
}

export interface INGConsentResponse {
  consentId: string;
  consentStatus: "received" | "valid" | "rejected" | "expired" | "terminatedByTpp" | "revokedByPsu";
  _links: {
    scaRedirect?: INGHrefLink;
    scaOAuth?: INGHrefLink;
    status?: INGHrefLink;
    [key: string]: INGHrefLink | undefined;
  };
}

export interface INGConsentStatusResponse {
  consentStatus: string;
}

// ==================== Shared ====================

export interface INGHrefLink {
  href: string;
}

// ==================== Request Parameters ====================

export interface INGTransactionsParams {
  accountId: string;
  dateFrom?: string;
  dateTo?: string;
  bookingStatus?: INGBookingStatus;
  withBalance?: boolean;
}

// ==================== Client Config ====================

export interface INGClientConfig {
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

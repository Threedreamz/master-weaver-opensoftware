// ==================== Kontist API Types ====================
// Kontist is a German banking app for freelancers and self-employed professionals

/** Kontist transaction type */
export type KontistTransactionType =
  | "SEPA_CREDIT_TRANSFER"
  | "SEPA_DIRECT_DEBIT"
  | "SEPA_DIRECT_DEBIT_RETURN"
  | "SEPA_CREDIT_TRANSFER_RETURN"
  | "CARD_TRANSACTION"
  | "CARD_TRANSACTION_REVERSAL"
  | "COMMISSION"
  | "INTEREST"
  | "ATM"
  | "CANCELLATION"
  | "REBOOKING"
  | "INTERNAL_TRANSFER"
  | string;

/** Kontist transaction status */
export type KontistTransactionStatus =
  | "ACCEPTED"
  | "BOOKED"
  | "CANCELLED"
  | "DECLINED"
  | "PENDING"
  | string;

/** Kontist tax category */
export type KontistTaxCategory =
  | "tax_payment"
  | "vat_payment"
  | "private"
  | "business"
  | "not_categorized"
  | string;

/** Kontist transfer type */
export type KontistTransferType =
  | "SEPA_TRANSFER"
  | "TIMED_ORDER"
  | "STANDING_ORDER";

// ==================== User / Account ====================

export interface KontistUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  nationality?: string;
  birthDate?: string;
  birthPlace?: string;
  address?: KontistAddress;
  taxInfo?: KontistTaxInfo;
  createdAt: string;
}

export interface KontistAddress {
  street?: string;
  supplement?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

export interface KontistTaxInfo {
  taxId?: string;
  vatId?: string;
  taxNumber?: string;
  taxAuthority?: string;
  taxRate?: number;
  vatExempt?: boolean;
}

export interface KontistAccount {
  id: string;
  iban: string;
  bic: string;
  balance: number;
  availableBalance: number;
  cardHolderRepresentation?: string;
  accountLimit?: number;
  lockingStatus?: "BLOCK" | "NO_BLOCK" | "DEBIT_BLOCK" | "CREDIT_BLOCK";
}

// ==================== Transactions ====================

export interface KontistTransaction {
  id: string;
  amount: number;
  name?: string;
  iban?: string;
  bic?: string;
  type: KontistTransactionType;
  bookingDate?: string;
  valutaDate?: string;
  originalAmount?: number;
  foreignCurrency?: string;
  e2eId?: string;
  mandateNumber?: string;
  description?: string;
  purpose?: string;
  bookingType?: string;
  transactionId?: string;
  status: KontistTransactionStatus;
  category?: KontistTaxCategory;
  userSelectedBookingDate?: string;
  personalNote?: string;
  vatRate?: number;
  vatAmount?: number;
  createdAt: string;
}

export interface KontistTransactionsResponse {
  items: KontistTransaction[];
  paging: KontistPaging;
}

export interface KontistTransactionsParams {
  from?: string;       // ISO 8601 date
  to?: string;         // ISO 8601 date
  type?: KontistTransactionType;
  status?: KontistTransactionStatus;
  category?: KontistTaxCategory;
  page?: number;
  pageSize?: number;
}

// ==================== Tax Estimates ====================

export interface KontistTaxEstimate {
  year: number;
  month?: number;
  incomeTax: number;
  solidarityTax: number;
  churchTax: number;
  tradeIncomeTax: number;
  vatAmount: number;
  totalTax: number;
  income: number;
  expenses: number;
  profit: number;
  vatCollected: number;
  vatPaid: number;
  vatBalance: number;
}

export interface KontistAnnualTaxEstimate {
  year: number;
  estimates: KontistTaxEstimate;
  quarterlyEstimates?: KontistQuarterlyEstimate[];
}

export interface KontistQuarterlyEstimate {
  quarter: 1 | 2 | 3 | 4;
  incomeTaxPrepayment: number;
  solidarityTaxPrepayment: number;
  tradeIncomeTaxPrepayment: number;
  vatPrepayment: number;
  totalPrepayment: number;
  dueDate: string;
}

// ==================== Transfers ====================

export interface KontistCreateTransferRequest {
  recipient: string;
  iban: string;
  bic?: string;
  amount: number;
  purpose?: string;
  e2eId?: string;
  category?: KontistTaxCategory;
}

export interface KontistTransfer {
  id: string;
  status: "AUTHORIZED" | "CONFIRMED" | "BOOKED" | "DECLINED" | "CANCELLED";
  amount: number;
  recipient: string;
  iban: string;
  bic?: string;
  purpose?: string;
  e2eId?: string;
  category?: KontistTaxCategory;
  createdAt: string;
  executionDate?: string;
}

export interface KontistCreateStandingOrderRequest {
  recipient: string;
  iban: string;
  bic?: string;
  amount: number;
  purpose?: string;
  e2eId?: string;
  firstExecutionDate: string;
  lastExecutionDate?: string;
  frequency: "MONTHLY" | "QUARTERLY" | "SEMI_ANNUALLY" | "ANNUALLY";
  category?: KontistTaxCategory;
}

export interface KontistStandingOrder {
  id: string;
  status: "ACTIVE" | "CANCELLED";
  amount: number;
  recipient: string;
  iban: string;
  purpose?: string;
  frequency: string;
  firstExecutionDate: string;
  lastExecutionDate?: string;
  nextExecutionDate?: string;
  createdAt: string;
}

// ==================== Pagination ====================

export interface KontistPaging {
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
}

// ==================== Client Config ====================

export interface KontistClientConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  redirectUri: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

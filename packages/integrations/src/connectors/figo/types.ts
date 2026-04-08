// ==================== figo / finAPI Types ====================
// finAPI is the successor to figo. This client targets the finAPI RESTful Services API.

/** finAPI bank connection status */
export type FinAPIConnectionStatus =
  | "IN_PROGRESS"
  | "READY"
  | "ERROR"
  | "DEPRECATED";

/** finAPI bank connection update status */
export type FinAPIUpdateStatus =
  | "NOT_YET_RUN"
  | "IN_PROGRESS"
  | "READY"
  | "ERROR";

/** finAPI account type */
export type FinAPIAccountType =
  | "Checking"
  | "Savings"
  | "CreditCard"
  | "Security"
  | "Loan"
  | "Pocket"
  | "Membership"
  | "Bausparen";

/** finAPI transaction direction */
export type FinAPITransactionDirection = "all" | "income" | "spending";

/** finAPI category type */
export type FinAPICategoryType = "CUSTOM" | "DEFAULT";

// ==================== Bank / Bank Connection ====================

export interface FinAPIBank {
  id: number;
  name: string;
  bic?: string;
  blz?: string;
  loginHint?: string;
  city?: string;
  isSupported: boolean;
  isTestBank: boolean;
  loginFieldUserId?: string;
  loginFieldCustomerId?: string;
  loginFieldPin?: string;
  pinsAreVolatile: boolean;
  popularity: number;
  health: number;
  lastCommunicationAttempt?: string;
  lastSuccessfulCommunication?: string;
}

export interface FinAPIBankConnection {
  id: number;
  bankId: number;
  name?: string;
  bankingUserId?: string;
  bankingCustomerId?: string;
  bankingPin?: string;
  type: "ONLINE" | "DEMO";
  updateStatus: FinAPIUpdateStatus;
  categorizationStatus: "NOT_YET_CATEGORIZED" | "CATEGORIZATION_IN_PROGRESS" | "CATEGORIZED";
  lastManualUpdate?: FinAPIUpdateResult;
  lastAutoUpdate?: FinAPIUpdateResult;
  accountIds: number[];
  ownerIds?: number[];
}

export interface FinAPIUpdateResult {
  result: "OK" | "BANK_SERVER_REJECTION" | "INTERNAL_SERVER_ERROR";
  errorMessage?: string;
  errorType?: string;
  timestamp: string;
}

export interface FinAPIImportBankConnectionRequest {
  bankId: number;
  bankingUserId?: string;
  bankingCustomerId?: string;
  bankingPin?: string;
  storePin?: boolean;
  name?: string;
  skipPositionsDownload?: boolean;
  loadOwnerData?: boolean;
  maxDaysForDownload?: number;
  accountReferences?: Array<{
    iban: string;
  }>;
  challengeResponse?: string;
  redirectUrl?: string;
}

export interface FinAPIImportBankConnectionResponse {
  id: number;
  bankId: number;
  name?: string;
  updateStatus: FinAPIUpdateStatus;
  accountIds: number[];
  challengeMessage?: string;
  redirectUrl?: string;
}

// ==================== Accounts ====================

export interface FinAPIAccount {
  id: number;
  bankConnectionId: number;
  accountName?: string;
  accountNumber?: string;
  subAccountNumber?: string;
  iban?: string;
  accountHolderName?: string;
  accountHolderId?: string;
  accountCurrency?: string;
  accountType: FinAPIAccountType;
  balance?: number;
  overdraft?: number;
  overdraftLimit?: number;
  availableFunds?: number;
  lastSuccessfulUpdate?: string;
  lastUpdateAttempt?: string;
  isNew: boolean;
  status: "UPDATED" | "UPDATED_FIXED" | "DOWNLOAD_IN_PROGRESS" | "DOWNLOAD_FAILED" | "DEPRECATED";
}

export interface FinAPIAccountsResponse {
  accounts: FinAPIAccount[];
  paging: FinAPIPaging;
}

export interface FinAPIAccountsParams {
  ids?: number[];
  search?: string;
  accountTypeIds?: number[];
  bankConnectionIds?: number[];
  minLastSuccessfulUpdate?: string;
  maxLastSuccessfulUpdate?: string;
  minBalance?: number;
  maxBalance?: number;
  page?: number;
  perPage?: number;
  order?: string[];
}

// ==================== Transactions ====================

export interface FinAPITransaction {
  id: number;
  parentId?: number;
  accountId: number;
  valueDate: string;
  bankBookingDate: string;
  finapiBookingDate: string;
  amount: number;
  currency?: string;
  purpose?: string;
  counterpartName?: string;
  counterpartAccountNumber?: string;
  counterpartIban?: string;
  counterpartBlz?: string;
  counterpartBic?: string;
  counterpartBankName?: string;
  counterpartMandateReference?: string;
  counterpartCustomerReference?: string;
  counterpartCreditorId?: string;
  counterpartDebitorId?: string;
  endToEndReference?: string;
  type?: string;
  typeCodeZka?: string;
  typeCodeSwift?: string;
  sepaPurposeCode?: string;
  primaNotaNumber?: string;
  category?: FinAPICategory;
  labels?: FinAPILabel[];
  isPotentialDuplicate: boolean;
  isAdjustingEntry: boolean;
  isNew: boolean;
}

export interface FinAPITransactionsResponse {
  transactions: FinAPITransaction[];
  paging: FinAPIPaging;
}

export interface FinAPITransactionsParams {
  view: "bankView" | "userView";
  ids?: number[];
  search?: string;
  counterpart?: string;
  purpose?: string;
  accountIds?: number[];
  minBankBookingDate?: string;
  maxBankBookingDate?: string;
  minFinapiBookingDate?: string;
  maxFinapiBookingDate?: string;
  minAmount?: number;
  maxAmount?: number;
  direction?: FinAPITransactionDirection;
  labelIds?: number[];
  categoryIds?: number[];
  isNew?: boolean;
  isPotentialDuplicate?: boolean;
  isAdjustingEntry?: boolean;
  minImportDate?: string;
  maxImportDate?: string;
  page?: number;
  perPage?: number;
  order?: string[];
}

// ==================== Categories ====================

export interface FinAPICategory {
  id: number;
  name: string;
  parentId?: number;
  parentName?: string;
  isCustom: boolean;
  children?: FinAPICategory[];
}

export interface FinAPICategoriesResponse {
  categories: FinAPICategory[];
  paging: FinAPIPaging;
}

// ==================== Labels ====================

export interface FinAPILabel {
  id: number;
  name: string;
}

export interface FinAPILabelsResponse {
  labels: FinAPILabel[];
  paging: FinAPIPaging;
}

// ==================== Categorization ====================

export interface FinAPICategorizeTransactionsRequest {
  transactionIds: number[];
  categoryId: number;
}

// ==================== Pagination ====================

export interface FinAPIPaging {
  page: number;
  perPage: number;
  pageCount: number;
  totalCount: number;
}

// ==================== Client Config ====================

export interface FigoClientConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  redirectUri: string;
  /** Use sandbox environment (default: false) */
  sandbox?: boolean;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

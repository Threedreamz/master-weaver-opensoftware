// ==================== Wise (TransferWise) API Types ====================

/** Wise API environment */
export type WiseEnvironment = "sandbox" | "production";

/** Profile type */
export type WiseProfileType = "personal" | "business";

/** Transfer status lifecycle */
export type WiseTransferStatus =
  | "incoming_payment_waiting"
  | "incoming_payment_initiated"
  | "processing"
  | "funds_converted"
  | "outgoing_payment_sent"
  | "cancelled"
  | "funds_refunded"
  | "bounced_back"
  | "charged_back"
  | "unknown";

/** Quote status */
export type WiseQuoteStatus = "PENDING" | "ACCEPTED" | "FUNDED" | "EXPIRED";

/** Quote rate type */
export type WiseRateType = "FIXED" | "FLOATING";

/** Balance account type */
export type WiseBalanceType = "STANDARD" | "SAVINGS";

/** Transfer type */
export type WiseTransferType = "balance" | "regular";

// ==================== Profiles ====================

export interface WiseProfileDetails {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  companyName?: string;
  companyType?: string;
  registrationNumber?: string;
  acn?: string;
  abn?: string;
  arbn?: string;
  webpage?: string;
  primaryAddress?: number;
  description?: string;
}

export interface WiseProfile {
  id: number;
  type: WiseProfileType;
  details: WiseProfileDetails;
  createdAt: string;
  updatedAt: string;
}

// ==================== Accounts (Recipients) ====================

export interface WiseAccountDetails {
  /** Fields vary by recipient type and currency */
  [key: string]: unknown;
  legalType?: "PRIVATE" | "BUSINESS";
  accountHolderName?: string;
  accountNumber?: string;
  sortCode?: string;
  iban?: string;
  bic?: string;
  abartn?: string;
  address?: {
    country: string;
    city: string;
    postCode: string;
    firstLine: string;
  };
}

export interface WiseAccount {
  id: number;
  profile: number;
  accountHolderName: string;
  type: string;
  country: string;
  currency: string;
  details: WiseAccountDetails;
  isDefaultAccount: boolean;
  active: boolean;
  ownedByCustomer: boolean;
}

export interface WiseAccountCreateRequest {
  profile: number;
  accountHolderName: string;
  currency: string;
  type: string;
  details: WiseAccountDetails;
  ownedByCustomer?: boolean;
}

export interface WiseAccountListParams {
  profile?: number;
  currency?: string;
}

export interface WiseAccountRequirements {
  type: string;
  title: string;
  usageInfo: string | null;
  fields: Array<{
    name: string;
    group: Array<{
      key: string;
      name: string;
      type: string;
      refreshRequirementsOnChange: boolean;
      required: boolean;
      displayFormat: string | null;
      example: string;
      minLength: number | null;
      maxLength: number | null;
      validationRegexp: string | null;
      validationAsync: string | null;
      valuesAllowed: Array<{ key: string; name: string }> | null;
    }>;
  }>;
}

// ==================== Quotes ====================

export interface WiseQuote {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number | null;
  targetAmount: number | null;
  type: WiseRateType;
  rate: number;
  createdTime: string;
  user: number;
  profile: number;
  rateExpirationTime: string;
  guaranteedTargetAmountAllowed: boolean;
  targetAmountAllowed: boolean;
  guaranteedTargetAmount: boolean;
  providedAmountType: "SOURCE" | "TARGET";
  paymentOptions: WisePaymentOption[];
  status: WiseQuoteStatus;
  expirationTime: string;
  notices: Array<{
    text: string;
    link: string | null;
    type: "WARNING" | "INFO" | "BLOCKED";
  }>;
}

export interface WisePaymentOption {
  disabled: boolean;
  estimatedDelivery: string;
  formattedEstimatedDelivery: string;
  estimatedDeliveryDelays: string[];
  fee: {
    transferwise: number;
    payIn: number;
    discount: number;
    partner: number;
    total: number;
  };
  sourceAmount: number;
  targetAmount: number;
  sourceCurrency: string;
  targetCurrency: string;
  payIn: string;
  payOut: string;
  allowedProfileTypes: WiseProfileType[];
}

export interface WiseQuoteCreateRequest {
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount?: number;
  targetAmount?: number;
  profile: number;
  targetAccount?: number;
  payOut?: string;
  preferredPayIn?: string;
}

// ==================== Transfers ====================

export interface WiseTransfer {
  id: number;
  user: number;
  targetAccount: number;
  sourceAccount: number | null;
  quote: number;
  quoteUuid: string;
  status: WiseTransferStatus;
  reference: string;
  rate: number;
  created: string;
  business: number | null;
  transferRequest: number | null;
  details: {
    reference: string;
  };
  hasActiveIssues: boolean;
  sourceCurrency: string;
  sourceValue: number;
  targetCurrency: string;
  targetValue: number;
  customerTransactionId: string;
}

export interface WiseTransferCreateRequest {
  targetAccount: number;
  quoteUuid: string;
  customerTransactionId: string;
  details?: {
    reference?: string;
    transferPurpose?: string;
    transferPurposeSubTransferPurpose?: string;
    sourceOfFunds?: string;
  };
}

export interface WiseTransferListParams {
  profile?: number;
  status?: WiseTransferStatus;
  sourceCurrency?: string;
  targetCurrency?: string;
  createdDateStart?: string;
  createdDateEnd?: string;
  limit?: number;
  offset?: number;
}

export interface WiseFundTransferRequest {
  type: WiseTransferType;
}

export interface WiseFundTransferResponse {
  type: WiseTransferType;
  status: "COMPLETED" | "REJECTED";
  errorCode: string | null;
  errorMessage: string | null;
  balanceTransactionId: number | null;
}

// ==================== Balances ====================

export interface WiseBalance {
  id: number;
  currency: string;
  type: WiseBalanceType;
  amount: {
    value: number;
    currency: string;
  };
  reservedAmount: {
    value: number;
    currency: string;
  };
  bankDetails: WiseBalanceBankDetails | null;
  creationTime: string;
  modificationTime: string;
  visible: boolean;
}

export interface WiseBalanceBankDetails {
  id: number;
  currency: string;
  bankCode: string | null;
  accountNumber: string | null;
  swift: string | null;
  iban: string | null;
  bankName: string | null;
  accountHolderName: string | null;
  bankAddress: {
    addressFirstLine: string;
    postCode: string;
    city: string;
    country: string;
    stateCode: string | null;
  } | null;
}

export interface WiseBalanceStatement {
  accountHolder: {
    type: WiseProfileType;
    address: {
      addressFirstLine: string;
      city: string;
      postCode: string;
      stateCode: string | null;
      country: string;
    };
    firstName: string | null;
    lastName: string | null;
  };
  issuer: {
    name: string;
    firstLine: string;
    city: string;
    postCode: string;
    stateCode: string | null;
    country: string;
  };
  bankDetails: WiseBalanceBankDetails | null;
  transactions: WiseBalanceStatementTransaction[];
  startOfStatementBalance: { value: number; currency: string };
  endOfStatementBalance: { value: number; currency: string };
  query: {
    intervalStart: string;
    intervalEnd: string;
    type: string;
    currency: string;
  };
}

export interface WiseBalanceStatementTransaction {
  type: string;
  date: string;
  amount: { value: number; currency: string };
  totalFees: { value: number; currency: string };
  details: {
    type: string;
    description: string;
    senderName: string | null;
    senderAccount: string | null;
    paymentReference: string | null;
    category: string | null;
    merchant: {
      name: string | null;
      firstLine: string | null;
      postCode: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      category: string | null;
    } | null;
  };
  exchangeDetails: {
    forAmount: { value: number; currency: string };
    rate: number | null;
  } | null;
  runningBalance: { value: number; currency: string };
  referenceNumber: string;
}

export interface WiseBalanceStatementParams {
  currency: string;
  intervalStart: string;
  intervalEnd: string;
  type?: "COMPACT" | "FLAT";
}

// ==================== Webhooks ====================

export type WiseWebhookEventType =
  | "transfers#state-change"
  | "transfers#active-cases"
  | "balances#credit"
  | "balances#update"
  | "profiles#verification-state-change";

export interface WiseWebhookPayload {
  data: {
    resource: {
      id: number;
      profile_id: number;
      account_id: number;
      type: string;
    };
    current_state: string;
    previous_state: string;
    occurred_at: string;
  };
  subscription_id: string;
  event_type: WiseWebhookEventType;
  schema_version: string;
  sent_at: string;
}

export interface WiseWebhookSubscription {
  id: string;
  name: string;
  delivery: {
    version: string;
    url: string;
  };
  trigger_on: WiseWebhookEventType;
  scope: {
    domain: string;
    id: string;
  };
  created_by: {
    type: string;
    id: string;
  };
  created_at: string;
}

export interface WiseWebhookSubscriptionCreateRequest {
  name: string;
  trigger_on: WiseWebhookEventType;
  delivery: {
    version: "2.0.0";
    url: string;
  };
}

// ==================== Errors ====================

export interface WiseApiError {
  type: string;
  errors: Array<{
    code: string;
    message: string;
    path: string;
    arguments: unknown[];
  }>;
}

// ==================== Client Config ====================

export interface WiseClientConfig {
  apiToken: string;
  environment?: WiseEnvironment;
  timeout?: number;
}

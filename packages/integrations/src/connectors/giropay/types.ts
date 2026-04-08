// ==================== giropay API Types ====================

/** giropay transaction status */
export type GiropayTransactionStatus =
  | "CREATED"
  | "STARTED"
  | "PENDING"
  | "FINISHED"
  | "EXPIRED"
  | "ERROR";

/** giropay result codes */
export type GiropayResultCode =
  | 0    // OK
  | 4000 // Bank not found
  | 4001 // Bank not supported
  | 4002 // BIC not found
  | 4500 // Payment expired
  | 4501 // Payment cancelled
  | 4502 // Payment rejected
  | 4900 // General error
  | number;

// ==================== Bank Status / Issuer ====================

export interface GiropayBankStatus {
  bic: string;
  bankname: string;
  giropay: boolean;
  giropayid: boolean;
}

export interface GiropayBankStatusRequest {
  bic: string;
}

export interface GiropayBankStatusResponse {
  rc: GiropayResultCode;
  msg: string;
  bic?: string;
  bankname?: string;
  giropay?: number;
  giropayid?: number;
}

// ==================== Payment Initiation ====================

export interface GiropayInitPaymentRequest {
  merchantId: string;
  projectId: string;
  merchantTxId: string;
  amount: number;       // Minor units (cents)
  currency: string;     // ISO 4217 (EUR)
  purpose: string;      // Payment purpose (max 27 chars)
  bic?: string;
  iban?: string;
  urlRedirect: string;
  urlNotify: string;
  type?: "SALE" | "AUTH";
  expiryDate?: string;  // ISO 8601 datetime
  info1Label?: string;
  info1Text?: string;
  info2Label?: string;
  info2Text?: string;
  info3Label?: string;
  info3Text?: string;
  info4Label?: string;
  info4Text?: string;
  info5Label?: string;
  info5Text?: string;
}

export interface GiropayInitPaymentResponse {
  rc: GiropayResultCode;
  msg: string;
  reference?: string;
  redirect?: string;
}

// ==================== Payment Status ====================

export interface GiropayPaymentStatusRequest {
  merchantId: string;
  projectId: string;
  reference: string;
}

export interface GiropayPaymentStatusResponse {
  rc: GiropayResultCode;
  msg: string;
  reference?: string;
  merchantTxId?: string;
  backendTxId?: string;
  amount?: number;
  currency?: string;
  resultPayment?: GiropayResultCode;
  reconNr?: string;
  obName?: string;
  obBic?: string;
  obIban?: string;
  finalised?: string;
  age?: number;
}

// ==================== Notification ====================

export interface GiropayNotification {
  gcReference: string;
  gcMerchantTxId: string;
  gcBackendTxId: string;
  gcAmount: string;
  gcCurrency: string;
  gcResultPayment: string;
  gcHash: string;
  gcObName?: string;
  gcObBic?: string;
  gcObIban?: string;
}

// ==================== Client Config ====================

export interface GiropayClientConfig {
  merchantId: string;
  projectId: string;
  apiKey: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

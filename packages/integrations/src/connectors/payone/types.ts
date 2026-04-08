// ==================== PAYONE API Types ====================

/** PAYONE request types */
export type PayoneRequestType =
  | "preauthorization"
  | "authorization"
  | "capture"
  | "refund"
  | "debit"
  | "voidauthorization";

/** PAYONE clearing types */
export type PayoneClearingType =
  | "elv"  // SEPA direct debit
  | "cc"   // Credit card
  | "wlt"  // e-wallet
  | "sb"   // Online bank transfer
  | "fnc"  // Financing
  | "vor"  // Prepayment
  | "rec"  // Invoice
  | "cod"; // Cash on delivery

/** PAYONE response status */
export type PayoneStatus =
  | "APPROVED"
  | "REDIRECT"
  | "PENDING"
  | "ERROR";

// ==================== Common Parameters ====================

export interface PayoneBaseRequest {
  mid: string;           // Merchant ID
  portalid: string;      // Portal ID
  key: string;           // API key (MD5 hashed)
  mode: "test" | "live";
  api_version: string;
  encoding: "UTF-8";
}

export interface PayonePersonalData {
  salutation?: string;
  title?: string;
  firstname?: string;
  lastname?: string;
  company?: string;
  street?: string;
  addressaddition?: string;
  zip?: string;
  city?: string;
  country?: string; // ISO 3166 two-letter
  email?: string;
  telephonenumber?: string;
  birthday?: string; // YYYYMMDD
  language?: string; // ISO 639
  ip?: string;
}

export interface PayonePaymentData {
  clearingtype: PayoneClearingType;
  reference: string;
  amount: number;     // Minor units (cents)
  currency: string;   // ISO 4217
  narrative_text?: string;
  param?: string;
}

// ==================== Credit Card ====================

export interface PayoneCreditCardData {
  cardpan?: string;
  cardtype?: "V" | "M" | "A" | "D" | "J" | "O" | "P" | "U";
  cardexpiredate?: string; // YYMM
  cardcvc2?: string;
  pseudocardpan?: string;  // Tokenized PAN from client SDK
  cardholder?: string;
}

// ==================== SEPA / ELV ====================

export interface PayoneSepaData {
  iban: string;
  bic?: string;
  bankcountry?: string;
  bankaccount?: string;
  bankcode?: string;
  mandate_identification?: string;
}

// ==================== Preauthorization ====================

export interface PayonePreauthorizationRequest
  extends PayoneBaseRequest,
    PayonePersonalData,
    PayonePaymentData {
  request: "preauthorization";
  aid: string; // Account ID (sub-account)
  successurl?: string;
  errorurl?: string;
  backurl?: string;
  // Credit card or SEPA fields
  pseudocardpan?: string;
  iban?: string;
  bic?: string;
}

export interface PayonePreauthorizationResponse {
  status: PayoneStatus;
  txid?: string;
  userid?: string;
  redirecturl?: string;
  errorcode?: string;
  errormessage?: string;
  customermessage?: string;
}

// ==================== Authorization ====================

export interface PayoneAuthorizationRequest
  extends PayoneBaseRequest,
    PayonePersonalData,
    PayonePaymentData {
  request: "authorization";
  aid: string;
  successurl?: string;
  errorurl?: string;
  backurl?: string;
  pseudocardpan?: string;
  iban?: string;
  bic?: string;
}

export interface PayoneAuthorizationResponse {
  status: PayoneStatus;
  txid?: string;
  userid?: string;
  redirecturl?: string;
  errorcode?: string;
  errormessage?: string;
  customermessage?: string;
}

// ==================== Capture ====================

export interface PayoneCaptureRequest extends PayoneBaseRequest {
  request: "capture";
  txid: string;
  sequencenumber: number;
  amount: number;
  currency: string;
  settleaccount?: "yes" | "no" | "auto";
  capturemode?: "completed" | "notcompleted";
}

export interface PayoneCaptureResponse {
  status: PayoneStatus;
  txid?: string;
  settleaccount?: string;
  errorcode?: string;
  errormessage?: string;
  customermessage?: string;
}

// ==================== Refund ====================

export interface PayoneRefundRequest extends PayoneBaseRequest {
  request: "refund" | "debit";
  txid: string;
  sequencenumber: number;
  amount: number; // Negative value for refund
  currency: string;
  narrative_text?: string;
  use_customerdata?: "yes";
  // SEPA refund target
  iban?: string;
  bic?: string;
  bankcountry?: string;
}

export interface PayoneRefundResponse {
  status: PayoneStatus;
  txid?: string;
  errorcode?: string;
  errormessage?: string;
  customermessage?: string;
}

// ==================== Transaction Status ====================

export interface PayoneTransactionStatusNotification {
  key: string;
  txid: string;
  reference: string;
  txaction: "appointed" | "capture" | "paid" | "underpaid" | "cancelation" | "refund" | "debit" | "reminder" | "vauthorization" | "vsettlement" | "transfer" | "invoice" | "failed";
  mode: "test" | "live";
  portalid: string;
  aid: string;
  clearingtype: PayoneClearingType;
  txtime: string;
  currency: string;
  userid: string;
  customerid?: string;
  param?: string;
  receivable?: string;
  balance?: string;
  price?: string;
  sequencenumber?: string;
  failedcause?: string;
  reasoncode?: string;
}

// ==================== Client Config ====================

export interface PayoneClientConfig {
  merchantId: string;
  portalId: string;
  accountId: string;
  apiKey: string;
  mode: "test" | "live";
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

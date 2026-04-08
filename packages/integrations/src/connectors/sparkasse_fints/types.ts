// ==================== Sparkasse FinTS/HBCI Protocol Types ====================
// Models the FinTS 3.0 (Financial Transaction Services) protocol layer
// used by Sparkassen and other German banks via the HBCI standard.

/** ISO 4217 currency code */
export type CurrencyCode = string;

// ==================== FinTS Segment Types ====================
// FinTS communication is based on segments with specific identifiers

/** FinTS dialog phases */
export type FinTSDialogPhase = "INIT" | "PROCESS" | "END";

/** FinTS message direction */
export type FinTSMessageDirection = "CLIENT_TO_BANK" | "BANK_TO_CLIENT";

/** Supported TAN methods */
export type FinTSTanMethod =
  | "chipTAN_optisch"
  | "chipTAN_USB"
  | "chipTAN_QR"
  | "pushTAN"
  | "smsTAN"
  | "photoTAN"
  | "appTAN";

/** Segment identifier codes */
export type FinTSSegmentId =
  | "HKIDN"  // Identification
  | "HKVVB"  // Processing preparation
  | "HKSYN"  // Synchronization
  | "HKSAL"  // Balance query (Saldenabfrage)
  | "HKKAZ"  // Account transactions (Kontoumsätze)
  | "HKSPA"  // SEPA account info
  | "HKTAN"  // TAN process
  | "HKEND"  // Dialog end
  | "HNHBK"  // Message header
  | "HNHBS"  // Message trailer
  | "HNVSK"  // Signature head
  | "HNVSD"  // Signature data
  | "HIRMG"  // Response (global)
  | "HIRMS"  // Response (segment-specific)
  | "HISAL"  // Balance response
  | "HIKAZ"  // Transaction response
  | "HISPA"  // SEPA account info response
  | "HITANS" // TAN methods response
  | "HISYN"; // Synchronization response

// ==================== FinTS Message Structures ====================

/** A single FinTS data element */
export interface FinTSDataElement {
  type: "alphanumeric" | "numeric" | "binary";
  value: string;
  length?: number;
}

/** A FinTS segment within a message */
export interface FinTSSegment {
  id: FinTSSegmentId | string;
  segmentNumber: number;
  version: number;
  referenceSegment?: number;
  dataElements: FinTSDataElement[];
  rawData?: string;
}

/** A complete FinTS message (request or response) */
export interface FinTSMessage {
  direction: FinTSMessageDirection;
  segments: FinTSSegment[];
  messageNumber: number;
  dialogId: string;
  rawMessage?: string;
}

// ==================== FinTS Dialog State ====================

export interface FinTSDialogState {
  dialogId: string;
  messageNumber: number;
  systemId: string;
  phase: FinTSDialogPhase;
  bankParameterData?: FinTSBankParameters;
  userParameterData?: FinTSUserParameters;
  supportedTanMethods: FinTSTanMethod[];
  selectedTanMethod?: FinTSTanMethod;
}

export interface FinTSBankParameters {
  bankCode: string;
  bankName: string;
  bpdVersion: number;
  hbciVersion: number;
  supportedLanguages: number[];
  supportedSecurityMethods: string[];
  maxTransactionsPerMessage: number;
}

export interface FinTSUserParameters {
  userId: string;
  customerId: string;
  updVersion: number;
  username?: string;
  accounts: FinTSAccountInfo[];
}

// ==================== Account & Transaction Types ====================

export interface FinTSAccountInfo {
  accountNumber: string;
  subAccountNumber?: string;
  bankCode: string;
  iban: string;
  bic: string;
  ownerName: string;
  accountType: number;
  currency: CurrencyCode;
  productName?: string;
  /** Allowed transaction types (segment IDs) for this account */
  allowedTransactions: string[];
}

export interface FinTSBalance {
  accountIban: string;
  bookedBalance: FinTSMonetaryAmount;
  pendingBalance?: FinTSMonetaryAmount;
  creditLimit?: FinTSMonetaryAmount;
  availableBalance?: FinTSMonetaryAmount;
  balanceDate: string;
  balanceTime?: string;
}

export interface FinTSMonetaryAmount {
  value: number;
  currency: CurrencyCode;
  /** "C" = credit (positive), "D" = debit (negative) */
  creditDebit: "C" | "D";
}

export interface FinTSTransaction {
  accountIban: string;
  amount: FinTSMonetaryAmount;
  bookingDate: string;
  valueDate: string;
  entryDate?: string;
  bookingText?: string;
  primaNotaNumber?: string;
  purpose: string[];
  counterpartyName?: string;
  counterpartyIban?: string;
  counterpartyBic?: string;
  endToEndReference?: string;
  mandateReference?: string;
  creditorId?: string;
  /** MT940 transaction type identification */
  transactionCode?: string;
  /** GVC (Geschaeftsvorfallcode) */
  gvcCode?: string;
  gvcText?: string;
}

// ==================== MT940 / SWIFT Types ====================
// FinTS returns transactions in MT940 (SWIFT) format

export interface MT940Statement {
  transactionReference: string;
  relatedReference?: string;
  accountIdentification: string;
  statementNumber: string;
  sequenceNumber?: string;
  openingBalance: MT940Balance;
  closingBalance: MT940Balance;
  closingAvailableBalance?: MT940Balance;
  transactions: MT940Transaction[];
}

export interface MT940Balance {
  creditDebit: "C" | "D";
  date: string;
  currency: CurrencyCode;
  amount: number;
}

export interface MT940Transaction {
  valueDate: string;
  bookingDate: string;
  creditDebit: "C" | "D";
  amount: number;
  transactionType: string;
  reference: string;
  bankReference?: string;
  supplementary?: string;
  purposeLines: string[];
}

// ==================== Request / Config ====================

export interface FinTSTransactionsParams {
  accountIban: string;
  dateFrom?: string;
  dateTo?: string;
  /** Max number of entries, actual limit depends on bank */
  maxEntries?: number;
}

export interface FinTSClientConfig {
  /** FinTS endpoint URL of the Sparkasse */
  bankUrl: string;
  /** Bankleitzahl (BLZ) */
  bankCode: string;
  /** Online-Banking username */
  username: string;
  /** Online-Banking PIN */
  pin: string;
  /** Product ID registered with ZKA/DK */
  productId?: string;
  /** Preferred TAN method */
  tanMethod?: FinTSTanMethod;
}

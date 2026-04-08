// ==================== BZSt (Bundeszentralamt fuer Steuern) Types ====================
// German federal tax office for cross-border tax matters.
// Handles Zusammenfassende Meldung (ZM) and USt-IdNr validation.

/** BZSt certificate configuration */
export interface BZStCertificateConfig {
  /** Path to the ELSTER .pfx certificate file */
  certificatePath: string;
  /** PIN to unlock the certificate */
  certificatePin: string;
  /** BZSt customer number (Kundennummer) */
  customerNumber: string;
  /** Whether to use the test environment (default: false) */
  testMode?: boolean;
}

/** USt-IdNr validation request */
export interface UStIdValidationRequest {
  /** The USt-IdNr to validate */
  ustIdNr: string;
  /** Company name of the foreign entity (for qualified validation) */
  companyName?: string;
  /** City of the foreign entity (for qualified validation) */
  city?: string;
  /** Postal code of the foreign entity (for qualified validation) */
  postalCode?: string;
  /** Street of the foreign entity (for qualified validation) */
  street?: string;
  /** Own USt-IdNr (required for qualified validation) */
  ownUstIdNr: string;
  /** Print confirmation letter (Amtliche Bestaetigung) */
  printConfirmation?: boolean;
}

/** USt-IdNr validation result */
export interface UStIdValidationResult {
  /** Whether the USt-IdNr is valid */
  valid: boolean;
  /** The validated USt-IdNr */
  ustIdNr: string;
  /** Name match result (for qualified validation) */
  nameMatch?: BZStMatchResult;
  /** City match result */
  cityMatch?: BZStMatchResult;
  /** Postal code match result */
  postalCodeMatch?: BZStMatchResult;
  /** Street match result */
  streetMatch?: BZStMatchResult;
  /** Official validation date */
  validationDate: string;
  /** Error code (if invalid) */
  errorCode?: string;
  /** Error message */
  errorMessage?: string;
  /** BZSt request ID for audit trail */
  requestId?: string;
}

/** Match result for qualified USt-IdNr validation */
export type BZStMatchResult = "match" | "no_match" | "not_requested" | "not_available";

/** ZM (Zusammenfassende Meldung) submission to BZSt */
export interface BZStZMSubmission {
  /** USt-IdNr of the reporting company */
  reporterUstIdNr: string;
  /** Reporting period */
  period: BZStReportingPeriod;
  /** Individual entries */
  entries: BZStZMEntry[];
  /** Whether this is a correction (Berichtigung) */
  isCorrection?: boolean;
  /** Original submission reference (if correction) */
  originalReference?: string;
}

/** BZSt reporting period */
export interface BZStReportingPeriod {
  /** Year */
  year: number;
  /** Quarter (1-4) for quarterly reporting */
  quarter?: number;
  /** Month (1-12) for monthly reporting */
  month?: number;
}

/** Single entry in a BZSt ZM */
export interface BZStZMEntry {
  /** USt-IdNr of the recipient */
  recipientUstIdNr: string;
  /** Total supplies amount in EUR (in cents) */
  amountInCents: number;
  /** Type of transaction */
  transactionType: BZStTransactionType;
}

/** Transaction types for ZM entries */
export type BZStTransactionType =
  | "intra_community_supply"        // Innergemeinschaftliche Lieferung
  | "intra_community_service"       // Innergemeinschaftliche sonstige Leistung
  | "triangular_transaction"        // Dreiecksgeschaeft
  | "supply_installed_goods";       // Lieferung eingebauter Gegenstaende

/** BZSt submission result */
export interface BZStSubmissionResult {
  /** Whether the submission succeeded */
  success: boolean;
  /** Reference number from BZSt */
  referenceNumber?: string;
  /** Timestamp of acceptance */
  acceptedAt?: string;
  /** Error details (if failed) */
  errors?: BZStError[];
  /** Warning messages */
  warnings?: string[];
}

/** BZSt error */
export interface BZStError {
  /** Error code */
  code: string;
  /** Error message (German) */
  message: string;
  /** Affected field or entry index */
  field?: string;
}

/** BZSt submission status query result */
export interface BZStSubmissionStatus {
  /** Reference number */
  referenceNumber: string;
  /** Current status */
  status: "pending" | "processing" | "accepted" | "rejected" | "error";
  /** Status details */
  details?: string;
  /** Timestamp of last status change */
  updatedAt: string;
}

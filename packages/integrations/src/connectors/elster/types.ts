// ==================== ELSTER (ERiC) Types ====================
// German tax authority electronic filing via ERiC library.
// ELSTER uses XML-based protocols with certificate authentication.

/** ELSTER certificate configuration for ERiC library */
export interface ElsterCertificateConfig {
  /** Path to the .pfx certificate file */
  certificatePath: string;
  /** PIN to unlock the certificate */
  certificatePin: string;
  /** Optional: path to ERiC shared libraries */
  ericLibraryPath?: string;
  /** Whether to use the test environment (default: false) */
  testMode?: boolean;
}

/** Supported ELSTER tax declaration types */
export type ElsterDeclarationType =
  | "UStVA"             // Umsatzsteuervoranmeldung (VAT advance return)
  | "UStDV"             // Umsatzsteuer-Dauerfristverlaengerung
  | "UStJE"             // Umsatzsteuer-Jahreserklaerung (annual VAT return)
  | "ZM"                // Zusammenfassende Meldung (EC Sales List)
  | "EStE"              // Einkommensteuererklarung (income tax return)
  | "GewSt"             // Gewerbesteuererklarung (trade tax return)
  | "KSt"               // Koerperschaftsteuererklarung (corporate tax return)
  | "LStA"              // Lohnsteueranmeldung (payroll tax return)
  | "LStB"              // Lohnsteuerbescheinigung (payroll tax certificate)
  | "EUer";             // Einnahmenueberschussrechnung (income surplus calculation)

/** Filing period for tax declarations */
export interface ElsterFilingPeriod {
  /** Tax year (YYYY) */
  year: number;
  /** Month (1-12) for monthly filings, or quarter (1-4) for quarterly */
  period?: number;
  /** Period type */
  periodType: "monthly" | "quarterly" | "annual";
}

/** Status of an ELSTER submission */
export type ElsterSubmissionStatus =
  | "draft"
  | "validating"
  | "validated"
  | "validation_failed"
  | "submitting"
  | "submitted"
  | "accepted"
  | "rejected"
  | "error";

/** Transfer ticket returned by ELSTER after successful submission */
export interface ElsterTransferTicket {
  /** Unique transfer ticket number */
  ticketNumber: string;
  /** Timestamp of submission */
  submittedAt: string;
  /** The tax office number (Finanzamt) */
  taxOfficeNumber: string;
  /** Tax number used */
  taxNumber: string;
}

/** USt-VA (VAT advance return) data structure */
export interface UStVAData {
  /** Steuernummer (tax number) */
  taxNumber: string;
  /** Filing period */
  period: ElsterFilingPeriod;
  /** Steuerfreie Umsaetze (tax-exempt revenue) */
  taxExemptRevenue: number;
  /** Steuerpflichtige Umsaetze 19% */
  taxableRevenue19: number;
  /** Steuerpflichtige Umsaetze 7% */
  taxableRevenue7: number;
  /** Innergemeinschaftliche Lieferungen */
  intraCommunitySupplies: number;
  /** Vorsteuer (input tax) */
  inputTax: number;
  /** USt auf steuerpflichtige Umsaetze 19% */
  outputTax19: number;
  /** USt auf steuerpflichtige Umsaetze 7% */
  outputTax7: number;
  /** Verbleibende Umsatzsteuer-Vorauszahlung */
  vatPayable: number;
  /** Abziehbare Vorsteuer aus Rechnungen */
  deductibleInputTax: number;
  /** Additional fields as key-value (Kennzahl -> Betrag) */
  additionalFields?: Record<string, number>;
}

/** Zusammenfassende Meldung (EC Sales List) data */
export interface ZMData {
  /** USt-IdNr of the reporting company */
  vatId: string;
  /** Filing period */
  period: ElsterFilingPeriod;
  /** Individual deliveries/services */
  entries: ZMEntry[];
}

/** Single entry in a Zusammenfassende Meldung */
export interface ZMEntry {
  /** USt-IdNr of the recipient */
  recipientVatId: string;
  /** Country code (2-letter ISO) */
  countryCode: string;
  /** Total amount of supplies in EUR (in cents) */
  amountInCents: number;
  /** Type of supply */
  supplyType: "goods" | "services" | "triangular";
}

/** Validation result from ERiC library */
export interface ElsterValidationResult {
  /** Whether the declaration passed validation */
  valid: boolean;
  /** Validation errors (if any) */
  errors: ElsterValidationError[];
  /** Validation warnings */
  warnings: ElsterValidationWarning[];
  /** The validated XML (if valid) */
  validatedXml?: string;
}

/** Validation error from ERiC */
export interface ElsterValidationError {
  /** ERiC error code */
  code: number;
  /** Human-readable error message (German) */
  message: string;
  /** Field reference (Kennzahl) if applicable */
  fieldReference?: string;
}

/** Validation warning from ERiC */
export interface ElsterValidationWarning {
  /** Warning code */
  code: number;
  /** Warning message */
  message: string;
  /** Field reference if applicable */
  fieldReference?: string;
}

/** Submission result from ELSTER */
export interface ElsterSubmissionResult {
  /** Whether the submission succeeded */
  success: boolean;
  /** Transfer ticket (only on success) */
  transferTicket?: ElsterTransferTicket;
  /** Server response (protocol) */
  serverResponse?: string;
  /** Errors (only on failure) */
  errors?: ElsterValidationError[];
}

/** ELSTER protocol entry (Bescheid) */
export interface ElsterProtocolEntry {
  /** Transfer ticket number */
  ticketNumber: string;
  /** Declaration type */
  declarationType: ElsterDeclarationType;
  /** Filing period */
  period: ElsterFilingPeriod;
  /** Submission timestamp */
  submittedAt: string;
  /** Status of the filing */
  status: ElsterSubmissionStatus;
  /** Server response XML */
  responseXml?: string;
}

/** Configuration for ELSTER submission */
export interface ElsterSubmitOptions {
  /** Declaration type */
  declarationType: ElsterDeclarationType;
  /** The XML content to submit */
  xmlContent: string;
  /** Whether to perform a test submission (Testfall) */
  testSubmission?: boolean;
  /** Tax office number */
  taxOfficeNumber?: string;
}

/** Configuration for fetching ELSTER protocol */
export interface ElsterProtocolQuery {
  /** Filter by declaration type */
  declarationType?: ElsterDeclarationType;
  /** Filter by year */
  year?: number;
  /** Maximum number of entries to retrieve */
  limit?: number;
}

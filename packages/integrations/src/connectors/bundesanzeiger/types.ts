// ==================== Bundesanzeiger Types ====================
// German Federal Gazette (Bundesanzeiger) for annual report publication.
// Custom authentication (username/password + optional certificate).

/** Bundesanzeiger client configuration */
export interface BundesanzeigerClientConfig {
  /** Username for the Publikations-Plattform */
  username: string;
  /** Password */
  password: string;
  /** Company registration number (Registernummer) */
  registrationNumber?: string;
  /** Optional client certificate path for enhanced auth */
  certificatePath?: string;
  /** Certificate passphrase */
  certificatePassphrase?: string;
  /** API environment */
  environment?: "test" | "production";
  /** Request timeout in ms */
  timeout?: number;
}

/** Publication type */
export type BundesanzeigerPublicationType =
  | "jahresabschluss"           // Annual financial statement
  | "lagebericht"               // Management report
  | "pruefungsbericht"          // Audit report
  | "konzernabschluss"          // Consolidated financial statement
  | "konzernlagebericht"        // Consolidated management report
  | "bilanz"                    // Balance sheet
  | "gewinn_und_verlust"        // Profit and loss statement
  | "anhang"                    // Notes to financial statements
  | "kapitalflussrechnung"      // Cash flow statement
  | "eigenkapitalspiegel"       // Statement of changes in equity
  | "gesellschafterbeschluss"   // Shareholders' resolution
  | "hinterlegung";             // Deposit (for micro entities)

/** Company size classification under HGB */
export type BundesanzeigerCompanySize =
  | "kleinst"    // Micro (Kleinstkapitalgesellschaft)
  | "klein"      // Small
  | "mittel"     // Medium
  | "gross";     // Large

/** Document format for upload */
export type BundesanzeigerDocumentFormat =
  | "xhtml"      // Inline XHTML (ESEF)
  | "pdf"        // PDF
  | "xml"        // Structured XML (XBRL)
  | "xbrl";      // XBRL instance document

/** Publication status */
export type BundesanzeigerPublicationStatus =
  | "entwurf"           // Draft
  | "eingereicht"       // Submitted
  | "in_pruefung"       // Under review
  | "akzeptiert"        // Accepted
  | "veroeffentlicht"   // Published
  | "abgelehnt"         // Rejected
  | "zurueckgezogen";   // Withdrawn

/** Company information for publication */
export interface BundesanzeigerCompany {
  /** Company name */
  name: string;
  /** Legal form (e.g., GmbH, AG, KG, etc.) */
  legalForm: string;
  /** Registered office city */
  registeredOffice: string;
  /** Registration court (Registergericht) */
  registrationCourt: string;
  /** Registration number (e.g., HRB 12345) */
  registrationNumber: string;
  /** LEI (Legal Entity Identifier) if applicable */
  lei?: string;
  /** Size classification */
  companySize: BundesanzeigerCompanySize;
}

/** Publication submission */
export interface BundesanzeigerPublication {
  id?: string;
  /** Company information */
  company: BundesanzeigerCompany;
  /** Fiscal year end date (YYYY-MM-DD) */
  fiscalYearEnd: string;
  /** Fiscal year start date (YYYY-MM-DD) */
  fiscalYearStart?: string;
  /** Publication type */
  publicationType: BundesanzeigerPublicationType;
  /** Document format */
  documentFormat: BundesanzeigerDocumentFormat;
  /** Document content (base64 encoded) */
  documentContent: string;
  /** Original filename */
  filename: string;
  /** Additional documents (e.g., audit report alongside annual report) */
  attachments?: BundesanzeigerAttachment[];
  /** Whether this publication fulfils legal obligation (Offenlegungspflicht) */
  isLegalObligation: boolean;
  /** Language of the document */
  language?: "de" | "en";
  /** Auditor information (if applicable) */
  auditor?: BundesanzeigerAuditor;
  /** Shareholders' resolution date (YYYY-MM-DD) */
  resolutionDate?: string;
}

/** Attachment to a publication */
export interface BundesanzeigerAttachment {
  type: BundesanzeigerPublicationType;
  format: BundesanzeigerDocumentFormat;
  content: string;
  filename: string;
}

/** Auditor information */
export interface BundesanzeigerAuditor {
  name: string;
  /** WPK number (Wirtschaftsprueferkammer) */
  wpkNumber?: string;
  /** Audit opinion type */
  opinion?: BundesanzeigerAuditOpinion;
}

/** Audit opinion types */
export type BundesanzeigerAuditOpinion =
  | "uneingeschraenkt"     // Unqualified
  | "eingeschraenkt"       // Qualified
  | "versagung"            // Adverse
  | "nichtabgabe";         // Disclaimer

/** Submission result */
export interface BundesanzeigerSubmissionResult {
  /** Publication ID assigned by Bundesanzeiger */
  publicationId: string;
  /** Reference number */
  referenceNumber: string;
  /** Current status */
  status: BundesanzeigerPublicationStatus;
  /** Submission timestamp */
  submittedAt: string;
  /** Expected publication date */
  expectedPublicationDate?: string;
  /** Fees (in EUR cents) */
  feeCents?: number;
}

/** Publication status response */
export interface BundesanzeigerStatusResponse {
  publicationId: string;
  referenceNumber: string;
  status: BundesanzeigerPublicationStatus;
  statusDate: string;
  rejectionReason?: string;
  publicationDate?: string;
  publicationUrl?: string;
}

/** Search parameters for published reports */
export interface BundesanzeigerSearchParams {
  /** Company name (partial match) */
  companyName?: string;
  /** Registration number (exact match) */
  registrationNumber?: string;
  /** Registration court */
  registrationCourt?: string;
  /** Publication type filter */
  publicationType?: BundesanzeigerPublicationType;
  /** Fiscal year */
  fiscalYear?: number;
  /** Date range start (YYYY-MM-DD) */
  dateFrom?: string;
  /** Date range end (YYYY-MM-DD) */
  dateTo?: string;
  /** Page number (1-based) */
  page?: number;
  /** Results per page */
  perPage?: number;
}

/** Search result entry */
export interface BundesanzeigerSearchResult {
  publicationId: string;
  companyName: string;
  registrationNumber: string;
  registrationCourt: string;
  publicationType: BundesanzeigerPublicationType;
  fiscalYearEnd: string;
  publicationDate: string;
  publicationUrl: string;
}

/** Search response */
export interface BundesanzeigerSearchResponse {
  results: BundesanzeigerSearchResult[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

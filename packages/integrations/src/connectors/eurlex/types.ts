// ==================== EUR-Lex API Types ====================
// Access to European Union law: legislation, case-law, and legal acts.
// No authentication required. REST/SOAP interface.

/** EUR-Lex document type classification */
export type EurLexDocumentType =
  | "regulation"
  | "directive"
  | "decision"
  | "recommendation"
  | "opinion"
  | "treaty"
  | "international_agreement"
  | "case_law"
  | "national_transposition"
  | "preparatory_act"
  | "other";

/** EUR-Lex resource type for search */
export type EurLexResourceType =
  | "legislation"
  | "case-law"
  | "international-agreement"
  | "preparatory-act"
  | "eu-publication"
  | "national-law";

/** Language codes supported by EUR-Lex (ISO 639-1) */
export type EurLexLanguage =
  | "en" | "de" | "fr" | "es" | "it" | "nl" | "pt" | "da"
  | "sv" | "fi" | "el" | "cs" | "et" | "hu" | "lt" | "lv"
  | "mt" | "pl" | "sk" | "sl" | "bg" | "ro" | "hr" | "ga";

// ==================== Documents ====================

/** EUR-Lex document metadata */
export interface EurLexDocument {
  /** CELEX number — unique identifier for EU legal documents */
  celexNumber: string;
  /** Document title */
  title: string;
  /** Document type */
  documentType: EurLexDocumentType;
  /** Date of document (publication or adoption) */
  date: string;
  /** Official Journal reference (e.g., "OJ L 119, 4.5.2016, p. 1") */
  officialJournalReference?: string;
  /** ELI (European Legislation Identifier) URI */
  eliUri?: string;
  /** Whether the document is currently in force */
  inForce?: boolean;
  /** Available language versions */
  availableLanguages: EurLexLanguage[];
  /** Authors/institutions */
  authors?: string[];
  /** Subject matter descriptors (EuroVoc) */
  subjectMatters?: string[];
  /** Directory code in EUR-Lex classification */
  directoryCode?: string;
  /** Legal basis references (CELEX numbers) */
  legalBasis?: string[];
  /** Related documents (CELEX numbers) */
  relatedDocuments?: string[];
  /** URL to the document on EUR-Lex website */
  eurLexUrl: string;
}

/** Full document content including text body */
export interface EurLexDocumentContent extends EurLexDocument {
  /** HTML content of the document body */
  htmlContent?: string;
  /** Plain text content (stripped of HTML) */
  textContent?: string;
  /** Recitals section */
  recitals?: string;
  /** Articles as structured sections */
  articles?: EurLexArticle[];
}

/** A single article within a legislative document */
export interface EurLexArticle {
  /** Article number */
  number: string;
  /** Article title (if present) */
  title?: string;
  /** Article text content */
  content: string;
}

// ==================== Search ====================

/** Search parameters for EUR-Lex queries */
export interface EurLexSearchParams {
  /** Full-text search query */
  query: string;
  /** Filter by resource type */
  resourceType?: EurLexResourceType;
  /** Filter by document type */
  documentType?: EurLexDocumentType;
  /** Filter by language */
  language?: EurLexLanguage;
  /** Date range: start (YYYY-MM-DD) */
  dateFrom?: string;
  /** Date range: end (YYYY-MM-DD) */
  dateTo?: string;
  /** Filter by author/institution */
  author?: string;
  /** Filter by EuroVoc subject matter */
  subjectMatter?: string;
  /** Filter by directory code */
  directoryCode?: string;
  /** Only return documents currently in force */
  inForceOnly?: boolean;
  /** Page number (1-based) */
  page?: number;
  /** Number of results per page (max 100) */
  pageSize?: number;
  /** Sort order */
  sortBy?: "date" | "relevance" | "document_number";
  /** Sort direction */
  sortOrder?: "asc" | "desc";
}

/** Search results response */
export interface EurLexSearchResponse {
  /** Total number of matching documents */
  totalResults: number;
  /** Current page number */
  page: number;
  /** Page size */
  pageSize: number;
  /** Matching documents */
  results: EurLexDocument[];
}

// ==================== Recent Publications ====================

/** Parameters for fetching recent publications from the Official Journal */
export interface EurLexRecentParams {
  /** Filter by OJ series: L (Legislation) or C (Information) */
  ojSeries?: "L" | "C";
  /** Filter by resource type */
  resourceType?: EurLexResourceType;
  /** Language for results */
  language?: EurLexLanguage;
  /** Number of days to look back (default: 7) */
  daysBack?: number;
  /** Page number */
  page?: number;
  /** Page size */
  pageSize?: number;
}

/** Response for recent publications */
export interface EurLexRecentResponse {
  totalResults: number;
  page: number;
  pageSize: number;
  results: EurLexDocument[];
}

// ==================== Client Config ====================

export interface EurLexClientConfig {
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Preferred language for results (default: "en") */
  defaultLanguage?: EurLexLanguage;
}

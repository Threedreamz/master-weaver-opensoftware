// ==================== Buhl / WISO Tax Software Data Exchange Types ====================
// Data exchange with Buhl WISO tax products (WISO Steuer, tax:Mac, etc.).
// API key authentication.

/** Buhl Data client configuration */
export interface BuhlDataClientConfig {
  /** API key for authentication */
  apiKey: string;
  /** Target product for data exchange */
  product?: BuhlProduct;
  /** API environment */
  environment?: "sandbox" | "production";
  /** Request timeout in ms */
  timeout?: number;
}

/** Buhl product identifiers */
export type BuhlProduct =
  | "wiso_steuer"
  | "wiso_steuer_mac"
  | "wiso_steuer_web"
  | "tax_professional"
  | "buhl_unternehmer";

/** Tax data exchange format */
export type BuhlExchangeFormat =
  | "buhl_json"      // Buhl-proprietary JSON
  | "elster_xml"     // ELSTER-compatible XML
  | "csv";           // CSV for tabular data

/** Tax data category in Buhl system */
export type BuhlDataCategory =
  | "stammdaten"            // Master data (personal info)
  | "einkuenfte"            // Income data
  | "werbungskosten"        // Business expenses
  | "sonderausgaben"        // Special expenses
  | "aussergewoehnliche"    // Extraordinary expenses
  | "vorsorge"              // Insurance and pension
  | "kapitalertraege"       // Capital gains
  | "vermietung"            // Rental income
  | "gewerbe"               // Business income
  | "umsatzsteuer";         // VAT data

/** Tax case in Buhl system */
export interface BuhlTaxCase {
  id: string;
  taxYear: number;
  product: BuhlProduct;
  status: BuhlCaseStatus;
  taxpayerName: string;
  taxNumber?: string;
  finanzamt?: string;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
}

/** Status of a tax case */
export type BuhlCaseStatus =
  | "new"
  | "in_progress"
  | "ready_for_submission"
  | "submitted"
  | "accepted"
  | "rejected";

/** Data block for import/export */
export interface BuhlDataBlock {
  category: BuhlDataCategory;
  /** Raw data in the exchange format */
  data: Record<string, unknown>;
  /** Metadata about the data block */
  metadata?: BuhlDataMetadata;
}

/** Metadata for a data block */
export interface BuhlDataMetadata {
  /** Source system identifier */
  sourceSystem?: string;
  /** Version of the data format */
  formatVersion?: string;
  /** Timestamp of data extraction */
  extractedAt?: string;
  /** Checksum for integrity verification */
  checksum?: string;
}

/** Export request */
export interface BuhlExportRequest {
  taxCaseId: string;
  categories?: BuhlDataCategory[];
  format: BuhlExchangeFormat;
}

/** Export result */
export interface BuhlExportResult {
  taxCaseId: string;
  format: BuhlExchangeFormat;
  blocks: BuhlDataBlock[];
  exportedAt: string;
}

/** Import request */
export interface BuhlImportRequest {
  taxYear: number;
  format: BuhlExchangeFormat;
  blocks: BuhlDataBlock[];
  /** Whether to merge with existing data or replace */
  mergeStrategy: "merge" | "replace";
}

/** Import result */
export interface BuhlImportResult {
  success: boolean;
  taxCaseId: string;
  blocksImported: number;
  blocksSkipped: number;
  warnings?: string[];
  errors?: BuhlImportError[];
}

/** Import error detail */
export interface BuhlImportError {
  category: BuhlDataCategory;
  field?: string;
  message: string;
  code?: string;
}

/** Pagination parameters */
export interface BuhlPaginationParams {
  offset?: number;
  limit?: number;
}

/** Paginated list response */
export interface BuhlListResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

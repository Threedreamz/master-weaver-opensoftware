// ==================== Taxfix API Types ====================
// Tax data import/export for German personal tax returns.
// API key authentication.

/** Taxfix API client configuration */
export interface TaxfixClientConfig {
  /** API key for authentication */
  apiKey: string;
  /** API environment */
  environment?: "sandbox" | "production";
  /** Request timeout in ms */
  timeout?: number;
}

/** Tax year for data retrieval */
export type TaxfixTaxYear = number;

/** Status of a tax return */
export type TaxfixReturnStatus =
  | "draft"
  | "in_progress"
  | "submitted"
  | "accepted"
  | "rejected"
  | "amended";

/** Category of income */
export type TaxfixIncomeCategory =
  | "employment"          // Einkuenfte aus nichtselbstaendiger Arbeit
  | "self_employment"     // Einkuenfte aus selbstaendiger Arbeit
  | "business"            // Einkuenfte aus Gewerbebetrieb
  | "rental"              // Einkuenfte aus Vermietung und Verpachtung
  | "capital"             // Einkuenfte aus Kapitalvermoegen
  | "other";              // Sonstige Einkuenfte

/** Tax return summary */
export interface TaxfixTaxReturn {
  id: string;
  taxYear: TaxfixTaxYear;
  status: TaxfixReturnStatus;
  taxpayerName: string;
  taxNumber?: string;
  taxOffice?: string;
  totalIncome?: number;
  totalDeductions?: number;
  estimatedRefund?: number;
  estimatedPayment?: number;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Income record for import/export */
export interface TaxfixIncomeRecord {
  id?: string;
  category: TaxfixIncomeCategory;
  description: string;
  /** Amount in cents (EUR) */
  grossAmountCents: number;
  /** Tax withheld in cents */
  taxWithheldCents?: number;
  /** Social security contributions in cents */
  socialSecurityCents?: number;
  /** Employer name or source */
  source?: string;
  /** Period start (YYYY-MM-DD) */
  periodStart?: string;
  /** Period end (YYYY-MM-DD) */
  periodEnd?: string;
}

/** Deduction record */
export interface TaxfixDeductionRecord {
  id?: string;
  /** Deduction category (e.g., "werbungskosten", "sonderausgaben") */
  category: string;
  description: string;
  /** Amount in cents (EUR) */
  amountCents: number;
  /** Receipt reference or document ID */
  receiptReference?: string;
}

/** Tax data export bundle */
export interface TaxfixDataExport {
  taxReturn: TaxfixTaxReturn;
  incomeRecords: TaxfixIncomeRecord[];
  deductions: TaxfixDeductionRecord[];
  exportedAt: string;
  format: "json" | "csv" | "elster_xml";
}

/** Tax data import request */
export interface TaxfixDataImport {
  taxYear: TaxfixTaxYear;
  incomeRecords?: TaxfixIncomeRecord[];
  deductions?: TaxfixDeductionRecord[];
  /** Whether to merge with existing data or replace */
  mergeStrategy: "merge" | "replace";
}

/** Import result */
export interface TaxfixImportResult {
  success: boolean;
  taxReturnId: string;
  recordsImported: number;
  recordsSkipped: number;
  errors?: TaxfixImportError[];
}

/** Import error detail */
export interface TaxfixImportError {
  recordIndex: number;
  field: string;
  message: string;
}

/** Pagination parameters */
export interface TaxfixPaginationParams {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/** Paginated list response */
export interface TaxfixListResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

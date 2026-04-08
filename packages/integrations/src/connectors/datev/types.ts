// ==================== DATEV Connect API Types ====================
// German accounting standard (HGB/SKR03/SKR04)
// OAuth2 authentication via DATEV Identity Provider

/** DATEV client (Mandant) */
export interface DatevClient {
  id: string;
  name: string;
  consultantNumber: number;
  clientNumber: number;
  companyName?: string;
  legalFormId?: number;
  taxNumber?: string;
  vatId?: string;
  fiscalYearStart?: string;
  createdDate?: string;
  updatedDate?: string;
}

/** DATEV accounting entry (Buchungssatz) */
export interface DatevAccountingEntry {
  id?: string;
  date: string; // YYYY-MM-DD
  amount: number;
  debitAccount: number;
  creditAccount: number;
  description: string;
  documentNumber?: string;
  costCenter1?: string;
  costCenter2?: string;
  taxKey?: number;
  currencyCode?: string;
  exchangeRate?: number;
  postingText?: string;
  /** BU-Schluessel */
  generalLedgerAccountKey?: string;
}

/** Batch of accounting entries for upload */
export interface DatevAccountingEntriesBatch {
  consultantNumber: number;
  clientNumber: number;
  fiscalYearStart: string;
  accountingEntries: DatevAccountingEntry[];
}

/** DATEV document */
export interface DatevDocument {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  folder?: string;
  note?: string;
  register?: string;
  createdDate?: string;
  updatedDate?: string;
}

/** Upload parameters for a DATEV document */
export interface DatevDocumentUpload {
  filename: string;
  content: string; // base64-encoded file content
  folder?: string;
  note?: string;
  register?: string;
}

/** DATEV master data: account */
export interface DatevAccount {
  accountNumber: number;
  accountName: string;
  accountCategory?: string;
  accountType?: "asset" | "liability" | "revenue" | "expense" | "equity";
  taxKey?: number;
  isActive: boolean;
}

/** DATEV master data: cost center */
export interface DatevCostCenter {
  id: string;
  name: string;
  number: string;
  isActive: boolean;
}

/** DATEV address / business partner */
export interface DatevAddresseeMasterData {
  id?: string;
  accountNumber: number;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
  taxNumber?: string;
  vatId?: string;
  type: "debtor" | "creditor";
}

// ==================== Request / Response ====================

export interface DatevPaginationParams {
  skip?: number;
  top?: number;
  filter?: string;
  orderby?: string;
}

export interface DatevListResponse<T> {
  value: T[];
  "odata.count"?: number;
  "odata.nextLink"?: string;
}

export interface DatevClientConfig {
  /** OAuth2 access token from DATEV Identity Provider */
  accessToken: string;
  /** DATEV consultant number (Beraternummer) */
  consultantNumber: number;
  /** DATEV client number (Mandantennummer) */
  clientNumber: number;
  /** API environment: sandbox or production */
  environment?: "sandbox" | "production";
  /** Request timeout in ms */
  timeout?: number;
}

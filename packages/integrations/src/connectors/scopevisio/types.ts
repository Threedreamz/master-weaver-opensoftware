// ==================== Scopevisio API Types ====================
// German cloud business software (scopevisio.com)
// OAuth2 authentication

/** Scopevisio contact */
export interface ScopevisioContact {
  id?: number;
  contactNumber?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  website?: string;
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  taxId?: string;
  vatId?: string;
  type?: "customer" | "vendor" | "prospect" | "lead";
  status?: "active" | "inactive" | "archived";
  notes?: string;
  tags?: string[];
  paymentTermsDays?: number;
  creditLimit?: number;
  bankAccount?: ScopevisioContactBankAccount;
  createdAt?: string;
  modifiedAt?: string;
}

export interface ScopevisioContactBankAccount {
  accountHolder?: string;
  iban?: string;
  bic?: string;
  bankName?: string;
}

/** Scopevisio invoice */
export interface ScopevisioInvoice {
  id?: number;
  invoiceNumber?: string;
  contactId: number;
  contactName?: string;
  invoiceDate: string;
  dueDate?: string;
  deliveryDate?: string;
  status?: ScopevisioInvoiceStatus;
  type?: "outgoing" | "incoming";
  currency?: string;
  netAmount?: number;
  taxAmount?: number;
  grossAmount?: number;
  paidAmount?: number;
  outstandingAmount?: number;
  reference?: string;
  introText?: string;
  closingText?: string;
  positions?: ScopevisioInvoicePosition[];
  paymentTermsDays?: number;
  discountPercent?: number;
  discountDays?: number;
  createdAt?: string;
  modifiedAt?: string;
}

export type ScopevisioInvoiceStatus =
  | "draft"
  | "open"
  | "sent"
  | "partial"
  | "paid"
  | "overdue"
  | "cancelled"
  | "credited";

export interface ScopevisioInvoicePosition {
  id?: number;
  positionNumber?: number;
  productNumber?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  discount?: number;
  netAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  grossAmount?: number;
  accountNumber?: string;
}

/** Scopevisio booking (Buchung) */
export interface ScopevisioBooking {
  id?: number;
  bookingDate: string;
  documentDate?: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
  description?: string;
  reference?: string;
  documentNumber?: string;
  costCenter1?: string;
  costCenter2?: string;
  contactId?: number;
  contactName?: string;
  currency?: string;
  exchangeRate?: number;
  status?: "draft" | "posted" | "cancelled";
  createdAt?: string;
  modifiedAt?: string;
}

/** Scopevisio document */
export interface ScopevisioDocument {
  id?: number;
  documentNumber?: string;
  title?: string;
  type?: string;
  mimeType?: string;
  fileSize?: number;
  fileName?: string;
  description?: string;
  tags?: string[];
  folderId?: number;
  contactId?: number;
  relatedType?: string;
  relatedId?: number;
  createdAt?: string;
  modifiedAt?: string;
}

// ==================== Request / Response ====================

export interface ScopevisioListParams {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  filter?: string;
  search?: string;
}

export interface ScopevisioListResponse<T> {
  records: T[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface ScopevisioClientConfig {
  /** OAuth2 access token */
  accessToken: string;
  /** Scopevisio organisation ID */
  organisationId?: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Debitoor/SumUp Invoices API Types ====================
// Invoicing platform (formerly Debitoor, now SumUp Invoices)
// OAuth2 authentication

/** Debitoor/SumUp invoice */
export interface DebitoorInvoice {
  id?: string;
  number?: number;
  type?: "invoice" | "creditNote";
  date: string;
  dueDate?: string;
  customerId: string;
  customerName?: string;
  customerAddress?: string;
  customerCountry?: string;
  customerVatNumber?: string;
  customerEmail?: string;
  currency: string;
  lines: DebitoorInvoiceLine[];
  notes?: string;
  paymentTerms?: string;
  status?: DebitoorInvoiceStatus;
  netAmount?: number;
  taxAmount?: number;
  grossAmount?: number;
  paidAmount?: number;
  language?: string;
  sentDate?: string;
  paidDate?: string;
  recurring?: boolean;
  recurringInterval?: "monthly" | "quarterly" | "yearly";
  createdDate?: string;
  modifiedDate?: string;
}

export type DebitoorInvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "paid"
  | "partial"
  | "overdue"
  | "voided";

export interface DebitoorInvoiceLine {
  id?: string;
  description: string;
  quantity: number;
  unitNetPrice: number;
  productId?: string;
  taxRate?: number;
  taxEnabled?: boolean;
  taxAmount?: number;
  netAmount?: number;
  grossAmount?: number;
  unit?: string;
  discount?: number;
}

/** Debitoor/SumUp customer */
export interface DebitoorCustomer {
  id?: string;
  name: string;
  number?: number;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  address2?: string;
  city?: string;
  zip?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  vatNumber?: string;
  taxNumber?: string;
  paymentTermsDays?: number;
  currency?: string;
  language?: string;
  notes?: string;
  isArchived?: boolean;
  createdDate?: string;
  modifiedDate?: string;
}

/** Debitoor/SumUp expense */
export interface DebitoorExpense {
  id?: string;
  date: string;
  dueDate?: string;
  supplierId?: string;
  supplierName?: string;
  currency: string;
  lines: DebitoorExpenseLine[];
  notes?: string;
  netAmount?: number;
  taxAmount?: number;
  grossAmount?: number;
  status?: "draft" | "approved" | "paid" | "cancelled";
  categoryId?: string;
  paymentDate?: string;
  receiptId?: string;
  createdDate?: string;
  modifiedDate?: string;
}

export interface DebitoorExpenseLine {
  id?: string;
  description: string;
  netAmount: number;
  taxRate?: number;
  taxAmount?: number;
  grossAmount?: number;
  categoryId?: string;
}

/** Debitoor/SumUp product */
export interface DebitoorProduct {
  id?: string;
  name: string;
  description?: string;
  unitNetPrice?: number;
  unitGrossPrice?: number;
  unit?: string;
  taxRate?: number;
  taxEnabled?: boolean;
  productNumber?: string;
  barcode?: string;
  notes?: string;
  isArchived?: boolean;
  createdDate?: string;
  modifiedDate?: string;
}

// ==================== Request / Response ====================

export interface DebitoorListParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: "asc" | "desc";
  startDate?: string;
  endDate?: string;
}

export interface DebitoorListResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface DebitoorClientConfig {
  /** OAuth2 access token */
  accessToken: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Webhook Types ====================

export type DebitoorWebhookEventType =
  | "invoice.created"
  | "invoice.updated"
  | "invoice.deleted"
  | "invoice.sent"
  | "invoice.paid"
  | "customer.created"
  | "customer.updated"
  | "customer.deleted"
  | "expense.created"
  | "expense.updated"
  | "expense.deleted"
  | "product.created"
  | "product.updated"
  | "product.deleted";

export interface DebitoorWebhookPayload {
  event: DebitoorWebhookEventType;
  resourceId: string;
  resourceType: string;
  timestamp: string;
}

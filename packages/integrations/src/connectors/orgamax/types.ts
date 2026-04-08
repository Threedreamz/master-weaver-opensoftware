// ==================== orgaMAX API Types ====================
// German business software for invoicing and order management (orgamax.de)
// API key authentication

/** orgaMAX customer */
export interface OrgamaxCustomer {
  id?: number;
  customerNumber?: string;
  salutation?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  department?: string;
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  email?: string;
  phone?: string;
  fax?: string;
  mobile?: string;
  website?: string;
  vatId?: string;
  taxNumber?: string;
  iban?: string;
  bic?: string;
  bankName?: string;
  paymentTermsDays?: number;
  discountPercent?: number;
  discountDays?: number;
  priceGroup?: number;
  notes?: string;
  tags?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** orgaMAX invoice */
export interface OrgamaxInvoice {
  id?: number;
  invoiceNumber?: string;
  customerId: number;
  customerName?: string;
  invoiceDate: string;
  dueDate?: string;
  deliveryDate?: string;
  status?: OrgamaxInvoiceStatus;
  currency?: string;
  netAmount?: number;
  taxAmount?: number;
  grossAmount?: number;
  paidAmount?: number;
  outstandingAmount?: number;
  positions: OrgamaxPosition[];
  introText?: string;
  closingText?: string;
  internalNotes?: string;
  paymentTermsDays?: number;
  discountPercent?: number;
  discountDays?: number;
  shippingCost?: number;
  reference?: string;
  projectId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type OrgamaxInvoiceStatus =
  | "draft"
  | "open"
  | "sent"
  | "partial"
  | "paid"
  | "overdue"
  | "cancelled"
  | "credited";

/** orgaMAX offer/quote (Angebot) */
export interface OrgamaxOffer {
  id?: number;
  offerNumber?: string;
  customerId: number;
  customerName?: string;
  offerDate: string;
  validUntil?: string;
  status?: OrgamaxOfferStatus;
  currency?: string;
  netAmount?: number;
  taxAmount?: number;
  grossAmount?: number;
  positions: OrgamaxPosition[];
  introText?: string;
  closingText?: string;
  internalNotes?: string;
  reference?: string;
  projectId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type OrgamaxOfferStatus =
  | "draft"
  | "open"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

/** orgaMAX position (line item) shared by invoices and offers */
export interface OrgamaxPosition {
  id?: number;
  positionNumber?: number;
  type?: "article" | "text" | "subtotal" | "pagebreak";
  articleId?: number;
  articleNumber?: string;
  description?: string;
  longText?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  discount?: number;
  netAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  grossAmount?: number;
}

/** orgaMAX article (product/service) */
export interface OrgamaxArticle {
  id?: number;
  articleNumber?: string;
  name: string;
  description?: string;
  longText?: string;
  type?: "product" | "service";
  unit?: string;
  netPrice?: number;
  grossPrice?: number;
  purchasePrice?: number;
  taxRate?: number;
  weight?: number;
  ean?: string;
  category?: string;
  stock?: number;
  minStock?: number;
  supplier?: string;
  supplierArticleNumber?: string;
  isActive?: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== Request / Response ====================

export interface OrgamaxListParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export interface OrgamaxListResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface OrgamaxSingleResponse<T> {
  data: T;
}

export interface OrgamaxClientConfig {
  /** orgaMAX API key */
  apiKey: string;
  /** Request timeout in ms */
  timeout?: number;
}

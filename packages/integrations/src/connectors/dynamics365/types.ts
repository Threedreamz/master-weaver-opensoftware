// ==================== Microsoft Dynamics 365 Business Central Types ====================
// OData v4 API entities

/** OData v4 collection response wrapper */
export interface DynamicsODataCollection<T> {
  "@odata.context": string;
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
  value: T[];
}

/** Standard Dynamics 365 error envelope */
export interface DynamicsErrorResponse {
  error: {
    code: string;
    message: string;
    target?: string;
    details?: Array<{
      code: string;
      message: string;
      target?: string;
    }>;
  };
}

// ==================== Customers ====================

export interface Customer {
  id: string;
  number: string;
  displayName: string;
  type: "Person" | "Company";
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  taxLiable?: boolean;
  taxAreaId?: string;
  taxRegistrationNumber?: string;
  currencyId?: string;
  currencyCode?: string;
  paymentTermsId?: string;
  paymentMethodId?: string;
  blocked?: " " | "Ship" | "Invoice" | "All";
  balance?: number;
  overdueAmount?: number;
  totalSalesExcludingTax?: number;
  lastModifiedDateTime: string;
}

export interface CustomerCreatePayload {
  number?: string;
  displayName: string;
  type?: "Person" | "Company";
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  taxLiable?: boolean;
  taxRegistrationNumber?: string;
  currencyCode?: string;
  paymentTermsId?: string;
  paymentMethodId?: string;
}

// ==================== Vendors ====================

export interface Vendor {
  id: string;
  number: string;
  displayName: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  taxLiable?: boolean;
  taxRegistrationNumber?: string;
  currencyId?: string;
  currencyCode?: string;
  paymentTermsId?: string;
  paymentMethodId?: string;
  blocked?: " " | "Payment" | "All";
  balance?: number;
  lastModifiedDateTime: string;
}

export interface VendorCreatePayload {
  number?: string;
  displayName: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  taxLiable?: boolean;
  taxRegistrationNumber?: string;
  currencyCode?: string;
  paymentTermsId?: string;
  paymentMethodId?: string;
}

// ==================== General Ledger Entries ====================

export interface GeneralLedgerEntry {
  id: string;
  entryNumber: number;
  postingDate: string;
  documentNumber?: string;
  documentType?: "Payment" | "Invoice" | "Credit Memo" | "Finance Charge Memo" | "Reminder" | " ";
  accountId?: string;
  accountNumber: string;
  description?: string;
  debitAmount: number;
  creditAmount: number;
  lastModifiedDateTime: string;
}

// ==================== Sales Invoices ====================

export interface SalesInvoice {
  id: string;
  number: string;
  externalDocumentNumber?: string;
  invoiceDate: string;
  postingDate: string;
  dueDate: string;
  customerPurchaseOrderReference?: string;
  customerId: string;
  customerNumber?: string;
  customerName?: string;
  billToName?: string;
  billToCustomerId?: string;
  shipToName?: string;
  shipToContact?: string;
  currencyId?: string;
  currencyCode?: string;
  paymentTermsId?: string;
  salesperson?: string;
  discountAmount?: number;
  totalAmountExcludingTax?: number;
  totalTaxAmount?: number;
  totalAmountIncludingTax?: number;
  status: "Draft" | "Open" | "Paid" | "Canceled" | "Corrective";
  lastModifiedDateTime: string;
  salesInvoiceLines?: SalesInvoiceLine[];
}

export interface SalesInvoiceLine {
  id: string;
  sequence: number;
  itemId?: string;
  accountId?: string;
  lineType: "Comment" | "Account" | "Item" | "Resource" | "Fixed Asset" | "Charge";
  description?: string;
  unitOfMeasureId?: string;
  unitOfMeasureCode?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  discountPercent?: number;
  discountAppliedBeforeTax?: boolean;
  amountExcludingTax?: number;
  taxCode?: string;
  taxPercent?: number;
  totalTaxAmount?: number;
  amountIncludingTax?: number;
  netAmount?: number;
  netTaxAmount?: number;
  netAmountIncludingTax?: number;
}

export interface SalesInvoiceCreatePayload {
  externalDocumentNumber?: string;
  invoiceDate: string;
  postingDate?: string;
  dueDate?: string;
  customerPurchaseOrderReference?: string;
  customerId?: string;
  customerNumber?: string;
  currencyCode?: string;
  paymentTermsId?: string;
  salesperson?: string;
  salesInvoiceLines?: SalesInvoiceLineCreatePayload[];
}

export interface SalesInvoiceLineCreatePayload {
  itemId?: string;
  accountId?: string;
  lineType?: SalesInvoiceLine["lineType"];
  description?: string;
  unitOfMeasureCode?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  discountPercent?: number;
  taxCode?: string;
}

// ==================== Purchase Invoices ====================

export interface PurchaseInvoice {
  id: string;
  number: string;
  invoiceDate: string;
  postingDate: string;
  dueDate: string;
  vendorId: string;
  vendorNumber?: string;
  vendorName?: string;
  currencyCode?: string;
  discountAmount?: number;
  totalAmountExcludingTax?: number;
  totalTaxAmount?: number;
  totalAmountIncludingTax?: number;
  status: "Draft" | "Open" | "Paid" | "Canceled" | "Corrective";
  lastModifiedDateTime: string;
  purchaseInvoiceLines?: PurchaseInvoiceLine[];
}

export interface PurchaseInvoiceLine {
  id: string;
  sequence: number;
  itemId?: string;
  accountId?: string;
  lineType: "Comment" | "Account" | "Item" | "Resource" | "Fixed Asset" | "Charge";
  description?: string;
  quantity: number;
  directUnitCost: number;
  discountAmount?: number;
  discountPercent?: number;
  amountExcludingTax?: number;
  taxCode?: string;
  taxPercent?: number;
  totalTaxAmount?: number;
  amountIncludingTax?: number;
}

export interface PurchaseInvoiceCreatePayload {
  invoiceDate: string;
  postingDate?: string;
  dueDate?: string;
  vendorId?: string;
  vendorNumber?: string;
  currencyCode?: string;
  purchaseInvoiceLines?: PurchaseInvoiceLineCreatePayload[];
}

export interface PurchaseInvoiceLineCreatePayload {
  itemId?: string;
  accountId?: string;
  lineType?: PurchaseInvoiceLine["lineType"];
  description?: string;
  quantity: number;
  directUnitCost: number;
  discountAmount?: number;
  discountPercent?: number;
  taxCode?: string;
}

// ==================== Items ====================

export interface DynamicsItem {
  id: string;
  number: string;
  displayName: string;
  type: "Inventory" | "Service" | "Non-Inventory";
  itemCategoryId?: string;
  itemCategoryCode?: string;
  blocked?: boolean;
  gtin?: string;
  unitPrice: number;
  unitCost?: number;
  inventory?: number;
  taxGroupId?: string;
  taxGroupCode?: string;
  baseUnitOfMeasureId?: string;
  baseUnitOfMeasureCode?: string;
  lastModifiedDateTime: string;
}

export interface DynamicsItemCreatePayload {
  number?: string;
  displayName: string;
  type?: "Inventory" | "Service" | "Non-Inventory";
  itemCategoryCode?: string;
  gtin?: string;
  unitPrice: number;
  unitCost?: number;
  taxGroupCode?: string;
  baseUnitOfMeasureCode?: string;
}

// ==================== Query Params ====================

export interface DynamicsQueryParams {
  $filter?: string;
  $select?: string;
  $orderby?: string;
  $top?: string;
  $skip?: string;
  $count?: "true" | "false";
  $expand?: string;
}

// ==================== Client Config ====================

export interface Dynamics365Config {
  /** Azure AD tenant ID */
  tenantId: string;
  /** Azure AD application (client) ID */
  clientId: string;
  /** Azure AD client secret */
  clientSecret: string;
  /** Dynamics 365 Business Central environment name (e.g. "production") */
  environment: string;
  /** Company ID in Business Central (GUID) */
  companyId: string;
  /** OAuth2 redirect URI for authorization code flow */
  redirectUri?: string;
  /** Request timeout in ms (default 30000) */
  timeout?: number;
}

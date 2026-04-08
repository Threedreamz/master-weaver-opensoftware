// ==================== Lexoffice API Types ====================
// German cloud accounting / invoicing (lexoffice.de)
// API key authentication

/** Lexoffice contact (Kunde / Lieferant) */
export interface LexofficeContact {
  id?: string;
  organizationId?: string;
  version?: number;
  roles: LexofficeContactRoles;
  company?: LexofficeCompany;
  person?: LexofficePerson;
  addresses?: {
    billing?: LexofficeAddress[];
    shipping?: LexofficeAddress[];
  };
  emailAddresses?: { business?: string[]; office?: string[]; private?: string[]; other?: string[] };
  phoneNumbers?: { business?: string[]; office?: string[]; mobile?: string[]; private?: string[]; fax?: string[]; other?: string[] };
  note?: string;
  archived?: boolean;
}

export interface LexofficeContactRoles {
  customer?: LexofficeCustomerRole;
  vendor?: LexofficeVendorRole;
}

export interface LexofficeCustomerRole {
  number?: number;
}

export interface LexofficeVendorRole {
  number?: number;
}

export interface LexofficeCompany {
  name: string;
  taxNumber?: string;
  vatRegistrationId?: string;
  allowTaxFreeInvoices?: boolean;
  contactPersons?: LexofficePerson[];
}

export interface LexofficePerson {
  salutation?: string;
  firstName?: string;
  lastName: string;
}

export interface LexofficeAddress {
  supplement?: string;
  street?: string;
  zip?: string;
  city?: string;
  countryCode?: string;
}

/** Lexoffice invoice */
export interface LexofficeInvoice {
  id?: string;
  organizationId?: string;
  createdDate?: string;
  updatedDate?: string;
  version?: number;
  language?: string;
  archived?: boolean;
  voucherStatus?: LexofficeVoucherStatus;
  voucherNumber?: string;
  voucherDate: string;
  address: LexofficeInvoiceAddress;
  lineItems: LexofficeLineItem[];
  totalPrice: LexofficeTotalPrice;
  taxAmounts?: LexofficeTaxAmount[];
  taxConditions: LexofficeTaxConditions;
  paymentConditions?: LexofficePaymentConditions;
  shippingConditions?: LexofficeShippingConditions;
  title?: string;
  introduction?: string;
  remark?: string;
}

export type LexofficeVoucherStatus =
  | "draft"
  | "open"
  | "paid"
  | "paidoff"
  | "voided"
  | "overdue"
  | "accepted"
  | "rejected";

export interface LexofficeInvoiceAddress {
  contactId?: string;
  name?: string;
  supplement?: string;
  street?: string;
  zip?: string;
  city?: string;
  countryCode?: string;
}

export interface LexofficeLineItem {
  id?: string;
  type: "custom" | "text" | "material" | "service";
  name: string;
  description?: string;
  quantity: number;
  unitName?: string;
  unitPrice: {
    currency: string;
    netAmount: number;
    grossAmount: number;
    taxRatePercentage: number;
  };
  discountPercentage?: number;
  lineItemAmount?: number;
}

export interface LexofficeTotalPrice {
  currency: string;
  totalNetAmount: number;
  totalGrossAmount: number;
  totalTaxAmount: number;
  totalDiscountAbsolute?: number;
  totalDiscountPercentage?: number;
}

export interface LexofficeTaxAmount {
  taxRatePercentage: number;
  taxAmount: number;
  netAmount: number;
}

export interface LexofficeTaxConditions {
  taxType: "net" | "gross" | "vatfree" | "intraCommunitySupply" | "constructionService13b" | "externalService13b" | "thirdPartyCountryService" | "thirdPartyCountryDelivery";
  taxTypeNote?: string;
}

export interface LexofficePaymentConditions {
  paymentTermLabel?: string;
  paymentTermLabelTemplate?: string;
  paymentTermDuration?: number;
  paymentDiscountConditions?: {
    discountPercentage: number;
    discountRange: number;
  };
}

export interface LexofficeShippingConditions {
  shippingDate?: string;
  shippingEndDate?: string;
  shippingType?: "delivery" | "service" | "serviceperiod" | "deliveryperiod" | "none";
}

/** Lexoffice credit note */
export interface LexofficeCreditNote {
  id?: string;
  organizationId?: string;
  version?: number;
  voucherStatus?: LexofficeVoucherStatus;
  voucherNumber?: string;
  voucherDate: string;
  address: LexofficeInvoiceAddress;
  lineItems: LexofficeLineItem[];
  totalPrice: LexofficeTotalPrice;
  taxConditions: LexofficeTaxConditions;
  title?: string;
  introduction?: string;
  remark?: string;
}

/** Lexoffice voucher (Beleg) */
export interface LexofficeVoucher {
  id?: string;
  organizationId?: string;
  type: "salesinvoice" | "salescreditnote" | "purchaseinvoice" | "purchasecreditnote" | "invoice" | "creditnote" | "orderconfirmation" | "quotation";
  voucherNumber?: string;
  voucherDate: string;
  voucherStatus?: LexofficeVoucherStatus;
  totalAmount: number;
  currency?: string;
  contactId?: string;
  contactName?: string;
  dueDate?: string;
  createdDate?: string;
  updatedDate?: string;
}

/** Lexoffice payment */
export interface LexofficePayment {
  openAmount: number;
  currency: string;
  paymentStatus: "openRevenue" | "openExpense" | "balanced" | "paidoff";
  voucherType: string;
  voucherStatus: string;
  paidDate?: string;
  paymentItems?: LexofficePaymentItem[];
}

export interface LexofficePaymentItem {
  paymentItemType: "manualPayment" | "bankTransfer" | "cashPayment" | "directDebit";
  amount: number;
  currency: string;
  paymentDate: string;
}

// ==================== Request / Response ====================

export interface LexofficePaginationParams {
  page?: number;
  size?: number;
  sort?: string;
}

export interface LexofficePagedResponse<T> {
  content: T[];
  first: boolean;
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  numberOfElements: number;
}

export interface LexofficeCreateResponse {
  id: string;
  resourceUri: string;
  createdDate: string;
  updatedDate: string;
  version: number;
}

export interface LexofficeClientConfig {
  /** Lexoffice API key */
  apiKey: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Webhook Types ====================

export type LexofficeWebhookEventType =
  | "contact.created"
  | "contact.changed"
  | "contact.deleted"
  | "invoice.created"
  | "invoice.changed"
  | "invoice.deleted"
  | "invoice.status.changed"
  | "credit-note.created"
  | "credit-note.changed"
  | "credit-note.deleted"
  | "credit-note.status.changed"
  | "order-confirmation.created"
  | "order-confirmation.changed"
  | "order-confirmation.deleted"
  | "order-confirmation.status.changed"
  | "quotation.created"
  | "quotation.changed"
  | "quotation.deleted"
  | "quotation.status.changed"
  | "payment.changed"
  | "voucher.created"
  | "voucher.changed"
  | "voucher.deleted"
  | "voucher.status.changed";

export interface LexofficeWebhookSubscription {
  subscriptionId?: string;
  organizationId?: string;
  createdDate?: string;
  eventType: LexofficeWebhookEventType;
  callbackUrl: string;
}

export interface LexofficeWebhookPayload {
  organizationId: string;
  eventType: LexofficeWebhookEventType;
  resourceId: string;
  eventDate: string;
}

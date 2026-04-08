// ==================== Xero API Types ====================
// Cloud accounting platform (xero.com)
// OAuth2 authentication

/** Xero contact */
export interface XeroContact {
  ContactID?: string;
  ContactNumber?: string;
  AccountNumber?: string;
  ContactStatus?: "ACTIVE" | "ARCHIVED" | "GDPRREQUEST";
  Name: string;
  FirstName?: string;
  LastName?: string;
  CompanyNumber?: string;
  EmailAddress?: string;
  BankAccountDetails?: string;
  TaxNumber?: string;
  AccountsReceivableTaxType?: string;
  AccountsPayableTaxType?: string;
  Addresses?: XeroAddress[];
  Phones?: XeroPhone[];
  IsSupplier?: boolean;
  IsCustomer?: boolean;
  DefaultCurrency?: string;
  UpdatedDateUTC?: string;
  ContactPersons?: XeroContactPerson[];
  HasAttachments?: boolean;
  HasValidationErrors?: boolean;
}

export interface XeroAddress {
  AddressType: "POBOX" | "STREET" | "DELIVERY";
  AddressLine1?: string;
  AddressLine2?: string;
  AddressLine3?: string;
  AddressLine4?: string;
  City?: string;
  Region?: string;
  PostalCode?: string;
  Country?: string;
  AttentionTo?: string;
}

export interface XeroPhone {
  PhoneType: "DEFAULT" | "DDI" | "MOBILE" | "FAX";
  PhoneNumber?: string;
  PhoneAreaCode?: string;
  PhoneCountryCode?: string;
}

export interface XeroContactPerson {
  FirstName?: string;
  LastName?: string;
  EmailAddress?: string;
  IncludeInEmails?: boolean;
}

/** Xero invoice */
export interface XeroInvoice {
  InvoiceID?: string;
  InvoiceNumber?: string;
  Reference?: string;
  Type: XeroInvoiceType;
  Contact: { ContactID: string } | XeroContact;
  DateString?: string;
  Date?: string;
  DueDateString?: string;
  DueDate?: string;
  Status?: XeroInvoiceStatus;
  LineAmountTypes?: "Exclusive" | "Inclusive" | "NoTax";
  LineItems: XeroLineItem[];
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  TotalDiscount?: number;
  UpdatedDateUTC?: string;
  CurrencyCode?: string;
  CurrencyRate?: number;
  AmountDue?: number;
  AmountPaid?: number;
  AmountCredited?: number;
  FullyPaidOnDate?: string;
  BrandingThemeID?: string;
  Url?: string;
  SentToContact?: boolean;
  ExpectedPaymentDate?: string;
  PlannedPaymentDate?: string;
  HasAttachments?: boolean;
  Payments?: XeroPayment[];
  Prepayments?: XeroPrepayment[];
  Overpayments?: XeroOverpayment[];
  CreditNotes?: XeroCreditNote[];
}

export type XeroInvoiceType = "ACCPAY" | "ACCREC";
export type XeroInvoiceStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "AUTHORISED"
  | "PAID"
  | "VOIDED"
  | "DELETED";

export interface XeroLineItem {
  LineItemID?: string;
  Description?: string;
  Quantity?: number;
  UnitAmount?: number;
  ItemCode?: string;
  AccountCode?: string;
  TaxType?: string;
  TaxAmount?: number;
  LineAmount?: number;
  DiscountRate?: number;
  DiscountAmount?: number;
  Tracking?: XeroTrackingCategory[];
}

export interface XeroTrackingCategory {
  TrackingCategoryID: string;
  TrackingOptionID: string;
  Name?: string;
  Option?: string;
}

/** Xero bank transaction */
export interface XeroBankTransaction {
  BankTransactionID?: string;
  Type: "RECEIVE" | "SPEND" | "RECEIVE-OVERPAYMENT" | "RECEIVE-PREPAYMENT" | "SPEND-OVERPAYMENT" | "SPEND-PREPAYMENT" | "RECEIVE-TRANSFER" | "SPEND-TRANSFER";
  Contact?: { ContactID: string };
  LineItems: XeroLineItem[];
  BankAccount: { AccountID?: string; Code?: string };
  IsReconciled?: boolean;
  Date?: string;
  Reference?: string;
  CurrencyCode?: string;
  CurrencyRate?: number;
  Url?: string;
  Status?: "AUTHORISED" | "DELETED";
  LineAmountTypes?: "Exclusive" | "Inclusive" | "NoTax";
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  UpdatedDateUTC?: string;
  HasAttachments?: boolean;
}

/** Xero manual journal */
export interface XeroManualJournal {
  ManualJournalID?: string;
  Date: string;
  Status?: "DRAFT" | "POSTED" | "DELETED" | "VOIDED";
  Narration: string;
  JournalLines: XeroJournalLine[];
  Url?: string;
  ShowOnCashBasisReports?: boolean;
  HasAttachments?: boolean;
  UpdatedDateUTC?: string;
}

export interface XeroJournalLine {
  LineAmount: number;
  AccountCode: string;
  Description?: string;
  TaxType?: string;
  Tracking?: XeroTrackingCategory[];
  TaxAmount?: number;
  IsBlank?: boolean;
}

/** Xero account */
export interface XeroAccount {
  AccountID?: string;
  Code?: string;
  Name: string;
  Type: XeroAccountType;
  BankAccountNumber?: string;
  Status?: "ACTIVE" | "ARCHIVED";
  Description?: string;
  BankAccountType?: string;
  CurrencyCode?: string;
  TaxType?: string;
  EnablePaymentsToAccount?: boolean;
  ShowInExpenseClaims?: boolean;
  Class?: "ASSET" | "EQUITY" | "EXPENSE" | "LIABILITY" | "REVENUE";
  SystemAccount?: string;
  ReportingCode?: string;
  ReportingCodeName?: string;
  HasAttachments?: boolean;
  UpdatedDateUTC?: string;
}

export type XeroAccountType =
  | "BANK"
  | "CURRENT"
  | "CURRLIAB"
  | "DEPRECIATN"
  | "DIRECTCOSTS"
  | "EQUITY"
  | "EXPENSE"
  | "FIXED"
  | "INVENTORY"
  | "LIABILITY"
  | "NONCURRENT"
  | "OTHERINCOME"
  | "OVERHEADS"
  | "PREPAYMENT"
  | "REVENUE"
  | "SALES"
  | "TERMLIAB"
  | "PAYGLIABILITY"
  | "SUPERANNUATIONEXPENSE"
  | "SUPERANNUATIONLIABILITY"
  | "WAGESEXPENSE"
  | "WAGESPAYABLELIABILITY";

/** Xero payment */
export interface XeroPayment {
  PaymentID?: string;
  Date?: string;
  Amount?: number;
  Reference?: string;
  CurrencyRate?: number;
  PaymentType?: "ACCRECPAYMENT" | "ACCPAYPAYMENT" | "ARCREDITPAYMENT" | "APCREDITPAYMENT" | "AROVERPAYMENTPAYMENT" | "ARPREPAYMENTPAYMENT" | "APPREPAYMENTPAYMENT" | "APOVERPAYMENTPAYMENT";
  Status?: "AUTHORISED" | "DELETED";
  UpdatedDateUTC?: string;
  Invoice?: { InvoiceID: string };
  Account?: { AccountID: string };
  IsReconciled?: boolean;
}

export interface XeroPrepayment {
  PrepaymentID?: string;
  Type?: string;
  Date?: string;
  Status?: string;
  Total?: number;
  UpdatedDateUTC?: string;
}

export interface XeroOverpayment {
  OverpaymentID?: string;
  Type?: string;
  Date?: string;
  Status?: string;
  Total?: number;
  UpdatedDateUTC?: string;
}

export interface XeroCreditNote {
  CreditNoteID?: string;
  CreditNoteNumber?: string;
  Type?: string;
  Date?: string;
  Status?: string;
  Total?: number;
  UpdatedDateUTC?: string;
}

// ==================== Request / Response ====================

export interface XeroPaginationParams {
  page?: number;
  /** ISO date — only return items modified since this date */
  ifModifiedSince?: string;
  where?: string;
  order?: string;
}

export interface XeroResponse<T> {
  Id: string;
  Status: string;
  DateTimeUTC: string;
  [key: string]: unknown;
  // The response wraps entities in a plural key, e.g. Invoices, Contacts
}

export interface XeroClientConfig {
  /** OAuth2 access token */
  accessToken: string;
  /** Xero tenant ID (required for multi-org) */
  tenantId: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Webhook Types ====================

export type XeroWebhookEventType =
  | "CREATE"
  | "UPDATE"
  | "DELETE";

export type XeroWebhookResourceType =
  | "INVOICE"
  | "CONTACT"
  | "PAYMENT"
  | "MANUALJOURNAL"
  | "ACCOUNT"
  | "BANKTRANSACTION";

export interface XeroWebhookEvent {
  resourceUrl: string;
  resourceId: string;
  eventDateUtc: string;
  eventType: XeroWebhookEventType;
  eventCategory: XeroWebhookResourceType;
  tenantId: string;
  tenantType: string;
}

export interface XeroWebhookPayload {
  events: XeroWebhookEvent[];
  lastEventSequence: number;
  firstEventSequence: number;
  entropy: string;
}

// ==================== QuickBooks Online API Types ====================
// Cloud accounting platform (quickbooks.intuit.com)
// OAuth2 authentication

/** QuickBooks customer */
export interface QBCustomer {
  Id?: string;
  SyncToken?: string;
  DisplayName: string;
  Title?: string;
  GivenName?: string;
  MiddleName?: string;
  FamilyName?: string;
  Suffix?: string;
  CompanyName?: string;
  PrintOnCheckName?: string;
  Active?: boolean;
  PrimaryPhone?: QBTelephoneNumber;
  AlternatePhone?: QBTelephoneNumber;
  Mobile?: QBTelephoneNumber;
  Fax?: QBTelephoneNumber;
  PrimaryEmailAddr?: QBEmailAddress;
  WebAddr?: QBWebAddress;
  BillAddr?: QBPhysicalAddress;
  ShipAddr?: QBPhysicalAddress;
  TaxExemptionReasonId?: string;
  Balance?: number;
  BalanceWithJobs?: number;
  CurrencyRef?: QBRef;
  PreferredDeliveryMethod?: "Print" | "Email" | "None";
  Taxable?: boolean;
  Notes?: string;
  Job?: boolean;
  ParentRef?: QBRef;
  Level?: number;
  MetaData?: QBMetaData;
}

/** QuickBooks invoice */
export interface QBInvoice {
  Id?: string;
  SyncToken?: string;
  CustomerRef: QBRef;
  Line: QBInvoiceLine[];
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
  CurrencyRef?: QBRef;
  ExchangeRate?: number;
  PrivateNote?: string;
  CustomerMemo?: QBMemoRef;
  BillAddr?: QBPhysicalAddress;
  ShipAddr?: QBPhysicalAddress;
  BillEmail?: QBEmailAddress;
  SalesTermRef?: QBRef;
  ShipMethodRef?: QBRef;
  ShipDate?: string;
  TrackingNum?: string;
  GlobalTaxCalculation?: "TaxExcluded" | "TaxInclusive" | "NotApplicable";
  TotalAmt?: number;
  Balance?: number;
  ApplyTaxAfterDiscount?: boolean;
  PrintStatus?: "NotSet" | "NeedToPrint" | "PrintComplete";
  EmailStatus?: "NotSet" | "NeedToSend" | "EmailSent";
  Deposit?: number;
  AllowIPNPayment?: boolean;
  AllowOnlinePayment?: boolean;
  AllowOnlineCreditCardPayment?: boolean;
  AllowOnlineACHPayment?: boolean;
  TxnTaxDetail?: QBTxnTaxDetail;
  LinkedTxn?: QBLinkedTxn[];
  MetaData?: QBMetaData;
}

export interface QBInvoiceLine {
  Id?: string;
  LineNum?: number;
  Description?: string;
  Amount: number;
  DetailType: "SalesItemLineDetail" | "GroupLineDetail" | "DescriptionOnly" | "DiscountLineDetail" | "SubTotalLineDetail";
  SalesItemLineDetail?: {
    ItemRef?: QBRef;
    ClassRef?: QBRef;
    UnitPrice?: number;
    Qty?: number;
    TaxCodeRef?: QBRef;
    ServiceDate?: string;
    DiscountRate?: number;
    DiscountAmt?: number;
  };
}

/** QuickBooks payment */
export interface QBPayment {
  Id?: string;
  SyncToken?: string;
  CustomerRef: QBRef;
  TotalAmt: number;
  CurrencyRef?: QBRef;
  ExchangeRate?: number;
  TxnDate?: string;
  PrivateNote?: string;
  PaymentMethodRef?: QBRef;
  DepositToAccountRef?: QBRef;
  PaymentRefNum?: string;
  Line?: QBPaymentLine[];
  ProcessPayment?: boolean;
  UnappliedAmt?: number;
  MetaData?: QBMetaData;
}

export interface QBPaymentLine {
  Amount: number;
  LinkedTxn: QBLinkedTxn[];
}

/** QuickBooks account (chart of accounts) */
export interface QBAccount {
  Id?: string;
  SyncToken?: string;
  Name: string;
  AccountType: QBAccountType;
  AccountSubType?: string;
  AcctNum?: string;
  Description?: string;
  Active?: boolean;
  Classification?: "Asset" | "Equity" | "Expense" | "Liability" | "Revenue";
  CurrencyRef?: QBRef;
  CurrentBalance?: number;
  CurrentBalanceWithSubAccounts?: number;
  SubAccount?: boolean;
  ParentRef?: QBRef;
  TaxCodeRef?: QBRef;
  MetaData?: QBMetaData;
}

export type QBAccountType =
  | "Bank"
  | "Other Current Asset"
  | "Fixed Asset"
  | "Other Asset"
  | "Accounts Receivable"
  | "Equity"
  | "Expense"
  | "Other Expense"
  | "Cost of Goods Sold"
  | "Accounts Payable"
  | "Credit Card"
  | "Long Term Liability"
  | "Other Current Liability"
  | "Income"
  | "Other Income";

/** QuickBooks vendor */
export interface QBVendor {
  Id?: string;
  SyncToken?: string;
  DisplayName: string;
  Title?: string;
  GivenName?: string;
  MiddleName?: string;
  FamilyName?: string;
  Suffix?: string;
  CompanyName?: string;
  PrintOnCheckName?: string;
  Active?: boolean;
  PrimaryPhone?: QBTelephoneNumber;
  AlternatePhone?: QBTelephoneNumber;
  Mobile?: QBTelephoneNumber;
  Fax?: QBTelephoneNumber;
  PrimaryEmailAddr?: QBEmailAddress;
  WebAddr?: QBWebAddress;
  BillAddr?: QBPhysicalAddress;
  TaxIdentifier?: string;
  AcctNum?: string;
  Term1099?: boolean;
  CurrencyRef?: QBRef;
  Balance?: number;
  MetaData?: QBMetaData;
}

/** QuickBooks bill */
export interface QBBill {
  Id?: string;
  SyncToken?: string;
  VendorRef: QBRef;
  Line: QBBillLine[];
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
  CurrencyRef?: QBRef;
  ExchangeRate?: number;
  PrivateNote?: string;
  APAccountRef?: QBRef;
  SalesTermRef?: QBRef;
  GlobalTaxCalculation?: "TaxExcluded" | "TaxInclusive" | "NotApplicable";
  TotalAmt?: number;
  Balance?: number;
  TxnTaxDetail?: QBTxnTaxDetail;
  LinkedTxn?: QBLinkedTxn[];
  MetaData?: QBMetaData;
}

export interface QBBillLine {
  Id?: string;
  LineNum?: number;
  Description?: string;
  Amount: number;
  DetailType: "AccountBasedExpenseLineDetail" | "ItemBasedExpenseLineDetail";
  AccountBasedExpenseLineDetail?: {
    AccountRef: QBRef;
    ClassRef?: QBRef;
    TaxCodeRef?: QBRef;
    BillableStatus?: "Billable" | "NotBillable" | "HasBeenBilled";
    CustomerRef?: QBRef;
  };
  ItemBasedExpenseLineDetail?: {
    ItemRef: QBRef;
    ClassRef?: QBRef;
    UnitPrice?: number;
    Qty?: number;
    TaxCodeRef?: QBRef;
    BillableStatus?: "Billable" | "NotBillable" | "HasBeenBilled";
    CustomerRef?: QBRef;
  };
}

// ==================== Shared Sub-types ====================

export interface QBRef {
  value: string;
  name?: string;
}

export interface QBPhysicalAddress {
  Id?: string;
  Line1?: string;
  Line2?: string;
  Line3?: string;
  Line4?: string;
  Line5?: string;
  City?: string;
  CountrySubDivisionCode?: string;
  Country?: string;
  PostalCode?: string;
  Lat?: string;
  Long?: string;
}

export interface QBEmailAddress {
  Address?: string;
}

export interface QBTelephoneNumber {
  FreeFormNumber?: string;
}

export interface QBWebAddress {
  URI?: string;
}

export interface QBMemoRef {
  value?: string;
}

export interface QBMetaData {
  CreateTime?: string;
  LastUpdatedTime?: string;
}

export interface QBLinkedTxn {
  TxnId: string;
  TxnType: string;
  TxnLineId?: string;
}

export interface QBTxnTaxDetail {
  TxnTaxCodeRef?: QBRef;
  TotalTax?: number;
  TaxLine?: {
    Amount: number;
    DetailType: string;
    TaxLineDetail: {
      TaxRateRef: QBRef;
      PercentBased?: boolean;
      TaxPercent?: number;
      NetAmountTaxable?: number;
    };
  }[];
}

// ==================== Request / Response ====================

export interface QBQueryParams {
  query: string; // SQL-like query string
  minorversion?: string;
}

export interface QBQueryResponse<T> {
  QueryResponse: {
    startPosition?: number;
    maxResults?: number;
    totalCount?: number;
    [key: string]: unknown;
  };
  time: string;
}

export interface QBSingleResponse<T> extends Record<string, T | string | undefined> {
  time?: string;
}

export interface QBClientConfig {
  /** OAuth2 access token */
  accessToken: string;
  /** QuickBooks realm (company) ID */
  realmId: string;
  /** Use sandbox environment */
  sandbox?: boolean;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Webhook Types ====================

export type QBWebhookEventType =
  | "Create"
  | "Update"
  | "Delete"
  | "Merge"
  | "Void";

export type QBWebhookEntityType =
  | "Customer"
  | "Invoice"
  | "Payment"
  | "Account"
  | "Vendor"
  | "Bill"
  | "Estimate"
  | "SalesReceipt"
  | "CreditMemo"
  | "PurchaseOrder"
  | "JournalEntry";

export interface QBWebhookNotification {
  realmId: string;
  dataChangeEvent: {
    entities: QBWebhookEntity[];
  };
}

export interface QBWebhookEntity {
  name: QBWebhookEntityType;
  id: string;
  operation: QBWebhookEventType;
  lastUpdated: string;
}

export interface QBWebhookPayload {
  eventNotifications: QBWebhookNotification[];
}

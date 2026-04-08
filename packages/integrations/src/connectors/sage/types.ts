// ==================== Sage Business Cloud Accounting API Types ====================
// Cloud accounting platform (sage.com)
// OAuth2 authentication

/** Sage contact */
export interface SageContact {
  id?: string;
  displayed_as?: string;
  $path?: string;
  contact_type_ids?: string[];
  name: string;
  reference?: string;
  default_sales_ledger_account?: SageRef;
  default_purchase_ledger_account?: SageRef;
  tax_number?: string;
  notes?: string;
  locale?: string;
  main_address?: SageAddress;
  delivery_address?: SageAddress;
  main_contact_person?: SageContactPerson;
  bank_account_details?: SageBankDetails;
  credit_limit?: number;
  credit_days?: number;
  currency?: SageRef;
  aux_reference?: string;
  email?: string;
  telephone?: string;
  mobile?: string;
  fax?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SageAddress {
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: SageRef;
}

export interface SageContactPerson {
  name?: string;
  job_title?: string;
  telephone?: string;
  mobile?: string;
  email?: string;
  fax?: string;
}

export interface SageBankDetails {
  account_name?: string;
  account_number?: string;
  sort_code?: string;
  bic?: string;
  iban?: string;
}

/** Sage sales invoice */
export interface SageSalesInvoice {
  id?: string;
  displayed_as?: string;
  contact: SageRef;
  contact_name?: string;
  date: string;
  due_date?: string;
  reference?: string;
  notes?: string;
  terms_and_conditions?: string;
  main_address?: SageAddress;
  delivery_address?: SageAddress;
  invoice_lines: SageInvoiceLine[];
  tax_analysis?: SageTaxBreakdown[];
  net_amount?: number;
  tax_amount?: number;
  total_amount?: number;
  total_paid?: number;
  outstanding_amount?: number;
  currency?: SageRef;
  exchange_rate?: number;
  inverse_exchange_rate?: number;
  status?: SageSalesInvoiceStatus;
  sent?: boolean;
  void_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export type SageSalesInvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PART_PAID"
  | "PAID"
  | "VOID";

export interface SageInvoiceLine {
  id?: string;
  description?: string;
  ledger_account?: SageRef;
  quantity?: number;
  unit_price?: number;
  net_amount?: number;
  tax_rate?: SageRef;
  tax_amount?: number;
  total_amount?: number;
  discount_amount?: number;
  discount_percentage?: number;
  product?: SageRef;
  service?: SageRef;
  trade_of_asset?: boolean;
}

export interface SageTaxBreakdown {
  tax_rate?: SageRef;
  net_amount?: number;
  tax_amount?: number;
  total_amount?: number;
}

/** Sage purchase invoice */
export interface SagePurchaseInvoice {
  id?: string;
  displayed_as?: string;
  contact: SageRef;
  contact_name?: string;
  date: string;
  due_date?: string;
  reference?: string;
  vendor_reference?: string;
  notes?: string;
  invoice_lines: SageInvoiceLine[];
  tax_analysis?: SageTaxBreakdown[];
  net_amount?: number;
  tax_amount?: number;
  total_amount?: number;
  total_paid?: number;
  outstanding_amount?: number;
  currency?: SageRef;
  exchange_rate?: number;
  status?: SagePurchaseInvoiceStatus;
  created_at?: string;
  updated_at?: string;
}

export type SagePurchaseInvoiceStatus =
  | "DRAFT"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "PART_PAID"
  | "PAID"
  | "VOID";

/** Sage ledger account */
export interface SageLedgerAccount {
  id?: string;
  displayed_as?: string;
  ledger_account_type?: SageRef;
  ledger_account_group?: SageRef;
  ledger_account_classification?: SageRef;
  included_in_chart?: boolean;
  name: string;
  display_name?: string;
  nominal_code?: number;
  visible_in_banking?: boolean;
  visible_in_expenses?: boolean;
  visible_in_journals?: boolean;
  visible_in_other_payments?: boolean;
  visible_in_other_receipts?: boolean;
  visible_in_reporting?: boolean;
  visible_in_sales?: boolean;
  is_control_account?: boolean;
  balance?: number;
  tax_rate?: SageRef;
  created_at?: string;
  updated_at?: string;
}

/** Sage payment */
export interface SagePayment {
  id?: string;
  displayed_as?: string;
  transaction_type?: SageRef;
  contact?: SageRef;
  contact_name?: string;
  bank_account?: SageRef;
  date: string;
  reference?: string;
  net_amount?: number;
  tax_amount?: number;
  total_amount?: number;
  outstanding_amount?: number;
  currency?: SageRef;
  exchange_rate?: number;
  payment_lines?: SagePaymentLine[];
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SagePaymentLine {
  id?: string;
  ledger_account?: SageRef;
  description?: string;
  net_amount?: number;
  tax_rate?: SageRef;
  tax_amount?: number;
  total_amount?: number;
  is_purchase_for_resale?: boolean;
  trade_of_asset?: boolean;
}

// ==================== Shared Sub-types ====================

export interface SageRef {
  id: string;
  displayed_as?: string;
  $path?: string;
}

// ==================== Request / Response ====================

export interface SageListParams {
  page?: number;
  items_per_page?: number;
  search?: string;
  from_date?: string;
  to_date?: string;
  updated_or_created_since?: string;
  attributes?: string;
}

export interface SageListResponse<T> {
  $total: number;
  $page: number;
  $next?: string;
  $back?: string;
  $itemsPerPage: number;
  $items: T[];
}

export interface SageClientConfig {
  /** OAuth2 access token */
  accessToken: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Webhook Types ====================

export type SageWebhookEventType =
  | "contact.created"
  | "contact.updated"
  | "contact.deleted"
  | "sales_invoice.created"
  | "sales_invoice.updated"
  | "sales_invoice.deleted"
  | "purchase_invoice.created"
  | "purchase_invoice.updated"
  | "purchase_invoice.deleted"
  | "payment.created"
  | "payment.updated"
  | "payment.deleted";

export interface SageWebhookSubscription {
  id?: string;
  event_type: SageWebhookEventType;
  callback_url: string;
  active?: boolean;
  created_at?: string;
}

export interface SageWebhookPayload {
  event_type: SageWebhookEventType;
  resource_id: string;
  resource_type: string;
  timestamp: string;
}

// ==================== Zoho Books API Types ====================
// Cloud accounting platform (books.zoho.com)
// OAuth2 authentication

/** Zoho Books contact */
export interface ZohoContact {
  contact_id?: string;
  contact_name: string;
  company_name?: string;
  contact_type?: "customer" | "vendor";
  status?: "active" | "inactive" | "duplicate" | "crm";
  customer_sub_type?: "business" | "individual";
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  billing_address?: ZohoAddress;
  shipping_address?: ZohoAddress;
  contact_persons?: ZohoContactPerson[];
  currency_id?: string;
  currency_code?: string;
  payment_terms?: number;
  payment_terms_label?: string;
  notes?: string;
  tax_id?: string;
  vat_reg_no?: string;
  gst_no?: string;
  gst_treatment?: string;
  language_code?: string;
  outstanding_receivable_amount?: number;
  outstanding_payable_amount?: number;
  unused_credits_receivable_amount?: number;
  unused_credits_payable_amount?: number;
  created_time?: string;
  last_modified_time?: string;
}

export interface ZohoAddress {
  attention?: string;
  address?: string;
  street2?: string;
  city?: string;
  state?: string;
  state_code?: string;
  zip?: string;
  country?: string;
  country_code?: string;
  phone?: string;
  fax?: string;
}

export interface ZohoContactPerson {
  contact_person_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  designation?: string;
  department?: string;
  is_primary_contact?: boolean;
}

/** Zoho Books invoice */
export interface ZohoInvoice {
  invoice_id?: string;
  invoice_number?: string;
  customer_id: string;
  customer_name?: string;
  contact_persons?: string[];
  reference_number?: string;
  date: string;
  due_date?: string;
  payment_terms?: number;
  payment_terms_label?: string;
  status?: ZohoInvoiceStatus;
  line_items: ZohoLineItem[];
  currency_id?: string;
  currency_code?: string;
  exchange_rate?: number;
  discount?: number;
  is_discount_before_tax?: boolean;
  discount_type?: "item_level" | "entity_level";
  shipping_charge?: number;
  adjustment?: number;
  adjustment_description?: string;
  sub_total?: number;
  tax_total?: number;
  total?: number;
  balance?: number;
  payment_made?: number;
  notes?: string;
  terms?: string;
  is_inclusive_tax?: boolean;
  template_id?: string;
  salesperson_name?: string;
  custom_fields?: ZohoCustomField[];
  created_time?: string;
  last_modified_time?: string;
}

export type ZohoInvoiceStatus =
  | "draft"
  | "sent"
  | "overdue"
  | "paid"
  | "void"
  | "unpaid"
  | "partially_paid";

export interface ZohoLineItem {
  line_item_id?: string;
  item_id?: string;
  name?: string;
  description?: string;
  rate?: number;
  quantity?: number;
  unit?: string;
  discount?: number;
  discount_amount?: number;
  tax_id?: string;
  tax_name?: string;
  tax_type?: string;
  tax_percentage?: number;
  item_total?: number;
  account_id?: string;
  project_id?: string;
}

export interface ZohoCustomField {
  customfield_id?: string;
  label?: string;
  value?: string;
  data_type?: string;
}

/** Zoho Books bill */
export interface ZohoBill {
  bill_id?: string;
  bill_number?: string;
  vendor_id: string;
  vendor_name?: string;
  date: string;
  due_date?: string;
  reference_number?: string;
  status?: "draft" | "open" | "overdue" | "paid" | "void" | "partially_paid";
  line_items: ZohoLineItem[];
  currency_id?: string;
  currency_code?: string;
  exchange_rate?: number;
  sub_total?: number;
  tax_total?: number;
  total?: number;
  balance?: number;
  payment_made?: number;
  notes?: string;
  terms?: string;
  created_time?: string;
  last_modified_time?: string;
}

/** Zoho Books expense */
export interface ZohoExpense {
  expense_id?: string;
  date: string;
  account_id: string;
  account_name?: string;
  paid_through_account_id?: string;
  paid_through_account_name?: string;
  vendor_id?: string;
  vendor_name?: string;
  currency_id?: string;
  currency_code?: string;
  exchange_rate?: number;
  amount: number;
  tax_id?: string;
  tax_name?: string;
  tax_percentage?: number;
  tax_amount?: number;
  sub_total?: number;
  total?: number;
  is_billable?: boolean;
  is_personal?: boolean;
  customer_id?: string;
  customer_name?: string;
  project_id?: string;
  project_name?: string;
  reference_number?: string;
  description?: string;
  status?: "unbilled" | "invoiced" | "reimbursed" | "non-billable";
  created_time?: string;
  last_modified_time?: string;
}

/** Zoho Books bank transaction */
export interface ZohoBankTransaction {
  transaction_id?: string;
  date: string;
  amount: number;
  transaction_type?: "deposit" | "withdrawal" | "transfer";
  status?: "manually_added" | "matched" | "uncategorized" | "categorized" | "excluded";
  account_id?: string;
  from_account_id?: string;
  to_account_id?: string;
  customer_id?: string;
  vendor_id?: string;
  payee?: string;
  reference_number?: string;
  description?: string;
  currency_id?: string;
  currency_code?: string;
  created_time?: string;
  last_modified_time?: string;
}

/** Zoho Books journal */
export interface ZohoJournal {
  journal_id?: string;
  journal_number?: string;
  entry_number?: string;
  reference_number?: string;
  notes?: string;
  journal_date: string;
  currency_id?: string;
  currency_code?: string;
  exchange_rate?: number;
  line_items: ZohoJournalLineItem[];
  total?: number;
  status?: "draft" | "published";
  journal_type?: "general" | "cash" | "both";
  created_time?: string;
  last_modified_time?: string;
}

export interface ZohoJournalLineItem {
  line_id?: string;
  account_id: string;
  account_name?: string;
  debit_or_credit: "debit" | "credit";
  amount: number;
  description?: string;
  tax_id?: string;
  customer_id?: string;
}

// ==================== Request / Response ====================

export interface ZohoListParams {
  page?: number;
  per_page?: number;
  sort_column?: string;
  sort_order?: "ascending" | "descending";
  search_text?: string;
  filter_by?: string;
}

export interface ZohoListResponse<T> {
  code: number;
  message: string;
  [key: string]: unknown;
  page_context?: {
    page: number;
    per_page: number;
    has_more_page: boolean;
    applied_filter?: string;
    sort_column?: string;
    sort_order?: string;
  };
}

export interface ZohoSingleResponse<T> {
  code: number;
  message: string;
  [key: string]: unknown;
}

export interface ZohoClientConfig {
  /** OAuth2 access token */
  accessToken: string;
  /** Zoho organization ID */
  organizationId: string;
  /** Zoho data center region */
  region?: "us" | "eu" | "in" | "au" | "jp";
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Webhook Types ====================

export type ZohoWebhookEventType =
  | "contact.created"
  | "contact.updated"
  | "contact.deleted"
  | "invoice.created"
  | "invoice.updated"
  | "invoice.deleted"
  | "bill.created"
  | "bill.updated"
  | "bill.deleted"
  | "expense.created"
  | "expense.updated"
  | "expense.deleted"
  | "payment.created"
  | "payment.updated"
  | "payment.deleted";

export interface ZohoWebhookPayload {
  event_type: ZohoWebhookEventType;
  resource_id: string;
  resource_name: string;
  organization_id: string;
  occurred_time: string;
}

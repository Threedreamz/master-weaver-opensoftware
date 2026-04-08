// ==================== FreshBooks API Types ====================
// Cloud accounting/invoicing platform (freshbooks.com)
// OAuth2 authentication

/** FreshBooks client (customer) */
export interface FreshBooksClient {
  id?: number;
  userid?: number;
  accounting_systemid?: string;
  fname?: string;
  lname?: string;
  organization?: string;
  email?: string;
  mob_phone?: string;
  home_phone?: string;
  bus_phone?: string;
  fax?: string;
  language?: string;
  currency_code?: string;
  note?: string;
  p_street?: string;
  p_street2?: string;
  p_city?: string;
  p_province?: string;
  p_country?: string;
  p_code?: string;
  s_street?: string;
  s_street2?: string;
  s_city?: string;
  s_province?: string;
  s_country?: string;
  s_code?: string;
  vat_name?: string;
  vat_number?: string;
  vis_state?: FreshBooksVisState;
  updated?: string;
}

export type FreshBooksVisState = 0 | 1 | 2;
// 0 = active, 1 = deleted, 2 = archived

/** FreshBooks invoice */
export interface FreshBooksInvoice {
  id?: number;
  invoiceid?: number;
  accounting_systemid?: string;
  customerid: number;
  invoice_number?: string;
  status?: FreshBooksInvoiceStatus;
  create_date: string;
  due_date?: string;
  date_paid?: string;
  amount?: FreshBooksAmount;
  outstanding?: FreshBooksAmount;
  paid?: FreshBooksAmount;
  discount_value?: string;
  discount_type?: "percent" | "flat_amount";
  po_number?: string;
  currency_code?: string;
  language?: string;
  terms?: string;
  notes?: string;
  address?: string;
  deposit_amount?: FreshBooksAmount;
  deposit_percentage?: string;
  deposit_status?: "none" | "paid" | "unpaid" | "partial";
  auto_bill?: boolean;
  v3_status?: string;
  payment_status?: string;
  last_order_status?: string;
  display_status?: string;
  lines?: FreshBooksInvoiceLine[];
  vis_state?: FreshBooksVisState;
  updated?: string;
}

export type FreshBooksInvoiceStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7;
// 1 = draft, 2 = sent, 3 = viewed, 4 = partial, 5 = paid, 6 = auto-paid, 7 = retry

export interface FreshBooksInvoiceLine {
  lineid?: number;
  name?: string;
  description?: string;
  qty?: string;
  unit_cost?: FreshBooksAmount;
  amount?: FreshBooksAmount;
  taxName1?: string;
  taxAmount1?: number;
  taxName2?: string;
  taxAmount2?: number;
  type?: number;
  expenseid?: number;
}

export interface FreshBooksAmount {
  amount?: string;
  code?: string;
}

/** FreshBooks expense */
export interface FreshBooksExpense {
  id?: number;
  expenseid?: number;
  accounting_systemid?: string;
  categoryid?: number;
  staffid?: number;
  clientid?: number;
  projectid?: number;
  invoiceid?: number;
  profileid?: number;
  date: string;
  amount: FreshBooksAmount;
  taxName1?: string;
  taxPercent1?: string;
  taxAmount1?: FreshBooksAmount;
  taxName2?: string;
  taxPercent2?: string;
  taxAmount2?: FreshBooksAmount;
  vendor?: string;
  notes?: string;
  status?: FreshBooksExpenseStatus;
  bank_name?: string;
  has_receipt?: boolean;
  include_receipt?: boolean;
  markup_percent?: string;
  vis_state?: FreshBooksVisState;
  updated?: string;
}

export type FreshBooksExpenseStatus = 0 | 1 | 2 | 4;
// 0 = internal, 1 = outstanding, 2 = invoiced, 4 = recouped

/** FreshBooks payment */
export interface FreshBooksPayment {
  id?: number;
  paymentid?: number;
  accounting_systemid?: string;
  invoiceid: number;
  creditid?: number;
  amount: FreshBooksAmount;
  date: string;
  type?: string;
  note?: string;
  gateway?: string;
  from_credit?: boolean;
  vis_state?: FreshBooksVisState;
  updated?: string;
  logid?: number;
  orderid?: number;
  overpaymentid?: number;
}

/** FreshBooks time entry */
export interface FreshBooksTimeEntry {
  id?: number;
  time_entry_id?: number;
  is_logged?: boolean;
  started_at: string;
  duration: number; // seconds
  note?: string;
  client_id?: number;
  project_id?: number;
  service_id?: number;
  taskid?: number;
  billable?: boolean;
  billed?: boolean;
  internal?: boolean;
  retainer_id?: number;
  pending_client?: string;
  pending_project?: string;
  pending_task?: string;
  created_at?: string;
  updated?: string;
}

// ==================== Request / Response ====================

export interface FreshBooksListParams {
  page?: number;
  per_page?: number;
  search?: Record<string, string>;
  sort?: string;
}

export interface FreshBooksListResponse<T> {
  result: Record<string, T[]> & {
    page: number;
    pages: number;
    per_page: number;
    total: number;
  };
}

export interface FreshBooksSingleResponse<T> {
  result: {
    [key: string]: T;
  };
}

export interface FreshBooksClientConfig {
  /** OAuth2 access token */
  accessToken: string;
  /** FreshBooks account ID */
  accountId: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Webhook Types ====================

export type FreshBooksWebhookEventType =
  | "client.create"
  | "client.update"
  | "client.delete"
  | "invoice.create"
  | "invoice.update"
  | "invoice.delete"
  | "invoice.send"
  | "expense.create"
  | "expense.update"
  | "expense.delete"
  | "payment.create"
  | "payment.update"
  | "payment.delete"
  | "estimate.create"
  | "estimate.update"
  | "estimate.delete";

export interface FreshBooksWebhookCallback {
  callbackid?: number;
  event: FreshBooksWebhookEventType;
  uri: string;
  verified?: boolean;
  updated_at?: string;
}

export interface FreshBooksWebhookPayload {
  name: FreshBooksWebhookEventType;
  object_id: number;
  account_id: string;
  user_id: number;
  business_id?: number;
}

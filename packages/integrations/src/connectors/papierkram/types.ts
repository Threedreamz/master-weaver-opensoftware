// ==================== Papierkram API Types ====================
// German cloud accounting for freelancers & small businesses (papierkram.de)
// API key authentication

/** Papierkram invoice */
export interface PapierkramInvoice {
  id?: number;
  type?: "income" | "expense";
  name?: string;
  description?: string;
  document_date: string;
  due_date?: string;
  supply_date?: string;
  customer_id?: number;
  project_id?: number;
  billing?: PapierkramBilling;
  line_items?: PapierkramLineItem[];
  status?: PapierkramInvoiceStatus;
  total_net?: number;
  total_gross?: number;
  total_vat?: number;
  currency?: string;
  sent_on?: string;
  sent_to?: string;
  sent_via?: string;
  paid_at?: string;
  custom_template_id?: number;
  cash_discount?: number;
  cash_discount_days?: number;
  created_at?: string;
  updated_at?: string;
}

export type PapierkramInvoiceStatus =
  | "draft"
  | "created"
  | "sent"
  | "overdue"
  | "paid"
  | "cancelled";

export interface PapierkramBilling {
  company?: string;
  first_name?: string;
  last_name?: string;
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
  ust_idnr?: string;
  email?: string;
}

export interface PapierkramLineItem {
  id?: number;
  name?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  price?: number;
  vat_rate?: string;
  net_total?: number;
  category?: string;
}

/** Papierkram expense / receipt (Beleg) */
export interface PapierkramExpense {
  id?: number;
  name?: string;
  description?: string;
  document_date: string;
  due_date?: string;
  creditor?: string;
  currency?: string;
  entertainment_reason?: string;
  flagged?: boolean;
  provenance?: string;
  line_items?: PapierkramExpenseLineItem[];
  total_net?: number;
  total_gross?: number;
  total_vat?: number;
  status?: "created" | "locked" | "paid" | "cancelled";
  paid_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PapierkramExpenseLineItem {
  id?: number;
  name?: string;
  amount?: number;
  vat_rate?: string;
  category?: string;
  net_total?: number;
  gross_total?: number;
  depreciation_id?: number;
}

/** Papierkram project */
export interface PapierkramProject {
  id?: number;
  name: string;
  description?: string;
  customer_id?: number;
  start_date?: string;
  end_date?: string;
  status?: "active" | "archived" | "completed";
  budget_type?: "time" | "money";
  budget?: number;
  color?: string;
  flagged?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Papierkram banking transaction */
export interface PapierkramBankTransaction {
  id?: number;
  bank_connection_id?: number;
  name?: string;
  description?: string;
  value: number;
  transaction_date: string;
  value_date?: string;
  currency?: string;
  counterpart_name?: string;
  counterpart_iban?: string;
  counterpart_bic?: string;
  state?: "unassigned" | "assigned" | "ignored";
  invoice_id?: number;
  expense_id?: number;
  created_at?: string;
  updated_at?: string;
}

/** Papierkram bank connection */
export interface PapierkramBankConnection {
  id?: number;
  name?: string;
  iban?: string;
  bic?: string;
  bank_name?: string;
  account_type?: string;
  balance?: number;
  balance_date?: string;
  created_at?: string;
  updated_at?: string;
}

// ==================== Request / Response ====================

export interface PapierkramListParams {
  page?: number;
  per_page?: number;
  order_by?: string;
  order_direction?: "asc" | "desc";
}

export interface PapierkramListResponse<T> {
  type: string;
  page: number;
  page_size: number;
  total_pages: number;
  total_entries: number;
  has_more: boolean;
  entries: T[];
}

export interface PapierkramClientConfig {
  /** Papierkram API key */
  apiKey: string;
  /** Papierkram subdomain (e.g., "mycompany" for mycompany.papierkram.de) */
  subdomain: string;
  /** Request timeout in ms */
  timeout?: number;
}

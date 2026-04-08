// ==================== Billomat API Types ====================
// German invoicing / accounting (billomat.com)
// API key authentication

/** Billomat client (Kunde) */
export interface BillomatClient {
  id?: number;
  created?: string;
  updated?: string;
  client_number?: string;
  number?: number;
  name: string;
  salutation?: string;
  first_name?: string;
  last_name?: string;
  street?: string;
  zip?: string;
  city?: string;
  state?: string;
  country_code?: string;
  phone?: string;
  fax?: string;
  mobile?: string;
  email?: string;
  www?: string;
  tax_number?: string;
  vat_number?: string;
  bank_account_owner?: string;
  bank_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_swift?: string;
  bank_iban?: string;
  note?: string;
  revenue_gross?: string;
  revenue_net?: string;
  archived?: boolean;
}

/** Billomat invoice */
export interface BillomatInvoice {
  id?: number;
  created?: string;
  updated?: string;
  client_id: number;
  contact_id?: number;
  invoice_number?: string;
  number?: number;
  number_pre?: string;
  number_length?: number;
  title?: string;
  date: string;
  supply_date?: string;
  supply_date_type?: "" | "SUPPLY_DATE" | "DELIVERY_DATE" | "SUPPLY_TEXT" | "DELIVERY_TEXT";
  due_date?: string;
  due_days?: number;
  discount_rate?: string;
  discount_date?: string;
  discount_days?: number;
  discount_amount?: string;
  address?: string;
  status?: BillomatInvoiceStatus;
  label?: string;
  intro?: string;
  note?: string;
  total_gross?: string;
  total_net?: string;
  net_gross?: "NET" | "GROSS";
  currency_code?: string;
  quote?: number;
  payment_types?: string[];
  taxes?: BillomatTax[];
  open_amount?: string;
}

export type BillomatInvoiceStatus = "DRAFT" | "OPEN" | "OVERDUE" | "PAID" | "CANCELED";

export interface BillomatTax {
  name: string;
  rate: string;
  amount: string;
  amount_plain: number;
  amount_rounded: number;
  amount_net: string;
  amount_net_plain: number;
  amount_net_rounded: number;
  amount_gross: string;
  amount_gross_plain: number;
  amount_gross_rounded: number;
}

/** Billomat invoice item */
export interface BillomatInvoiceItem {
  id?: number;
  created?: string;
  invoice_id: number;
  article_id?: number;
  position?: number;
  unit?: string;
  quantity: number;
  unit_price: string;
  tax_name?: string;
  tax_rate?: string;
  title?: string;
  description?: string;
  total_gross?: string;
  total_net?: string;
  reduction?: string;
  total_gross_unreduced?: string;
  total_net_unreduced?: string;
}

/** Billomat credit note */
export interface BillomatCreditNote {
  id?: number;
  created?: string;
  updated?: string;
  client_id: number;
  contact_id?: number;
  credit_note_number?: string;
  number?: number;
  title?: string;
  date: string;
  address?: string;
  status?: BillomatCreditNoteStatus;
  label?: string;
  intro?: string;
  note?: string;
  total_gross?: string;
  total_net?: string;
  net_gross?: "NET" | "GROSS";
  currency_code?: string;
  taxes?: BillomatTax[];
  invoice_id?: number;
}

export type BillomatCreditNoteStatus = "DRAFT" | "OPEN" | "PAID" | "CANCELED";

/** Billomat credit note item */
export interface BillomatCreditNoteItem {
  id?: number;
  created?: string;
  credit_note_id: number;
  article_id?: number;
  position?: number;
  unit?: string;
  quantity: number;
  unit_price: string;
  tax_name?: string;
  tax_rate?: string;
  title?: string;
  description?: string;
  total_gross?: string;
  total_net?: string;
}

/** Billomat reminder (Mahnung) */
export interface BillomatReminder {
  id?: number;
  created?: string;
  updated?: string;
  invoice_id: number;
  status?: "DRAFT" | "OPEN" | "OVERDUE" | "PAID";
  reminder_level?: number;
  reminder_text_id?: number;
  date: string;
  due_date?: string;
  due_days?: number;
  label?: string;
  subject?: string;
  intro?: string;
  note?: string;
  total_gross?: string;
  total_net?: string;
}

/** Billomat payment */
export interface BillomatPayment {
  id?: number;
  created?: string;
  invoice_id: number;
  date: string;
  amount: string;
  comment?: string;
  type?: string;
  mark_invoice_as_paid?: boolean;
}

// ==================== Request / Response ====================

export interface BillomatListParams {
  page?: number;
  per_page?: number;
  order_by?: string;
}

export interface BillomatListResponse<T> {
  [key: string]: {
    [key: string]: T | T[];
    "@page"?: any;
    "@per_page"?: any;
    "@total"?: any;
  };
}

export interface BillomatClientConfig {
  /** Billomat API key */
  apiKey: string;
  /** Billomat subdomain (your-company.billomat.net) */
  subdomain: string;
  /** App ID for header-based auth */
  appId?: string;
  /** App secret for header-based auth */
  appSecret?: string;
  /** Request timeout in ms */
  timeout?: number;
}

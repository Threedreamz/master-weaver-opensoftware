// ==================== Odoo API Types ====================
// Open-source ERP platform (odoo.com)
// JSON-RPC API with API key authentication

/** Odoo partner (contact/customer/vendor) */
export interface OdooPartner {
  id?: number;
  name: string;
  display_name?: string;
  company_type?: "person" | "company";
  is_company?: boolean;
  parent_id?: number | [number, string] | false;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  street?: string;
  street2?: string;
  city?: string;
  state_id?: number | [number, string] | false;
  zip?: string;
  country_id?: number | [number, string] | false;
  vat?: string;
  lang?: string;
  customer_rank?: number;
  supplier_rank?: number;
  category_id?: number[];
  comment?: string;
  active?: boolean;
  credit_limit?: number;
  property_payment_term_id?: number | [number, string] | false;
  property_supplier_payment_term_id?: number | [number, string] | false;
  create_date?: string;
  write_date?: string;
}

/** Odoo invoice (account.move) */
export interface OdooInvoice {
  id?: number;
  name?: string;
  move_type: OdooMoveType;
  partner_id: number | [number, string];
  invoice_date?: string;
  invoice_date_due?: string;
  date?: string;
  ref?: string;
  narration?: string;
  state?: OdooInvoiceState;
  payment_state?: "not_paid" | "in_payment" | "paid" | "partial" | "reversed" | "invoicing_legacy";
  currency_id?: number | [number, string];
  journal_id?: number | [number, string];
  company_id?: number | [number, string];
  invoice_line_ids?: number[] | OdooInvoiceLine[];
  amount_untaxed?: number;
  amount_tax?: number;
  amount_total?: number;
  amount_residual?: number;
  amount_paid?: number;
  invoice_payment_term_id?: number | [number, string] | false;
  fiscal_position_id?: number | [number, string] | false;
  invoice_origin?: string;
  create_date?: string;
  write_date?: string;
}

export type OdooMoveType =
  | "entry"
  | "out_invoice"
  | "out_refund"
  | "in_invoice"
  | "in_refund"
  | "out_receipt"
  | "in_receipt";

export type OdooInvoiceState =
  | "draft"
  | "posted"
  | "cancel";

/** Odoo invoice line (account.move.line) */
export interface OdooInvoiceLine {
  id?: number;
  name?: string;
  move_id?: number | [number, string];
  product_id?: number | [number, string] | false;
  account_id?: number | [number, string];
  quantity?: number;
  price_unit?: number;
  discount?: number;
  tax_ids?: number[];
  price_subtotal?: number;
  price_total?: number;
  currency_id?: number | [number, string];
  analytic_distribution?: Record<string, number>;
}

/** Odoo journal entry (account.move with type 'entry') */
export interface OdooJournalEntry {
  id?: number;
  name?: string;
  date: string;
  ref?: string;
  journal_id: number | [number, string];
  line_ids: OdooJournalLine[];
  state?: OdooInvoiceState;
  narration?: string;
  company_id?: number | [number, string];
  create_date?: string;
  write_date?: string;
}

export interface OdooJournalLine {
  id?: number;
  account_id: number | [number, string];
  partner_id?: number | [number, string] | false;
  name?: string;
  debit?: number;
  credit?: number;
  amount_currency?: number;
  currency_id?: number | [number, string];
  tax_ids?: number[];
  analytic_distribution?: Record<string, number>;
}

/** Odoo product (product.product) */
export interface OdooProduct {
  id?: number;
  name: string;
  display_name?: string;
  default_code?: string;
  barcode?: string;
  type?: "consu" | "service" | "product";
  categ_id?: number | [number, string];
  list_price?: number;
  standard_price?: number;
  uom_id?: number | [number, string];
  uom_po_id?: number | [number, string];
  description?: string;
  description_sale?: string;
  description_purchase?: string;
  active?: boolean;
  sale_ok?: boolean;
  purchase_ok?: boolean;
  taxes_id?: number[];
  supplier_taxes_id?: number[];
  weight?: number;
  volume?: number;
  image_1920?: string; // base64
  create_date?: string;
  write_date?: string;
}

/** Odoo payment (account.payment) */
export interface OdooPayment {
  id?: number;
  name?: string;
  payment_type: "inbound" | "outbound" | "transfer";
  partner_type?: "customer" | "supplier";
  partner_id?: number | [number, string];
  amount: number;
  currency_id?: number | [number, string];
  journal_id: number | [number, string];
  date?: string;
  ref?: string;
  payment_method_id?: number | [number, string];
  state?: "draft" | "posted" | "sent" | "reconciled" | "cancelled";
  reconciled_invoice_ids?: number[];
  reconciled_bill_ids?: number[];
  create_date?: string;
  write_date?: string;
}

// ==================== JSON-RPC Types ====================

export interface OdooJsonRpcRequest {
  jsonrpc: "2.0";
  method: "call";
  id: number;
  params: {
    service: "object" | "common" | "db";
    method: string;
    args: unknown[];
  };
}

export interface OdooJsonRpcResponse<T = unknown> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data: {
      name: string;
      debug: string;
      message: string;
      arguments: string[];
    };
  };
}

/** Odoo search domain filter */
export type OdooDomainFilter = [string, string, unknown];

export interface OdooSearchReadParams {
  domain?: OdooDomainFilter[];
  fields?: string[];
  limit?: number;
  offset?: number;
  order?: string;
}

export interface OdooClientConfig {
  /** Odoo server URL (e.g., https://mycompany.odoo.com) */
  serverUrl: string;
  /** Odoo database name */
  database: string;
  /** User ID (uid) obtained after authentication */
  uid: number;
  /** API key or password */
  apiKey: string;
  /** Request timeout in ms */
  timeout?: number;
}

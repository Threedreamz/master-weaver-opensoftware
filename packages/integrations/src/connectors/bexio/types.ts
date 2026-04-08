// ==================== bexio API Types ====================
// Swiss cloud accounting platform (bexio.com)
// OAuth2 authentication

/** bexio contact */
export interface BexioContact {
  id?: number;
  nr?: string;
  contact_type_id: number; // 1 = Company, 2 = Person
  name_1: string;
  name_2?: string;
  salutation_id?: number;
  titel_id?: number;
  birthday?: string;
  address?: string;
  postcode?: string;
  city?: string;
  country_id?: number;
  mail?: string;
  mail_second?: string;
  phone_fixed?: string;
  phone_fixed_second?: string;
  phone_mobile?: string;
  fax?: string;
  url?: string;
  skype_name?: string;
  remarks?: string;
  language_id?: number;
  is_lead?: boolean;
  contact_group_ids?: number[];
  contact_branch_ids?: number[];
  user_id?: number;
  owner_id?: number;
  updated_at?: string;
}

/** bexio invoice */
export interface BexioInvoice {
  id?: number;
  document_nr?: string;
  title?: string;
  contact_id: number;
  contact_sub_id?: number;
  user_id?: number;
  project_id?: number;
  language_id?: number;
  bank_account_id?: number;
  currency_id?: number;
  payment_type_id?: number;
  header?: string;
  footer?: string;
  total_gross?: string;
  total_net?: string;
  total_taxes?: string;
  total?: string;
  total_rounding_difference?: number;
  mwst_type?: BexioMwstType;
  mwst_is_net?: boolean;
  show_position_taxes?: boolean;
  is_valid_from: string;
  is_valid_to?: string;
  contact_address?: string;
  kb_item_status_id?: BexioInvoiceStatus;
  reference?: string;
  api_reference?: string;
  viewed_by_client_at?: string;
  updated_at?: string;
  esr_id?: number;
  qr_invoice_iban?: string;
  positions?: BexioPosition[];
}

export type BexioMwstType = 0 | 1 | 2;
// 0 = including VAT, 1 = excluding VAT, 2 = exempt

export type BexioInvoiceStatus = 7 | 8 | 9 | 16 | 19 | 31;
// 7 = draft, 8 = pending, 9 = sent, 16 = completed, 19 = partial, 31 = cancelled

/** bexio position (line item) */
export interface BexioPosition {
  id?: number;
  type: "KbPositionCustom" | "KbPositionArticle" | "KbPositionText" | "KbPositionSubtotal" | "KbPositionPagebreak" | "KbPositionDiscount";
  amount?: string;
  unit_id?: number;
  account_id?: number;
  unit_name?: string;
  tax_id?: number;
  tax_value?: string;
  text?: string;
  pos?: number;
  internal_pos?: number;
  article_id?: number;
  unit_price?: string;
  discount_in_percent?: string;
  position_total?: string;
  is_optional?: boolean;
}

/** bexio order */
export interface BexioOrder {
  id?: number;
  document_nr?: string;
  title?: string;
  contact_id: number;
  contact_sub_id?: number;
  user_id?: number;
  project_id?: number;
  language_id?: number;
  bank_account_id?: number;
  currency_id?: number;
  payment_type_id?: number;
  header?: string;
  footer?: string;
  total_gross?: string;
  total_net?: string;
  total_taxes?: string;
  total?: string;
  mwst_type?: BexioMwstType;
  mwst_is_net?: boolean;
  is_valid_from: string;
  contact_address?: string;
  delivery_address_type?: number;
  delivery_address?: string;
  kb_item_status_id?: number;
  api_reference?: string;
  updated_at?: string;
  positions?: BexioPosition[];
}

/** bexio banking payment */
export interface BexioPayment {
  id?: number;
  date: string;
  value: string;
  bank_account_id: number;
  contact_id?: number;
  invoice_id?: number;
  title?: string;
  payment_type?: string;
  is_client_account_redemption?: boolean;
}

/** bexio bank account */
export interface BexioBankAccount {
  id?: number;
  name: string;
  owner?: string;
  account_no?: string;
  iban?: string;
  bic?: string;
  bank_name?: string;
  bc_nr?: string;
  currency_id?: number;
  is_default?: boolean;
  type?: string;
  remarks?: string;
}

// ==================== Request / Response ====================

export interface BexioListParams {
  offset?: number;
  limit?: number;
  order_by?: string;
}

export interface BexioClientConfig {
  /** OAuth2 access token */
  accessToken: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Webhook Types ====================

export type BexioWebhookEventType =
  | "contact.created"
  | "contact.updated"
  | "contact.deleted"
  | "invoice.created"
  | "invoice.updated"
  | "invoice.deleted"
  | "invoice.status_changed"
  | "order.created"
  | "order.updated"
  | "order.deleted"
  | "payment.created"
  | "payment.updated"
  | "payment.deleted";

export interface BexioWebhookSubscription {
  id?: number;
  event: BexioWebhookEventType;
  url: string;
  is_active?: boolean;
  created_at?: string;
}

export interface BexioWebhookPayload {
  event: BexioWebhookEventType;
  resource_id: number;
  resource_type: string;
  timestamp: string;
  signature?: string;
}

// ── Shared ──────────────────────────────────────────────────────────────────

export interface PayPalMoney {
  currency_code: string;
  value: string;
}

export interface PayPalLink {
  href: string;
  rel: string;
  method: string;
}

export interface PayPalListParams {
  page?: number;
  page_size?: number;
  total_required?: boolean;
}

// ── OAuth ───────────────────────────────────────────────────────────────────

export interface PayPalOAuthToken {
  scope: string;
  access_token: string;
  token_type: string;
  app_id: string;
  expires_in: number;
  nonce: string;
}

export interface PayPalClientConfig {
  clientId: string;
  clientSecret: string;
  sandbox?: boolean;
  timeout?: number;
  retries?: number;
}

// ── Orders ──────────────────────────────────────────────────────────────────

export interface PayPalPurchaseUnit {
  reference_id?: string;
  description?: string;
  custom_id?: string;
  invoice_id?: string;
  amount: {
    currency_code: string;
    value: string;
    breakdown?: {
      item_total?: PayPalMoney;
      shipping?: PayPalMoney;
      handling?: PayPalMoney;
      tax_total?: PayPalMoney;
      insurance?: PayPalMoney;
      shipping_discount?: PayPalMoney;
      discount?: PayPalMoney;
    };
  };
  items?: Array<{
    name: string;
    unit_amount: PayPalMoney;
    quantity: string;
    description?: string;
    sku?: string;
    category?: 'DIGITAL_GOODS' | 'PHYSICAL_GOODS' | 'DONATION';
  }>;
  shipping?: {
    name?: { full_name: string };
    address?: PayPalShippingAddress;
  };
}

export interface PayPalShippingAddress {
  address_line_1?: string;
  address_line_2?: string;
  admin_area_2?: string;
  admin_area_1?: string;
  postal_code?: string;
  country_code: string;
}

export interface PayPalOrder {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  intent: 'CAPTURE' | 'AUTHORIZE';
  purchase_units: PayPalPurchaseUnit[];
  payer?: {
    name?: { given_name: string; surname: string };
    email_address?: string;
    payer_id?: string;
  };
  create_time: string;
  update_time: string;
  links: PayPalLink[];
}

export interface CreateOrderParams {
  intent: 'CAPTURE' | 'AUTHORIZE';
  purchase_units: PayPalPurchaseUnit[];
  application_context?: {
    brand_name?: string;
    locale?: string;
    landing_page?: 'LOGIN' | 'BILLING' | 'NO_PREFERENCE';
    user_action?: 'CONTINUE' | 'PAY_NOW';
    return_url?: string;
    cancel_url?: string;
  };
}

// ── Payments (Captures / Refunds) ───────────────────────────────────────────

export interface PayPalCapture {
  id: string;
  status: 'COMPLETED' | 'DECLINED' | 'PARTIALLY_REFUNDED' | 'PENDING' | 'REFUNDED' | 'FAILED';
  amount: PayPalMoney;
  final_capture: boolean;
  seller_protection?: {
    status: string;
    dispute_categories: string[];
  };
  create_time: string;
  update_time: string;
  links: PayPalLink[];
}

export interface PayPalRefund {
  id: string;
  status: 'CANCELLED' | 'FAILED' | 'PENDING' | 'COMPLETED';
  amount: PayPalMoney;
  note_to_payer?: string;
  create_time: string;
  update_time: string;
  links: PayPalLink[];
}

export interface CaptureRefundParams {
  amount?: PayPalMoney;
  note_to_payer?: string;
  invoice_id?: string;
}

// ── Invoices ────────────────────────────────────────────────────────────────

export interface PayPalInvoice {
  id: string;
  status: 'DRAFT' | 'SENT' | 'SCHEDULED' | 'PAYMENT_PENDING' | 'PAID' | 'MARKED_AS_PAID' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_PAID' | 'PARTIALLY_REFUNDED' | 'MARKED_AS_REFUNDED' | 'UNPAID';
  detail: {
    invoice_number: string;
    invoice_date: string;
    currency_code: string;
    note?: string;
    term?: string;
    memo?: string;
    payment_term?: {
      term_type: string;
      due_date?: string;
    };
  };
  invoicer?: {
    name?: { given_name: string; surname: string };
    email_address?: string;
  };
  primary_recipients?: Array<{
    billing_info: {
      name?: { given_name: string; surname: string };
      email_address?: string;
    };
  }>;
  items: Array<{
    name: string;
    quantity: string;
    unit_amount: PayPalMoney;
    description?: string;
  }>;
  amount: {
    currency_code: string;
    value: string;
  };
  links: PayPalLink[];
}

export interface CreateInvoiceParams {
  detail: {
    invoice_number?: string;
    invoice_date?: string;
    currency_code: string;
    note?: string;
    payment_term?: {
      term_type?: string;
      due_date?: string;
    };
  };
  invoicer?: {
    email_address?: string;
  };
  primary_recipients?: Array<{
    billing_info: {
      email_address: string;
      name?: { given_name: string; surname: string };
    };
  }>;
  items: Array<{
    name: string;
    quantity: string;
    unit_amount: PayPalMoney;
    description?: string;
  }>;
}

// ── Transactions ────────────────────────────────────────────────────────────

export interface PayPalTransaction {
  transaction_info: {
    transaction_id: string;
    transaction_event_code: string;
    transaction_initiation_date: string;
    transaction_updated_date: string;
    transaction_amount: PayPalMoney;
    fee_amount?: PayPalMoney;
    transaction_status: string;
    transaction_subject?: string;
    transaction_note?: string;
    payer_name?: { given_name: string; surname: string };
  };
  payer_info?: {
    account_id: string;
    email_address: string;
    payer_name: { given_name: string; surname: string };
  };
}

export interface TransactionSearchParams {
  start_date: string;
  end_date: string;
  transaction_id?: string;
  transaction_type?: string;
  transaction_status?: string;
  transaction_amount?: string;
  transaction_currency?: string;
  page?: number;
  page_size?: number;
}

export interface PayPalTransactionList {
  transaction_details: PayPalTransaction[];
  total_items: number;
  total_pages: number;
  page: number;
  links: PayPalLink[];
}

// ── Webhook Events ──────────────────────────────────────────────────────────

export type PayPalWebhookEventType =
  | 'PAYMENT.CAPTURE.COMPLETED'
  | 'PAYMENT.CAPTURE.DENIED'
  | 'PAYMENT.CAPTURE.PENDING'
  | 'PAYMENT.CAPTURE.REFUNDED'
  | 'CHECKOUT.ORDER.APPROVED'
  | 'CHECKOUT.ORDER.COMPLETED'
  | 'CHECKOUT.ORDER.PROCESSED'
  | 'INVOICING.INVOICE.PAID'
  | 'INVOICING.INVOICE.CANCELLED'
  | 'INVOICING.INVOICE.REFUNDED'
  | 'BILLING.SUBSCRIPTION.CREATED'
  | 'BILLING.SUBSCRIPTION.ACTIVATED'
  | 'BILLING.SUBSCRIPTION.CANCELLED'
  | 'BILLING.SUBSCRIPTION.EXPIRED';

export interface PayPalWebhookEvent {
  id: string;
  event_version: string;
  create_time: string;
  resource_type: string;
  event_type: PayPalWebhookEventType;
  summary: string;
  resource: Record<string, unknown>;
  links: PayPalLink[];
}

export interface PayPalWebhookConfig {
  webhookId: string;
  clientId: string;
  clientSecret: string;
  sandbox?: boolean;
}

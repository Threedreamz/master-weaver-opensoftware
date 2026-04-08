// ── Shared ──────────────────────────────────────────────────────────────────

export interface KlarnaAddress {
  given_name: string;
  family_name: string;
  email?: string;
  phone?: string;
  street_address: string;
  street_address2?: string;
  postal_code: string;
  city: string;
  region?: string;
  country: string;
}

export interface KlarnaOrderLine {
  type?: 'physical' | 'discount' | 'shipping_fee' | 'sales_tax' | 'digital' | 'gift_card' | 'store_credit' | 'surcharge';
  reference?: string;
  name: string;
  quantity: number;
  quantity_unit?: string;
  unit_price: number;
  tax_rate: number;
  total_amount: number;
  total_discount_amount?: number;
  total_tax_amount: number;
  image_url?: string;
  product_url?: string;
}

export interface KlarnaClientConfig {
  username: string;
  password: string;
  region?: 'eu' | 'na' | 'oc';
  testMode?: boolean;
  timeout?: number;
  retries?: number;
}

// ── Sessions ────────────────────────────────────────────────────────────────

export interface KlarnaSession {
  session_id: string;
  client_token: string;
  payment_method_categories: Array<{
    identifier: string;
    name: string;
    asset_urls: {
      descriptive: string;
      standard: string;
    };
  }>;
}

export interface CreateSessionParams {
  purchase_country: string;
  purchase_currency: string;
  locale: string;
  order_amount: number;
  order_tax_amount: number;
  order_lines: KlarnaOrderLine[];
  billing_address?: KlarnaAddress;
  shipping_address?: KlarnaAddress;
  merchant_reference1?: string;
  merchant_reference2?: string;
  merchant_urls?: {
    confirmation?: string;
    notification?: string;
  };
}

export interface UpdateSessionParams {
  purchase_country?: string;
  purchase_currency?: string;
  locale?: string;
  order_amount?: number;
  order_tax_amount?: number;
  order_lines?: KlarnaOrderLine[];
  billing_address?: KlarnaAddress;
  shipping_address?: KlarnaAddress;
}

// ── Orders ──────────────────────────────────────────────────────────────────

export interface KlarnaOrder {
  order_id: string;
  status: 'AUTHORIZED' | 'PART_CAPTURED' | 'CAPTURED' | 'CANCELLED' | 'EXPIRED' | 'CLOSED';
  purchase_country: string;
  purchase_currency: string;
  locale: string;
  order_amount: number;
  order_tax_amount: number;
  original_order_amount: number;
  captured_amount: number;
  refunded_amount: number;
  remaining_authorized_amount: number;
  order_lines: KlarnaOrderLine[];
  billing_address: KlarnaAddress;
  shipping_address?: KlarnaAddress;
  merchant_reference1?: string;
  merchant_reference2?: string;
  created_at: string;
  expires_at: string;
  fraud_status: 'ACCEPTED' | 'PENDING' | 'REJECTED';
  captures: KlarnaCapture[];
  refunds: KlarnaRefund[];
}

export interface CreateOrderParams {
  purchase_country: string;
  purchase_currency: string;
  locale: string;
  order_amount: number;
  order_tax_amount: number;
  order_lines: KlarnaOrderLine[];
  billing_address: KlarnaAddress;
  shipping_address?: KlarnaAddress;
  merchant_reference1?: string;
  merchant_reference2?: string;
  merchant_urls?: {
    confirmation: string;
    notification?: string;
  };
  authorization_token: string;
}

// ── Captures ────────────────────────────────────────────────────────────────

export interface KlarnaCapture {
  capture_id: string;
  klarna_reference: string;
  captured_amount: number;
  captured_at: string;
  description?: string;
  order_lines?: KlarnaOrderLine[];
  refunded_amount: number;
  shipping_info?: Array<{
    shipping_company: string;
    shipping_method: string;
    tracking_number: string;
    tracking_uri: string;
  }>;
}

export interface CreateCaptureParams {
  captured_amount: number;
  description?: string;
  order_lines?: KlarnaOrderLine[];
  shipping_info?: Array<{
    shipping_company: string;
    shipping_method: string;
    tracking_number: string;
    tracking_uri: string;
  }>;
  shipping_delay?: number;
}

// ── Refunds ─────────────────────────────────────────────────────────────────

export interface KlarnaRefund {
  refund_id: string;
  refunded_amount: number;
  refunded_at: string;
  description?: string;
  order_lines?: KlarnaOrderLine[];
}

export interface CreateRefundParams {
  refunded_amount: number;
  description?: string;
  order_lines?: KlarnaOrderLine[];
}

// ── Webhook Events ──────────────────────────────────────────────────────────

export type KlarnaWebhookEventType =
  | 'order.created'
  | 'order.captured'
  | 'order.cancelled'
  | 'order.updated'
  | 'order.refunded'
  | 'fraud.risk.accepted'
  | 'fraud.risk.rejected'
  | 'fraud.risk.stopped'
  | 'dispute.created'
  | 'dispute.accepted'
  | 'dispute.won'
  | 'dispute.lost';

export interface KlarnaWebhookEvent {
  event_id: string;
  event_type: KlarnaWebhookEventType;
  order_id: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface KlarnaWebhookConfig {
  username: string;
  password: string;
}

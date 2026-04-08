// ── Shared ──────────────────────────────────────────────────────────────────

export interface MindeeClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

// ── Prediction Types ───────────────────────────────────────────────────────

export interface MindeeStringField {
  value: string | null;
  confidence: number;
}

export interface MindeeAmountField {
  value: number | null;
  confidence: number;
}

export interface MindeeDateField {
  value: string | null;
  confidence: number;
}

export interface MindeeClassificationField {
  value: string | null;
  confidence: number;
}

// ── Invoice ────────────────────────────────────────────────────────────────

export interface MindeeInvoiceLineItem {
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_amount: number | null;
  tax_amount: number | null;
  tax_rate: number | null;
  product_code: string | null;
  confidence: number;
}

export interface MindeeInvoicePrediction {
  invoice_number: MindeeStringField;
  date: MindeeDateField;
  due_date: MindeeDateField;
  supplier_name: MindeeStringField;
  supplier_address: MindeeStringField;
  supplier_company_registrations: Array<{ type: string; value: string }>;
  customer_name: MindeeStringField;
  customer_address: MindeeStringField;
  customer_company_registrations: Array<{ type: string; value: string }>;
  total_amount: MindeeAmountField;
  total_net: MindeeAmountField;
  total_tax: MindeeAmountField;
  taxes: Array<{ value: number; rate: number; code: string | null }>;
  currency: MindeeClassificationField;
  locale: { language: string | null; currency: string | null; country: string | null };
  reference_numbers: MindeeStringField[];
  line_items: MindeeInvoiceLineItem[];
}

// ── Receipt ────────────────────────────────────────────────────────────────

export interface MindeeReceiptLineItem {
  description: string | null;
  quantity: number | null;
  total_amount: number | null;
  unit_price: number | null;
  confidence: number;
}

export interface MindeeReceiptPrediction {
  date: MindeeDateField;
  time: MindeeStringField;
  supplier_name: MindeeStringField;
  supplier_address: MindeeStringField;
  total_amount: MindeeAmountField;
  total_net: MindeeAmountField;
  total_tax: MindeeAmountField;
  taxes: Array<{ value: number; rate: number; code: string | null }>;
  tip: MindeeAmountField;
  currency: MindeeClassificationField;
  locale: { language: string | null; currency: string | null; country: string | null };
  category: MindeeClassificationField;
  subcategory: MindeeClassificationField;
  line_items: MindeeReceiptLineItem[];
}

// ── Financial Document ─────────────────────────────────────────────────────

export interface MindeeFinancialPrediction {
  document_type: MindeeClassificationField;
  invoice_number: MindeeStringField;
  date: MindeeDateField;
  due_date: MindeeDateField;
  supplier_name: MindeeStringField;
  supplier_address: MindeeStringField;
  customer_name: MindeeStringField;
  customer_address: MindeeStringField;
  total_amount: MindeeAmountField;
  total_net: MindeeAmountField;
  total_tax: MindeeAmountField;
  currency: MindeeClassificationField;
  line_items: MindeeInvoiceLineItem[];
}

// ── API Responses ──────────────────────────────────────────────────────────

export interface MindeePredictResponse<T> {
  api_request: {
    error: Record<string, unknown>;
    resources: string[];
    status: string;
    status_code: number;
    url: string;
  };
  document: {
    id: string;
    name: string;
    inference: {
      finished_at: string;
      is_rotation_applied: boolean;
      pages: Array<{
        id: number;
        orientation: { value: number };
        prediction: T;
      }>;
      prediction: T;
      processing_time: number;
      product: { name: string; version: string };
      started_at: string;
    };
  };
}

export interface MindeeEnqueueResponse {
  api_request: {
    error: Record<string, unknown>;
    status: string;
    status_code: number;
    url: string;
  };
  job: {
    id: string;
    issued_at: string;
    status: string;
    available_at: string | null;
  };
}

export interface MindeeJobStatusResponse<T> {
  api_request: {
    error: Record<string, unknown>;
    status: string;
    status_code: number;
    url: string;
  };
  job: {
    id: string;
    issued_at: string;
    status: "waiting" | "processing" | "completed" | "failed";
    available_at: string | null;
    error: Record<string, unknown> | null;
  };
  document: {
    id: string;
    name: string;
    inference: {
      prediction: T;
      pages: Array<{ id: number; prediction: T }>;
    };
  } | null;
}

// ── Webhook Events ─────────────────────────────────────────────────────────

export type MindeeWebhookEventType =
  | "async.completed"
  | "async.failed";

export interface MindeeWebhookEvent {
  event_type: MindeeWebhookEventType;
  timestamp: string;
  job_id: string;
  document_id: string;
  data: Record<string, unknown>;
}

export interface MindeeWebhookConfig {
  signingSecret: string;
  tolerance?: number;
}

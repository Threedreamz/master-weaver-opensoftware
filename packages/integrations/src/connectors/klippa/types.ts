// ── Shared ──────────────────────────────────────────────────────────────────

export interface KlippaClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

// ── OCR / Parsing ──────────────────────────────────────────────────────────

export interface KlippaParseRequest {
  /** Base64-encoded document content. */
  document: string;
  /** Template to use (e.g., "financial_full"). */
  template?: string;
  /** ISO 639-1 language hint. */
  language?: string;
  /** PDF password if the document is encrypted. */
  pdf_password?: string;
}

export interface KlippaParsedAmount {
  amount: number;
  currency?: string;
  text?: string;
}

export interface KlippaParsedDate {
  date: string;
  text?: string;
}

export interface KlippaLineItem {
  description: string;
  amount: number;
  amount_each: number;
  quantity: number;
  vat_percentage?: number;
  vat_amount?: number;
  sku?: string;
}

export interface KlippaParseResult {
  document_type: string;
  merchant_name?: string;
  merchant_address?: string;
  merchant_phone?: string;
  merchant_website?: string;
  merchant_vat_number?: string;
  merchant_coc_number?: string;
  merchant_iban?: string;
  invoice_number?: string;
  invoice_date?: KlippaParsedDate;
  invoice_due_date?: KlippaParsedDate;
  purchase_date?: KlippaParsedDate;
  amount: KlippaParsedAmount;
  amount_change?: KlippaParsedAmount;
  amount_shipping?: KlippaParsedAmount;
  vat_amount?: KlippaParsedAmount;
  discount_amount?: KlippaParsedAmount;
  currency?: string;
  payment_method?: string;
  line_items: KlippaLineItem[];
  raw_text?: string;
  confidence: number;
}

export interface KlippaParseResponse {
  status: string;
  data: KlippaParseResult;
  request_id: string;
}

// ── Document Classification ────────────────────────────────────────────────

export interface KlippaClassifyRequest {
  document: string;
}

export interface KlippaClassification {
  document_type: string;
  confidence: number;
}

export interface KlippaClassifyResponse {
  status: string;
  data: {
    classifications: KlippaClassification[];
  };
  request_id: string;
}

// ── Credit / Scan ──────────────────────────────────────────────────────────

export interface KlippaCreditInfo {
  credits_remaining: number;
  credits_used: number;
  plan: string;
}

export interface KlippaCreditResponse {
  status: string;
  data: KlippaCreditInfo;
}

// ── Webhook Events ─────────────────────────────────────────────────────────

export type KlippaWebhookEventType =
  | "document.parsed"
  | "document.classified"
  | "document.error";

export interface KlippaWebhookEvent {
  event: KlippaWebhookEventType;
  request_id: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface KlippaWebhookConfig {
  signingSecret: string;
  tolerance?: number;
}

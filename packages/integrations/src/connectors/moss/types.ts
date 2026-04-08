// ── Shared ──────────────────────────────────────────────────────────────────

export interface MossClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface MossPagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface MossListResponse<T> {
  data: T[];
  pagination: MossPagination;
}

export interface MossListParams {
  page?: number;
  per_page?: number;
}

// ── Cards ──────────────────────────────────────────────────────────────────

export type MossCardStatus = "active" | "frozen" | "cancelled" | "expired";
export type MossCardType = "virtual" | "physical";

export interface MossCard {
  id: string;
  name: string;
  card_type: MossCardType;
  status: MossCardStatus;
  spending_limit: number;
  spent_amount: number;
  currency: string;
  last_four: string;
  holder_id: string;
  holder_name: string;
  created_at: string;
  expires_at: string;
}

export interface MossCardListParams extends MossListParams {
  status?: MossCardStatus;
  holder_id?: string;
}

export interface MossCreateCardParams {
  name: string;
  card_type: MossCardType;
  spending_limit: number;
  currency: string;
  holder_id: string;
  description?: string;
}

// ── Invoices ───────────────────────────────────────────────────────────────

export type MossInvoiceStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "scheduled"
  | "paid"
  | "cancelled";

export interface MossInvoice {
  id: string;
  invoice_number: string | null;
  vendor_name: string;
  vendor_iban: string | null;
  amount: number;
  currency: string;
  status: MossInvoiceStatus;
  due_date: string | null;
  invoice_date: string | null;
  description: string | null;
  category: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  approver_id: string | null;
  metadata: Record<string, unknown>;
}

export interface MossInvoiceListParams extends MossListParams {
  status?: MossInvoiceStatus;
  from_date?: string;
  to_date?: string;
  vendor_name?: string;
}

// ── Transactions ───────────────────────────────────────────────────────────

export interface MossTransaction {
  id: string;
  amount: number;
  currency: string;
  merchant_name: string | null;
  description: string | null;
  category: string | null;
  card_id: string | null;
  receipt_attached: boolean;
  transaction_date: string;
  created_at: string;
  status: "completed" | "pending" | "declined";
}

export interface MossTransactionListParams extends MossListParams {
  from_date?: string;
  to_date?: string;
  card_id?: string;
  status?: string;
}

// ── Exports ────────────────────────────────────────────────────────────────

export type MossExportFormat = "csv" | "datev" | "json";

export interface MossExportParams {
  format: MossExportFormat;
  from_date: string;
  to_date: string;
  include_receipts?: boolean;
}

export interface MossExportResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  download_url: string | null;
  created_at: string;
}

// ── Members ────────────────────────────────────────────────────────────────

export interface MossMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  team: string | null;
  status: "active" | "inactive";
}

// ── Webhook Events ─────────────────────────────────────────────────────────

export type MossWebhookEventType =
  | "transaction.created"
  | "transaction.updated"
  | "invoice.created"
  | "invoice.approved"
  | "invoice.rejected"
  | "invoice.paid"
  | "card.created"
  | "card.frozen"
  | "card.cancelled"
  | "export.completed";

export interface MossWebhookEvent {
  id: string;
  event: MossWebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface MossWebhookConfig {
  signingSecret: string;
  tolerance?: number;
}

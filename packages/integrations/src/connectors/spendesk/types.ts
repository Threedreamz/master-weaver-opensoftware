// ── Shared ──────────────────────────────────────────────────────────────────

export interface SpendeskClientConfig {
  accessToken: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface SpendeskPagination {
  has_more: boolean;
  next_cursor: string | null;
}

export interface SpendeskListResponse<T> {
  data: T[];
  pagination: SpendeskPagination;
}

export interface SpendeskListParams {
  limit?: number;
  cursor?: string;
}

// ── Expenses ───────────────────────────────────────────────────────────────

export type SpendeskExpenseStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "paid"
  | "cancelled";

export interface SpendeskExpense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  status: SpendeskExpenseStatus;
  category: string | null;
  supplier_name: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  user_id: string;
  team_id: string | null;
  metadata: Record<string, unknown>;
}

export interface SpendeskExpenseListParams extends SpendeskListParams {
  status?: SpendeskExpenseStatus;
  from_date?: string;
  to_date?: string;
  user_id?: string;
}

// ── Virtual Cards ──────────────────────────────────────────────────────────

export type SpendeskCardStatus = "active" | "frozen" | "cancelled" | "expired";
export type SpendeskCardType = "single_use" | "recurring" | "subscription";

export interface SpendeskVirtualCard {
  id: string;
  name: string;
  card_type: SpendeskCardType;
  status: SpendeskCardStatus;
  amount_limit: number;
  amount_spent: number;
  currency: string;
  supplier_name: string | null;
  expiry_date: string;
  created_at: string;
  user_id: string;
  team_id: string | null;
}

export interface SpendeskCreateCardParams {
  name: string;
  card_type: SpendeskCardType;
  amount_limit: number;
  currency: string;
  supplier_name?: string;
  description?: string;
  user_id: string;
}

// ── Approvals ──────────────────────────────────────────────────────────────

export type SpendeskApprovalStatus =
  | "pending"
  | "approved"
  | "rejected";

export interface SpendeskApproval {
  id: string;
  request_id: string;
  request_type: string;
  status: SpendeskApprovalStatus;
  approver_id: string;
  requester_id: string;
  amount: number;
  currency: string;
  description: string;
  created_at: string;
  decided_at: string | null;
}

// ── Exports ────────────────────────────────────────────────────────────────

export type SpendeskExportFormat = "csv" | "json" | "datev" | "sage";

export interface SpendeskExportParams {
  format: SpendeskExportFormat;
  from_date: string;
  to_date: string;
  include_receipts?: boolean;
}

export interface SpendeskExportResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  download_url: string | null;
  created_at: string;
  completed_at: string | null;
}

// ── Users ──────────────────────────────────────────────────────────────────

export interface SpendeskUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  team_id: string | null;
  status: "active" | "inactive";
}

// ── Suppliers ──────────────────────────────────────────────────────────────

export interface SpendeskSupplier {
  id: string;
  name: string;
  iban: string | null;
  bic: string | null;
  vat_number: string | null;
  address: string | null;
  country: string | null;
}

// ── Webhook Events ─────────────────────────────────────────────────────────

export type SpendeskWebhookEventType =
  | "expense.created"
  | "expense.approved"
  | "expense.rejected"
  | "expense.paid"
  | "card.created"
  | "card.frozen"
  | "card.cancelled"
  | "approval.pending"
  | "approval.decided"
  | "export.completed";

export interface SpendeskWebhookEvent {
  id: string;
  event_type: SpendeskWebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface SpendeskWebhookConfig {
  signingSecret: string;
  tolerance?: number;
}

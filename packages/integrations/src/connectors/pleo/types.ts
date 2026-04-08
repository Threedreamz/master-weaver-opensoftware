// ── Shared ──────────────────────────────────────────────────────────────────

export interface PleoClientConfig {
  accessToken: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface PleoPagination {
  offset: number;
  limit: number;
  total: number;
}

export interface PleoListResponse<T> {
  data: T[];
  pagination: PleoPagination;
}

export interface PleoListParams {
  offset?: number;
  limit?: number;
}

// ── Expenses ───────────────────────────────────────────────────────────────

export type PleoExpenseStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "exported";

export interface PleoExpense {
  id: string;
  amount: number;
  currency: string;
  status: PleoExpenseStatus;
  merchant_name: string | null;
  description: string | null;
  category: string | null;
  receipt_ids: string[];
  card_id: string | null;
  user_id: string;
  team_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  expense_date: string;
  metadata: Record<string, unknown>;
}

export interface PleoExpenseListParams extends PleoListParams {
  status?: PleoExpenseStatus;
  from?: string;
  to?: string;
  user_id?: string;
  team_id?: string;
}

// ── Cards ──────────────────────────────────────────────────────────────────

export type PleoCardStatus = "active" | "frozen" | "cancelled";
export type PleoCardType = "physical" | "virtual";

export interface PleoCard {
  id: string;
  name: string;
  card_type: PleoCardType;
  status: PleoCardStatus;
  spending_limit: number;
  currency: string;
  last_four_digits: string;
  user_id: string;
  team_id: string | null;
  created_at: string;
}

export interface PleoCardListParams extends PleoListParams {
  status?: PleoCardStatus;
  user_id?: string;
}

// ── Reimbursements ─────────────────────────────────────────────────────────

export type PleoReimbursementStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "paid";

export interface PleoReimbursement {
  id: string;
  amount: number;
  currency: string;
  status: PleoReimbursementStatus;
  description: string;
  user_id: string;
  receipt_ids: string[];
  created_at: string;
  updated_at: string;
  paid_at: string | null;
}

export interface PleoCreateReimbursementParams {
  amount: number;
  currency: string;
  description: string;
  user_id: string;
  receipt_ids?: string[];
}

// ── Exports ────────────────────────────────────────────────────────────────

export type PleoExportFormat = "csv" | "datev" | "xero" | "quickbooks";

export interface PleoExportParams {
  format: PleoExportFormat;
  from: string;
  to: string;
}

export interface PleoExportResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  download_url: string | null;
  created_at: string;
}

// ── Users ──────────────────────────────────────────────────────────────────

export interface PleoUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  team_id: string | null;
  status: "active" | "inactive";
}

// ── Teams ──────────────────────────────────────────────────────────────────

export interface PleoTeam {
  id: string;
  name: string;
  budget: number | null;
  currency: string | null;
  member_count: number;
}

// ── Receipts ───────────────────────────────────────────────────────────────

export interface PleoReceipt {
  id: string;
  file_url: string;
  mime_type: string;
  file_name: string;
  expense_id: string | null;
  uploaded_at: string;
}

// ── Webhook Events ─────────────────────────────────────────────────────────

export type PleoWebhookEventType =
  | "expense.created"
  | "expense.updated"
  | "expense.approved"
  | "expense.rejected"
  | "expense.exported"
  | "card.created"
  | "card.frozen"
  | "card.cancelled"
  | "reimbursement.created"
  | "reimbursement.paid";

export interface PleoWebhookEvent {
  id: string;
  event_type: PleoWebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface PleoWebhookConfig {
  signingSecret: string;
  tolerance?: number;
}

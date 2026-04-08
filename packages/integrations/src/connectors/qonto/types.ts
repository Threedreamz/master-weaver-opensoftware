// ==================== Qonto API Types ====================

/** Qonto transaction status */
export type QontoTransactionStatus =
  | "pending"
  | "reversed"
  | "declined"
  | "completed";

/** Qonto transaction side */
export type QontoTransactionSide = "credit" | "debit";

/** Qonto transaction operation type */
export type QontoOperationType =
  | "card"
  | "direct_debit"
  | "income"
  | "qonto_fee"
  | "swift_income"
  | "transfer"
  | "cheque"
  | string;

/** Qonto membership role */
export type QontoMembershipRole = "owner" | "admin" | "manager" | "employee" | "reporting";

// ==================== Organization ====================

export interface QontoOrganization {
  slug: string;
  legal_name: string;
  locale?: string;
  legal_share_capital?: number;
  legal_form?: string;
  legal_number?: string;
  legal_vat_number?: string;
  bank_accounts: QontoBankAccount[];
}

export interface QontoOrganizationResponse {
  organization: QontoOrganization;
}

// ==================== Bank Accounts ====================

export interface QontoBankAccount {
  slug: string;
  iban: string;
  bic: string;
  currency: string;
  balance: number;
  balance_cents: number;
  authorized_balance: number;
  authorized_balance_cents: number;
  name: string;
  updated_at: string;
  status: "active" | "closed";
}

// ==================== Transactions ====================

export interface QontoTransaction {
  id: string;
  transaction_id: string;
  amount: number;
  amount_cents: number;
  local_amount?: number;
  local_amount_cents?: number;
  local_currency?: string;
  side: QontoTransactionSide;
  operation_type: QontoOperationType;
  currency: string;
  label: string;
  settled_at?: string;
  emitted_at: string;
  updated_at: string;
  status: QontoTransactionStatus;
  note?: string;
  reference?: string;
  vat_amount?: number;
  vat_amount_cents?: number;
  vat_rate?: number;
  initiator_id?: string;
  label_ids?: string[];
  attachment_ids?: string[];
  category?: string;
}

export interface QontoTransactionsResponse {
  transactions: QontoTransaction[];
  meta: QontoPaginationMeta;
}

export interface QontoTransactionsParams {
  slug: string; // Bank account slug
  status?: QontoTransactionStatus[];
  updated_at_from?: string;
  updated_at_to?: string;
  settled_at_from?: string;
  settled_at_to?: string;
  side?: QontoTransactionSide;
  operation_type?: QontoOperationType[];
  current_page?: number;
  per_page?: number;
  sort_by?: "updated_at" | "settled_at";
}

// ==================== Attachments ====================

export interface QontoAttachment {
  id: string;
  created_at: string;
  file_name: string;
  file_size: number;
  file_content_type: string;
  url: string;
}

export interface QontoAttachmentResponse {
  attachment: QontoAttachment;
}

// ==================== Labels ====================

export interface QontoLabel {
  id: string;
  name: string;
  parent_id?: string;
}

export interface QontoLabelsResponse {
  labels: QontoLabel[];
}

// ==================== Members ====================

export interface QontoMember {
  id: string;
  first_name: string;
  last_name: string;
  role: QontoMembershipRole;
  email?: string;
  status: "active" | "invited" | "revoked";
}

export interface QontoMembersResponse {
  members: QontoMember[];
  meta: QontoPaginationMeta;
}

export interface QontoMembersParams {
  current_page?: number;
  per_page?: number;
}

// ==================== Pagination ====================

export interface QontoPaginationMeta {
  current_page: number;
  next_page: number | null;
  prev_page: number | null;
  total_pages: number;
  total_count: number;
  per_page: number;
}

// ==================== Client Config ====================

export interface QontoClientConfig {
  organizationSlug: string;
  secretKey: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

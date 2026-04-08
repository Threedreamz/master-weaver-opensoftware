// ── Shared ──────────────────────────────────────────────────────────────────

export interface ExpensifyClientConfig {
  partnerUserId: string;
  partnerUserSecret: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

// ── Expense Reports ────────────────────────────────────────────────────────

export type ExpensifyReportStatus =
  | "Open"
  | "Submitted"
  | "Approved"
  | "Reimbursed"
  | "Archived";

export interface ExpensifyReport {
  reportID: string;
  reportName: string;
  status: ExpensifyReportStatus;
  total: number;
  currency: string;
  created: string;
  submitted: string | null;
  policyID: string;
  ownerEmail: string;
  managerEmail: string | null;
  expenses: ExpensifyExpense[];
}

export interface ExpensifyExpense {
  transactionID: string;
  amount: number;
  currency: string;
  merchant: string;
  category: string | null;
  tag: string | null;
  comment: string | null;
  created: string;
  modified: string;
  receiptURL: string | null;
  reimbursable: boolean;
  billable: boolean;
  reportID: string;
}

// ── Policies ───────────────────────────────────────────────────────────────

export interface ExpensifyPolicy {
  policyID: string;
  name: string;
  type: "corporate" | "team" | "personal";
  owner: string;
  outputCurrency: string;
  role: string;
}

// ── Receipt Upload ─────────────────────────────────────────────────────────

export interface ExpensifyCreateExpenseParams {
  reportID?: string;
  policyID: string;
  merchant: string;
  amount: number;
  currency: string;
  category?: string;
  tag?: string;
  comment?: string;
  date?: string;
  reimbursable?: boolean;
  billable?: boolean;
}

export interface ExpensifyReceiptUploadParams {
  transactionID: string;
  /** Base64-encoded receipt image. */
  receipt: string;
  filename: string;
}

// ── API Request / Response ─────────────────────────────────────────────────

export interface ExpensifyCommandRequest {
  type: string;
  credentials: {
    partnerUserID: string;
    partnerUserSecret: string;
  };
  inputSettings: Record<string, unknown>;
}

export interface ExpensifyApiResponse<T = unknown> {
  responseCode: number;
  responseMessage: string;
  data?: T;
}

// ── Export ──────────────────────────────────────────────────────────────────

export type ExpensifyExportFormat = "csv" | "json" | "pdf";

export interface ExpensifyExportParams {
  policyID: string;
  startDate: string;
  endDate: string;
  reportState?: ExpensifyReportStatus;
  format?: ExpensifyExportFormat;
}

export interface ExpensifyExportResponse {
  fileName: string;
  fileUrl: string;
  reportCount: number;
}

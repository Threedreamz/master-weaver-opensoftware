// ==================== creditshelf API Types ====================
// Business loans, financing requests, portfolio management
// API key authentication + webhooks

/** creditshelf client configuration */
export interface CreditshelfClientConfig {
  /** creditshelf API key */
  apiKey: string;
  /** Webhook signing secret */
  webhookSecret?: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Financing Requests ====================

export interface CreditshelfFinancingRequest {
  id: string;
  companyName: string;
  companyId?: string;
  requestedAmount: number;
  currency: string;
  purpose: CreditshelfFinancingPurpose;
  termMonths: number;
  status: CreditshelfFinancingStatus;
  offeredRate?: number;
  offeredAmount?: number;
  annualRevenue?: number;
  employeeCount?: number;
  yearFounded?: number;
  contactPerson: CreditshelfContactPerson;
  documents?: CreditshelfDocument[];
  submittedAt: string;
  decidedAt?: string;
  fundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreditshelfFinancingPurpose =
  | "working_capital"
  | "growth"
  | "equipment"
  | "refinancing"
  | "acquisition"
  | "real_estate"
  | "other";

export type CreditshelfFinancingStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "offer_sent"
  | "accepted"
  | "funded"
  | "rejected"
  | "withdrawn"
  | "expired";

export interface CreditshelfContactPerson {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: string;
}

export interface CreditshelfDocument {
  id: string;
  type: CreditshelfDocumentType;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
}

export type CreditshelfDocumentType =
  | "annual_report"
  | "bwa"
  | "bank_statement"
  | "tax_return"
  | "balance_sheet"
  | "business_plan"
  | "identity_document"
  | "other";

export interface CreditshelfCreateFinancingRequest {
  companyName: string;
  requestedAmount: number;
  currency?: string;
  purpose: CreditshelfFinancingPurpose;
  termMonths: number;
  annualRevenue?: number;
  employeeCount?: number;
  yearFounded?: number;
  contactPerson: CreditshelfContactPerson;
}

// ==================== Loans / Portfolio ====================

export interface CreditshelfLoan {
  id: string;
  financingRequestId: string;
  companyName: string;
  principalAmount: number;
  outstandingAmount: number;
  currency: string;
  interestRate: number;
  termMonths: number;
  startDate: string;
  maturityDate: string;
  status: CreditshelfLoanStatus;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
  repaymentSchedule?: CreditshelfRepaymentEntry[];
  createdAt: string;
  updatedAt: string;
}

export type CreditshelfLoanStatus =
  | "active"
  | "current"
  | "overdue"
  | "default"
  | "restructured"
  | "repaid"
  | "written_off";

export interface CreditshelfRepaymentEntry {
  date: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  status: "pending" | "paid" | "overdue";
  paidDate?: string;
}

export interface CreditshelfPortfolioSummary {
  totalLoans: number;
  totalOutstanding: number;
  totalPrincipal: number;
  averageInterestRate: number;
  currency: string;
  statusBreakdown: Record<CreditshelfLoanStatus, number>;
  nextPaymentsDue: CreditshelfUpcomingPayment[];
}

export interface CreditshelfUpcomingPayment {
  loanId: string;
  companyName: string;
  amount: number;
  dueDate: string;
}

// ==================== Webhook Types ====================

export type CreditshelfWebhookEventType =
  | "financing_request.submitted"
  | "financing_request.approved"
  | "financing_request.rejected"
  | "financing_request.offer_sent"
  | "financing_request.accepted"
  | "financing_request.funded"
  | "loan.payment_received"
  | "loan.payment_overdue"
  | "loan.status_changed"
  | "loan.matured"
  | "document.uploaded"
  | "document.verified";

export interface CreditshelfWebhookPayload {
  eventId: string;
  eventType: CreditshelfWebhookEventType;
  resourceType: "financing_request" | "loan" | "document";
  resourceId: string;
  data: Record<string, unknown>;
  occurredAt: string;
}

// ==================== Pagination ====================

export interface CreditshelfPaginationParams {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreditshelfPagedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

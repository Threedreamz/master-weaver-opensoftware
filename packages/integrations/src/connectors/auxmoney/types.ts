// ==================== auxmoney Business API Types ====================
// Business credits, receivables financing
// API key authentication + webhooks

/** auxmoney client configuration */
export interface AuxmoneyClientConfig {
  /** auxmoney API key */
  apiKey: string;
  /** auxmoney partner ID */
  partnerId: string;
  /** Webhook signing secret */
  webhookSecret?: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Credit Applications ====================

export interface AuxmoneyCreditApplication {
  id: string;
  partnerId: string;
  companyName: string;
  requestedAmount: number;
  currency: string;
  purpose: AuxmoneyCreditPurpose;
  termMonths: number;
  status: AuxmoneyCreditStatus;
  offeredAmount?: number;
  offeredRate?: number;
  offeredTermMonths?: number;
  applicant: AuxmoneyApplicant;
  companyDetails?: AuxmoneyCompanyDetails;
  submittedAt?: string;
  decidedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type AuxmoneyCreditPurpose =
  | "working_capital"
  | "growth"
  | "equipment"
  | "inventory"
  | "receivables"
  | "refinancing"
  | "other";

export type AuxmoneyCreditStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "additional_info_required"
  | "approved"
  | "offer_made"
  | "accepted"
  | "disbursed"
  | "rejected"
  | "withdrawn"
  | "expired";

export interface AuxmoneyApplicant {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
}

export interface AuxmoneyCompanyDetails {
  legalForm?: string;
  registrationNumber?: string;
  taxId?: string;
  annualRevenue?: number;
  employeeCount?: number;
  yearFounded?: number;
  industry?: string;
  address?: AuxmoneyAddress;
}

export interface AuxmoneyAddress {
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

export interface AuxmoneyCreateCreditApplicationRequest {
  companyName: string;
  requestedAmount: number;
  currency?: string;
  purpose: AuxmoneyCreditPurpose;
  termMonths: number;
  applicant: AuxmoneyApplicant;
  companyDetails?: AuxmoneyCompanyDetails;
}

// ==================== Receivables Financing ====================

export interface AuxmoneyReceivable {
  id: string;
  debtorName: string;
  debtorId?: string;
  invoiceNumber: string;
  invoiceAmount: number;
  currency: string;
  invoiceDate: string;
  dueDate: string;
  status: AuxmoneyReceivableStatus;
  financedAmount?: number;
  advanceRate?: number;
  feeAmount?: number;
  paidAmount?: number;
  paidDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type AuxmoneyReceivableStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "financed"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "defaulted"
  | "rejected";

export interface AuxmoneySubmitReceivableRequest {
  debtorName: string;
  debtorId?: string;
  invoiceNumber: string;
  invoiceAmount: number;
  currency?: string;
  invoiceDate: string;
  dueDate: string;
}

// ==================== Portfolio ====================

export interface AuxmoneyPortfolioSummary {
  totalCredits: number;
  totalDisbursed: number;
  totalOutstanding: number;
  totalReceivablesFinanced: number;
  currency: string;
  creditStatusBreakdown: Record<string, number>;
  receivableStatusBreakdown: Record<string, number>;
}

// ==================== Webhook Types ====================

export type AuxmoneyWebhookEventType =
  | "credit.submitted"
  | "credit.approved"
  | "credit.rejected"
  | "credit.offer_made"
  | "credit.accepted"
  | "credit.disbursed"
  | "receivable.submitted"
  | "receivable.approved"
  | "receivable.financed"
  | "receivable.paid"
  | "receivable.overdue"
  | "receivable.defaulted"
  | "payment.received"
  | "payment.overdue";

export interface AuxmoneyWebhookPayload {
  eventId: string;
  eventType: AuxmoneyWebhookEventType;
  resourceType: "credit" | "receivable" | "payment";
  resourceId: string;
  data: Record<string, unknown>;
  occurredAt: string;
}

// ==================== Pagination ====================

export interface AuxmoneyPaginationParams {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface AuxmoneyPagedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

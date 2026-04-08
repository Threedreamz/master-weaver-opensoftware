// ==================== Bilendo API Types ====================
// AR automation, dunning workflows, payment tracking, customer risk
// API key authentication + webhooks

/** Bilendo client configuration */
export interface BilendoClientConfig {
  /** Bilendo API key */
  apiKey: string;
  /** Webhook signing secret for event verification */
  webhookSecret?: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Customers ====================

export interface BilendoCustomer {
  id: string;
  externalId?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: BilendoAddress;
  taxId?: string;
  vatId?: string;
  riskScore?: number;
  riskCategory?: BilendoRiskCategory;
  creditLimit?: number;
  currency?: string;
  totalOutstanding?: number;
  totalOverdue?: number;
  paymentTermDays?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export type BilendoRiskCategory = "low" | "medium" | "high" | "critical";

export interface BilendoAddress {
  street?: string;
  postalCode?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface BilendoCreateCustomerRequest {
  externalId?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: BilendoAddress;
  taxId?: string;
  vatId?: string;
  creditLimit?: number;
  currency?: string;
  paymentTermDays?: number;
  tags?: string[];
}

export interface BilendoUpdateCustomerRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: BilendoAddress;
  creditLimit?: number;
  paymentTermDays?: number;
  tags?: string[];
}

// ==================== Invoices ====================

export interface BilendoInvoice {
  id: string;
  externalId?: string;
  customerId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: BilendoInvoiceStatus;
  paidAmount?: number;
  paidDate?: string;
  dunningLevel: number;
  lastDunningDate?: string;
  notes?: string;
  lineItems?: BilendoLineItem[];
  createdAt: string;
  updatedAt: string;
}

export type BilendoInvoiceStatus =
  | "draft"
  | "sent"
  | "overdue"
  | "dunning"
  | "paid"
  | "partially_paid"
  | "written_off"
  | "disputed";

export interface BilendoLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  amount: number;
}

export interface BilendoCreateInvoiceRequest {
  externalId?: string;
  customerId: string;
  invoiceNumber: string;
  amount: number;
  currency?: string;
  issueDate: string;
  dueDate: string;
  notes?: string;
  lineItems?: BilendoLineItem[];
}

// ==================== Dunning Workflows ====================

export interface BilendoDunningWorkflow {
  id: string;
  name: string;
  description?: string;
  steps: BilendoDunningStep[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface BilendoDunningStep {
  level: number;
  daysAfterDue: number;
  actionType: BilendoDunningActionType;
  templateId?: string;
  feeAmount?: number;
  feeCurrency?: string;
}

export type BilendoDunningActionType =
  | "email_reminder"
  | "letter_reminder"
  | "phone_reminder"
  | "dunning_letter"
  | "collection_referral"
  | "legal_action";

export interface BilendoDunningAction {
  id: string;
  invoiceId: string;
  customerId: string;
  workflowId: string;
  step: BilendoDunningStep;
  status: "pending" | "sent" | "completed" | "failed" | "skipped";
  scheduledAt: string;
  executedAt?: string;
  error?: string;
}

// ==================== Payments ====================

export interface BilendoPayment {
  id: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface BilendoRecordPaymentRequest {
  invoiceId: string;
  amount: number;
  currency?: string;
  paymentDate: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}

// ==================== Customer Risk ====================

export interface BilendoCustomerRiskReport {
  customerId: string;
  customerName: string;
  riskScore: number;
  riskCategory: BilendoRiskCategory;
  totalInvoices: number;
  totalOutstanding: number;
  totalOverdue: number;
  averageDaysToPayment: number;
  overdueRatio: number;
  creditLimit: number;
  creditUtilization: number;
  riskFactors: BilendoRiskFactor[];
  generatedAt: string;
}

export interface BilendoRiskFactor {
  factor: string;
  impact: "positive" | "negative" | "neutral";
  description: string;
}

// ==================== Webhook Types ====================

export type BilendoWebhookEventType =
  | "invoice.created"
  | "invoice.updated"
  | "invoice.overdue"
  | "invoice.paid"
  | "invoice.partially_paid"
  | "invoice.written_off"
  | "dunning.step_executed"
  | "dunning.step_failed"
  | "payment.received"
  | "payment.reversed"
  | "customer.risk_changed"
  | "customer.credit_limit_exceeded";

export interface BilendoWebhookPayload {
  eventId: string;
  eventType: BilendoWebhookEventType;
  resourceType: "invoice" | "payment" | "customer" | "dunning";
  resourceId: string;
  data: Record<string, unknown>;
  occurredAt: string;
}

// ==================== Pagination ====================

export interface BilendoPaginationParams {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface BilendoPagedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

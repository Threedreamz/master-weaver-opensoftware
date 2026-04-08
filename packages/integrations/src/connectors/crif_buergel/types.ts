// ==================== CRIF Bürgel API Types ====================
// German business credit reports and debtor management
// API key authentication

/** CRIF Bürgel client configuration */
export interface CrifBuergelClientConfig {
  /** CRIF API key */
  apiKey: string;
  /** CRIF username */
  username: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Company Search ====================

export interface CrifCompanySearchParams {
  /** Company name */
  name?: string;
  /** City */
  city?: string;
  /** Postal code */
  postalCode?: string;
  /** Country (default: DE) */
  country?: string;
  /** Trade register number */
  registerNumber?: string;
  /** VAT ID */
  vatId?: string;
  /** Max results (default: 20) */
  limit?: number;
}

export interface CrifCompanySearchResult {
  crifId: string;
  companyName: string;
  legalForm?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  status?: "active" | "inactive" | "in_liquidation" | "insolvent";
  matchConfidence?: number;
}

export interface CrifCompanySearchResponse {
  totalHits: number;
  results: CrifCompanySearchResult[];
}

// ==================== Credit Report ====================

export interface CrifCreditReport {
  crifId: string;
  companyName: string;
  legalForm?: string;
  address?: CrifAddress;
  registration?: CrifRegistration;
  management?: CrifManagementMember[];
  financialSummary?: CrifFinancialSummary;
  creditAssessment: CrifCreditAssessment;
  paymentBehavior?: CrifPaymentBehavior;
  negativeRecords?: CrifNegativeRecord[];
  reportGeneratedAt: string;
}

export interface CrifAddress {
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface CrifRegistration {
  registerType: string;
  registerNumber: string;
  registerCourt?: string;
  registrationDate?: string;
}

export interface CrifManagementMember {
  name: string;
  position: string;
  appointedDate?: string;
}

export interface CrifFinancialSummary {
  revenue?: number;
  revenueYear?: number;
  employees?: number;
  equity?: number;
  totalAssets?: number;
  profitLoss?: number;
  currency?: string;
}

export interface CrifCreditAssessment {
  /** CRIF score (1-100, higher = better) */
  score: number;
  /** Risk class (1-5) */
  riskClass: number;
  /** Risk label */
  riskLabel: string;
  /** Probability of default percentage */
  probabilityOfDefault: number;
  /** Recommended credit limit in EUR */
  creditLimit?: number;
  /** Assessment date */
  assessmentDate: string;
}

export interface CrifPaymentBehavior {
  averageDelayDays?: number;
  paymentIndex?: number;
  experienceCount?: number;
  lastUpdated?: string;
}

export interface CrifNegativeRecord {
  type: string;
  description: string;
  date?: string;
  amount?: number;
  currency?: string;
  source?: string;
}

// ==================== Debtor Management ====================

export interface CrifDebtor {
  debtorId: string;
  crifId?: string;
  companyName: string;
  contactPerson?: string;
  address?: CrifAddress;
  outstandingAmount: number;
  currency: string;
  dueDate: string;
  status: CrifDebtorStatus;
  lastActionDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CrifDebtorStatus =
  | "open"
  | "reminded"
  | "dunning"
  | "collection"
  | "legal"
  | "paid"
  | "written_off";

export interface CrifCreateDebtorRequest {
  crifId?: string;
  companyName: string;
  contactPerson?: string;
  address?: CrifAddress;
  outstandingAmount: number;
  currency?: string;
  dueDate: string;
  notes?: string;
}

export interface CrifUpdateDebtorRequest {
  status?: CrifDebtorStatus;
  outstandingAmount?: number;
  notes?: string;
}

export interface CrifDebtorAction {
  actionId: string;
  debtorId: string;
  actionType: "reminder" | "dunning_letter" | "collection_referral" | "legal_action" | "payment_received";
  description: string;
  performedAt: string;
  performedBy?: string;
}

// ==================== Pagination ====================

export interface CrifPaginationParams {
  page?: number;
  limit?: number;
}

export interface CrifPagedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

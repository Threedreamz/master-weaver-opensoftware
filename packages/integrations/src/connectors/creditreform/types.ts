// ==================== Creditreform API Types ====================
// German credit agency — company search, credit reports, scoring, monitoring
// API key authentication

/** Creditreform client configuration */
export interface CreditreformClientConfig {
  /** Creditreform API key */
  apiKey: string;
  /** Customer ID for Creditreform account */
  customerId: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Company Search ====================

export interface CreditreformCompanySearchParams {
  /** Company name (partial match) */
  name?: string;
  /** City or postal code */
  location?: string;
  /** Country ISO code (default: DE) */
  country?: string;
  /** Creditreform ID (exact match) */
  creditreformId?: string;
  /** Trade register number */
  registerNumber?: string;
  /** Maximum results to return */
  maxResults?: number;
}

export interface CreditreformCompanySearchResult {
  creditreformId: string;
  name: string;
  legalForm?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  registerType?: string;
  registerNumber?: string;
  matchScore?: number;
}

export interface CreditreformCompanySearchResponse {
  totalResults: number;
  results: CreditreformCompanySearchResult[];
}

// ==================== Credit Report ====================

export interface CreditreformCreditReport {
  creditreformId: string;
  companyName: string;
  legalForm?: string;
  address?: CreditreformAddress;
  foundedDate?: string;
  registerEntry?: CreditreformRegisterEntry;
  management?: CreditreformManagementMember[];
  financials?: CreditreformFinancials;
  creditScore?: CreditreformCreditScore;
  paymentBehavior?: CreditreformPaymentBehavior;
  negativeIndicators?: CreditreformNegativeIndicator[];
  reportDate: string;
  validUntil?: string;
}

export interface CreditreformAddress {
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
}

export interface CreditreformRegisterEntry {
  registerType: string;
  registerNumber: string;
  registerCourt?: string;
  registrationDate?: string;
}

export interface CreditreformManagementMember {
  name: string;
  role: string;
  since?: string;
}

export interface CreditreformFinancials {
  annualRevenue?: number;
  annualRevenueYear?: number;
  employees?: number;
  equity?: number;
  totalAssets?: number;
  currency?: string;
}

export interface CreditreformCreditScore {
  /** Score value (100 = best, 600 = worst) */
  score: number;
  /** Risk class (1-6) */
  riskClass: number;
  /** Probability of default (percentage) */
  probabilityOfDefault: number;
  /** Credit limit recommendation in EUR */
  creditLimitRecommendation?: number;
  /** Score date */
  scoreDate: string;
}

export interface CreditreformPaymentBehavior {
  /** Average payment delay in days */
  averagePaymentDelay?: number;
  /** Payment index (0-4) */
  paymentIndex?: number;
  /** Number of payment experiences */
  experienceCount?: number;
}

export interface CreditreformNegativeIndicator {
  type: string;
  description: string;
  date?: string;
  amount?: number;
  currency?: string;
}

// ==================== Monitoring ====================

export interface CreditreformMonitoringRequest {
  creditreformId: string;
  /** Event types to monitor */
  events?: CreditreformMonitoringEventType[];
  /** Notification email */
  notificationEmail?: string;
}

export type CreditreformMonitoringEventType =
  | "score_change"
  | "address_change"
  | "management_change"
  | "insolvency"
  | "legal_form_change"
  | "negative_indicator";

export interface CreditreformMonitoringSubscription {
  subscriptionId: string;
  creditreformId: string;
  events: CreditreformMonitoringEventType[];
  status: "active" | "paused" | "cancelled";
  createdAt: string;
}

export interface CreditreformMonitoringAlert {
  alertId: string;
  subscriptionId: string;
  creditreformId: string;
  eventType: CreditreformMonitoringEventType;
  description: string;
  details?: Record<string, unknown>;
  createdAt: string;
  acknowledged: boolean;
}

// ==================== Pagination ====================

export interface CreditreformPaginationParams {
  page?: number;
  pageSize?: number;
}

export interface CreditreformPagedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

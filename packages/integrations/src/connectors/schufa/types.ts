// ==================== SCHUFA B2B API Types ====================
// German credit bureau — business credit checks, scoring, monitoring
// Custom certificate-based authentication

/** SCHUFA B2B client configuration */
export interface SchufaClientConfig {
  /** SCHUFA partner ID */
  partnerId: string;
  /** PEM-encoded client certificate for mutual TLS */
  certificate: string;
  /** PEM-encoded private key for mutual TLS */
  privateKey: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Business Credit Check ====================

export interface SchufaCreditCheckRequest {
  /** Company name */
  companyName: string;
  /** Street address */
  street?: string;
  /** Postal code */
  postalCode?: string;
  /** City */
  city?: string;
  /** Trade register number */
  registerNumber?: string;
  /** Tax ID (Steuernummer) */
  taxId?: string;
  /** VAT registration ID (USt-IdNr) */
  vatId?: string;
  /** Report type to request */
  reportType?: SchufaReportType;
}

export type SchufaReportType =
  | "compact"
  | "standard"
  | "premium";

export interface SchufaCreditCheckResponse {
  requestId: string;
  companyIdentification: SchufaCompanyIdentification;
  score: SchufaScore;
  riskIndicators?: SchufaRiskIndicator[];
  paymentExperience?: SchufaPaymentExperience;
  negativeFeatures?: SchufaNegativeFeature[];
  reportDate: string;
}

export interface SchufaCompanyIdentification {
  schufaId: string;
  companyName: string;
  legalForm?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  registerType?: string;
  registerNumber?: string;
  foundedDate?: string;
}

// ==================== Scoring ====================

export interface SchufaScore {
  /** SCHUFA business score (100-999, higher = better) */
  scoreValue: number;
  /** Risk category (A-F) */
  riskCategory: string;
  /** Probability of default as percentage */
  probabilityOfDefault: number;
  /** Score valid until */
  validUntil: string;
  /** Recommended credit limit in EUR */
  creditLimitRecommendation?: number;
}

export interface SchufaRiskIndicator {
  code: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface SchufaPaymentExperience {
  /** Average days to payment */
  averageDaysToPayment?: number;
  /** Payment reliability index (1-5) */
  reliabilityIndex?: number;
  /** Number of reported payment experiences */
  reportCount?: number;
  /** Last update date */
  lastUpdated?: string;
}

export interface SchufaNegativeFeature {
  type: SchufaNegativeFeatureType;
  description: string;
  date?: string;
  amount?: number;
  currency?: string;
  source?: string;
}

export type SchufaNegativeFeatureType =
  | "insolvency"
  | "enforcement_order"
  | "warrant_of_arrest"
  | "affidavit"
  | "collection"
  | "payment_default"
  | "protest_of_bill";

// ==================== Monitoring ====================

export interface SchufaMonitoringRequest {
  schufaId: string;
  events: SchufaMonitoringEventType[];
  callbackUrl?: string;
}

export type SchufaMonitoringEventType =
  | "score_change"
  | "negative_feature"
  | "insolvency"
  | "address_change"
  | "management_change"
  | "legal_form_change";

export interface SchufaMonitoringSubscription {
  subscriptionId: string;
  schufaId: string;
  events: SchufaMonitoringEventType[];
  status: "active" | "paused" | "cancelled";
  createdAt: string;
}

export interface SchufaMonitoringEvent {
  eventId: string;
  subscriptionId: string;
  schufaId: string;
  eventType: SchufaMonitoringEventType;
  description: string;
  previousValue?: string;
  newValue?: string;
  occurredAt: string;
}

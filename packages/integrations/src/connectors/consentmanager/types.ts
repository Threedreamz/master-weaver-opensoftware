// ==================== Consentmanager API Types ====================
// Consent Management Platform (CMP) for GDPR/ePrivacy compliance.
// API key authentication. Webhook support.

/** Consent status for a vendor/purpose */
export type ConsentStatus = "accepted" | "rejected" | "pending" | "not_applicable";

/** Type of consent purpose */
export type ConsentPurposeType =
  | "necessary"
  | "functional"
  | "statistics"
  | "marketing"
  | "social_media"
  | "custom";

/** Status of a CMP design/configuration */
export type CmpDesignStatus = "active" | "draft" | "archived";

/** Report time granularity */
export type ReportGranularity = "hourly" | "daily" | "weekly" | "monthly";

/** Webhook event types supported by Consentmanager */
export type ConsentWebhookEventType =
  | "consent.given"
  | "consent.updated"
  | "consent.revoked"
  | "consent.expired"
  | "design.published"
  | "vendor.added"
  | "vendor.removed"
  | "scan.completed";

// ==================== CMP Configuration ====================

/** CMP (Consent Management Platform) configuration */
export interface CmpConfiguration {
  /** Configuration ID */
  id: string;
  /** Configuration name */
  name: string;
  /** Domain(s) this configuration applies to */
  domains: string[];
  /** Current status */
  status: CmpDesignStatus;
  /** Design/layout template ID */
  designTemplateId?: string;
  /** Purposes defined in this CMP */
  purposes: CmpPurpose[];
  /** Vendors/third parties */
  vendors: CmpVendor[];
  /** Regulation mode */
  regulationMode: "gdpr" | "ccpa" | "lgpd" | "popia" | "custom";
  /** Whether IAB TCF v2.2 is enabled */
  iabTcfEnabled: boolean;
  /** Whether Google Consent Mode v2 is enabled */
  googleConsentModeEnabled: boolean;
  /** Language settings */
  languages: string[];
  /** Default language */
  defaultLanguage: string;
  /** Date created */
  createdAt: string;
  /** Date last updated */
  updatedAt: string;
}

/** Purpose definition in a CMP */
export interface CmpPurpose {
  /** Purpose ID */
  id: string;
  /** Purpose name (e.g., "Analytics", "Marketing") */
  name: string;
  /** Description shown to users */
  description: string;
  /** Purpose type */
  type: ConsentPurposeType;
  /** Whether this purpose is legally required (cannot be declined) */
  required: boolean;
  /** Whether enabled by default */
  defaultEnabled: boolean;
  /** IAB TCF purpose ID (if applicable) */
  iabPurposeId?: number;
  /** Associated vendor IDs */
  vendorIds: string[];
}

/** Vendor definition in a CMP */
export interface CmpVendor {
  /** Vendor ID */
  id: string;
  /** Vendor name */
  name: string;
  /** Vendor privacy policy URL */
  privacyPolicyUrl?: string;
  /** IAB TCF vendor ID (if applicable) */
  iabVendorId?: number;
  /** Purposes this vendor requires */
  purposeIds: string[];
  /** Cookie names used by this vendor */
  cookies?: string[];
  /** Data retention period in days */
  retentionDays?: number;
}

// ==================== Consent Records ====================

/** A consent log entry */
export interface ConsentLogEntry {
  /** Log entry ID */
  id: string;
  /** Visitor/user ID (pseudonymized) */
  visitorId: string;
  /** Domain where consent was given */
  domain: string;
  /** Consent decisions by purpose */
  decisions: ConsentDecision[];
  /** IAB TC string (if TCF enabled) */
  tcString?: string;
  /** Google Consent Mode state */
  googleConsentState?: GoogleConsentState;
  /** User agent */
  userAgent?: string;
  /** Country (from IP geolocation) */
  country?: string;
  /** Timestamp of consent */
  consentedAt: string;
  /** Timestamp of last update */
  updatedAt?: string;
  /** Timestamp of expiry */
  expiresAt?: string;
}

/** Individual consent decision for a purpose */
export interface ConsentDecision {
  /** Purpose ID */
  purposeId: string;
  /** Purpose name */
  purposeName: string;
  /** Consent status */
  status: ConsentStatus;
}

/** Google Consent Mode v2 state */
export interface GoogleConsentState {
  ad_storage: ConsentStatus;
  analytics_storage: ConsentStatus;
  ad_user_data: ConsentStatus;
  ad_personalization: ConsentStatus;
  functionality_storage?: ConsentStatus;
  personalization_storage?: ConsentStatus;
  security_storage?: ConsentStatus;
}

// ==================== Reports ====================

/** Consent statistics report */
export interface ConsentReport {
  /** Report period start */
  periodStart: string;
  /** Report period end */
  periodEnd: string;
  /** Domain */
  domain: string;
  /** Total visitors shown the consent dialog */
  totalVisitors: number;
  /** Visitors who accepted all */
  acceptedAll: number;
  /** Visitors who rejected all */
  rejectedAll: number;
  /** Visitors who customized their choices */
  customized: number;
  /** Visitors who ignored/closed without choosing */
  ignored: number;
  /** Acceptance rate (0-100) */
  acceptanceRate: number;
  /** Breakdown by purpose */
  purposeBreakdown: PurposeStatistic[];
  /** Daily/hourly breakdown */
  timeSeries?: TimeSeriesEntry[];
}

/** Statistics for a single purpose */
export interface PurposeStatistic {
  purposeId: string;
  purposeName: string;
  accepted: number;
  rejected: number;
  acceptanceRate: number;
}

/** Time series data point */
export interface TimeSeriesEntry {
  timestamp: string;
  visitors: number;
  acceptedAll: number;
  rejectedAll: number;
  customized: number;
}

// ==================== Webhooks ====================

/** Webhook configuration */
export interface ConsentWebhook {
  /** Webhook ID */
  id: string;
  /** Target URL */
  url: string;
  /** Events this webhook listens to */
  events: ConsentWebhookEventType[];
  /** Whether the webhook is active */
  active: boolean;
  /** Secret for signature verification */
  secret: string;
  /** Date created */
  createdAt: string;
}

/** Webhook payload */
export interface ConsentWebhookPayload {
  /** Event type */
  event: ConsentWebhookEventType;
  /** Timestamp */
  timestamp: string;
  /** Domain */
  domain: string;
  /** Event-specific data */
  data: Record<string, unknown>;
}

// ==================== Request / Response ====================

/** Parameters for querying consent logs */
export interface ConsentLogParams {
  /** Filter by domain */
  domain?: string;
  /** Filter by date range start */
  dateFrom?: string;
  /** Filter by date range end */
  dateTo?: string;
  /** Filter by visitor ID */
  visitorId?: string;
  /** Filter by country */
  country?: string;
  /** Page number */
  page?: number;
  /** Page size */
  pageSize?: number;
}

/** Parameters for generating reports */
export interface ConsentReportParams {
  /** Domain to report on */
  domain: string;
  /** Report start date (YYYY-MM-DD) */
  dateFrom: string;
  /** Report end date (YYYY-MM-DD) */
  dateTo: string;
  /** Time granularity for time series */
  granularity?: ReportGranularity;
  /** Include time series data */
  includeTimeSeries?: boolean;
}

/** Paginated list response */
export interface ConsentListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Parameters for creating a webhook */
export interface CreateWebhookParams {
  url: string;
  events: ConsentWebhookEventType[];
  secret?: string;
}

// ==================== Client Config ====================

export interface ConsentmanagerClientConfig {
  /** API key */
  apiKey: string;
  /** CMP ID / account ID */
  cmpId: string;
  /** Base URL override */
  baseUrl?: string;
  /** Request timeout in ms */
  timeout?: number;
}

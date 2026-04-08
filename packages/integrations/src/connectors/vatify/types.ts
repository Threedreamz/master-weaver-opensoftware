// ==================== Vatify Types ====================
// Enhanced EU VAT validation, monitoring, and bulk validation.
// API key authentication. Supports webhooks.

/** Vatify client configuration */
export interface VatifyClientConfig {
  /** API key for authentication */
  apiKey: string;
  /** Request timeout in ms */
  timeout?: number;
}

/** VAT number validation request */
export interface VatifyValidationRequest {
  /** Full VAT number including country prefix (e.g., "DE123456789") */
  vatNumber: string;
  /** Requester's VAT number for qualified validation */
  requesterVatNumber?: string;
}

/** VAT number validation response */
export interface VatifyValidationResponse {
  /** Whether the VAT number is valid */
  valid: boolean;
  /** Two-letter country code */
  countryCode: string;
  /** VAT number without country prefix */
  vatNumber: string;
  /** Registered company name */
  companyName?: string;
  /** Registered address */
  address?: VatifyAddress;
  /** Validation timestamp (ISO 8601) */
  validatedAt: string;
  /** Unique validation ID for audit trail */
  validationId: string;
  /** Format validity (structurally correct) */
  formatValid: boolean;
  /** VIES lookup result (if available) */
  viesValid?: boolean;
  /** Additional details from national databases */
  details?: VatifyValidationDetails;
}

/** Structured address from VAT validation */
export interface VatifyAddress {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  raw?: string;
}

/** Extended validation details */
export interface VatifyValidationDetails {
  /** Company type / legal form */
  companyType?: string;
  /** Registration date */
  registrationDate?: string;
  /** Whether the company is active */
  isActive?: boolean;
  /** National tax identifier */
  nationalTaxId?: string;
}

/** Bulk validation request */
export interface VatifyBulkValidationRequest {
  /** Array of VAT numbers to validate */
  vatNumbers: string[];
  /** Requester's VAT number for qualified validation */
  requesterVatNumber?: string;
  /** Callback URL for async results (webhook) */
  callbackUrl?: string;
}

/** Bulk validation response */
export interface VatifyBulkValidationResponse {
  /** Batch ID for tracking */
  batchId: string;
  /** Total numbers submitted */
  totalCount: number;
  /** Status of the batch */
  status: VatifyBatchStatus;
  /** Results (populated when status is "completed") */
  results?: VatifyBulkValidationResult[];
  /** Estimated completion time (ISO 8601) */
  estimatedCompletionAt?: string;
}

/** Result for a single VAT number in a bulk validation */
export interface VatifyBulkValidationResult {
  vatNumber: string;
  valid: boolean;
  companyName?: string;
  countryCode?: string;
  error?: string;
}

/** Batch processing status */
export type VatifyBatchStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

/** VAT monitoring subscription */
export interface VatifyMonitoringSubscription {
  id: string;
  /** VAT number to monitor */
  vatNumber: string;
  /** Monitoring interval */
  interval: VatifyMonitoringInterval;
  /** Webhook URL for status change notifications */
  webhookUrl: string;
  /** Whether monitoring is active */
  active: boolean;
  /** Last check result */
  lastCheckResult?: VatifyValidationResponse;
  /** Last check timestamp */
  lastCheckAt?: string;
  /** Next scheduled check */
  nextCheckAt?: string;
  createdAt: string;
}

/** Monitoring check interval */
export type VatifyMonitoringInterval =
  | "daily"
  | "weekly"
  | "monthly";

/** Create monitoring subscription request */
export interface VatifyCreateMonitoringRequest {
  vatNumber: string;
  interval: VatifyMonitoringInterval;
  webhookUrl: string;
}

/** Webhook event types */
export type VatifyWebhookEventType =
  | "validation.completed"
  | "batch.completed"
  | "monitoring.status_changed"
  | "monitoring.check_completed";

/** Webhook payload */
export interface VatifyWebhookPayload {
  eventType: VatifyWebhookEventType;
  eventId: string;
  timestamp: string;
  data: VatifyWebhookData;
}

/** Webhook data (varies by event type) */
export type VatifyWebhookData =
  | VatifyValidationResponse
  | VatifyBulkValidationResponse
  | VatifyMonitoringStatusChange;

/** Monitoring status change notification */
export interface VatifyMonitoringStatusChange {
  subscriptionId: string;
  vatNumber: string;
  previousStatus: boolean;
  currentStatus: boolean;
  checkedAt: string;
  details?: VatifyValidationResponse;
}

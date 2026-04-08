// ==================== Zapier Webhook Types ====================
// No auth required — the webhook URL itself acts as the key.
// Used to send OpenFlow form submissions to Zapier triggers.

/** Zapier webhook payload wrapper for OpenFlow submissions. */
export interface ZapierWebhookPayload {
  /** Source identifier: always "openflow". */
  source: "openflow";
  /** Event type. */
  event: "form_submission" | "form_partial" | "form_abandoned";
  /** OpenFlow flow ID. */
  flowId: string;
  /** Unique submission ID. */
  submissionId: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Flattened form field key-value pairs. */
  data: Record<string, unknown>;
  /** Optional metadata (user agent, IP hash, referrer, etc.). */
  metadata?: ZapierSubmissionMetadata;
}

/** Metadata attached to a webhook payload. */
export interface ZapierSubmissionMetadata {
  userAgent?: string;
  ipHash?: string;
  referrer?: string;
  locale?: string;
  flowVersion?: string;
  completionTimeMs?: number;
}

/** Response from Zapier after receiving a webhook. */
export interface ZapierWebhookResponse {
  /** Zapier always returns a request_id on success. */
  id?: string;
  request_id?: string;
  status: "success" | string;
  attempt?: string;
}

/** Result of sending a webhook, including delivery status. */
export interface ZapierDeliveryResult {
  success: boolean;
  statusCode: number;
  webhookUrl: string;
  response?: ZapierWebhookResponse;
  error?: string;
  deliveredAt: string;
}

/** Configuration for the Zapier connector. */
export interface ZapierClientConfig {
  /** The full Zapier webhook URL. */
  webhookUrl: string;
  /** Request timeout in ms. */
  timeout?: number;
}

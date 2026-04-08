// ==================== SendGrid Types ====================

/** Email address with optional name */
export interface SendGridEmailAddress {
  email: string;
  name?: string;
}

/** Personalization block for a single recipient group */
export interface SendGridPersonalization {
  to: SendGridEmailAddress[];
  cc?: SendGridEmailAddress[];
  bcc?: SendGridEmailAddress[];
  subject?: string;
  headers?: Record<string, string>;
  substitutions?: Record<string, string>;
  dynamic_template_data?: Record<string, unknown>;
  custom_args?: Record<string, string>;
  send_at?: number;
}

/** Attachment on an outgoing email */
export interface SendGridAttachment {
  content: string; // base64-encoded
  type?: string; // MIME type
  filename: string;
  disposition?: "attachment" | "inline";
  content_id?: string;
}

/** Content block (text/plain or text/html) */
export interface SendGridContent {
  type: "text/plain" | "text/html";
  value: string;
}

/** ASM (Advanced Suppression Manager) settings */
export interface SendGridASM {
  group_id: number;
  groups_to_display?: number[];
}

/** Mail settings overrides */
export interface SendGridMailSettings {
  bypass_list_management?: { enable: boolean };
  bypass_spam_management?: { enable: boolean };
  bypass_bounce_management?: { enable: boolean };
  bypass_unsubscribe_management?: { enable: boolean };
  footer?: { enable: boolean; text?: string; html?: string };
  sandbox_mode?: { enable: boolean };
}

/** Tracking settings */
export interface SendGridTrackingSettings {
  click_tracking?: { enable: boolean; enable_text?: boolean };
  open_tracking?: { enable: boolean; substitution_tag?: string };
  subscription_tracking?: {
    enable: boolean;
    text?: string;
    html?: string;
    substitution_tag?: string;
  };
  ganalytics?: {
    enable: boolean;
    utm_source?: string;
    utm_medium?: string;
    utm_term?: string;
    utm_content?: string;
    utm_campaign?: string;
  };
}

// ==================== Send Email ====================

export interface SendGridSendEmailRequest {
  personalizations: SendGridPersonalization[];
  from: SendGridEmailAddress;
  reply_to?: SendGridEmailAddress;
  reply_to_list?: SendGridEmailAddress[];
  subject?: string;
  content?: SendGridContent[];
  attachments?: SendGridAttachment[];
  template_id?: string;
  headers?: Record<string, string>;
  categories?: string[];
  custom_args?: Record<string, string>;
  send_at?: number;
  batch_id?: string;
  asm?: SendGridASM;
  ip_pool_name?: string;
  mail_settings?: SendGridMailSettings;
  tracking_settings?: SendGridTrackingSettings;
}

// ==================== Templates ====================

export interface SendGridTemplate {
  id: string;
  name: string;
  generation: "legacy" | "dynamic";
  updated_at: string;
  versions?: SendGridTemplateVersion[];
}

export interface SendGridTemplateVersion {
  id: string;
  template_id: string;
  active: 0 | 1;
  name: string;
  html_content?: string;
  plain_content?: string;
  subject: string;
  editor: "code" | "design";
  generate_plain_content?: boolean;
  updated_at: string;
  thumbnail_url?: string;
}

export interface SendGridListTemplatesResponse {
  result: SendGridTemplate[];
  _metadata?: {
    self: string;
    count: number;
  };
}

export interface SendGridCreateTemplateRequest {
  name: string;
  generation?: "legacy" | "dynamic";
}

export interface SendGridCreateTemplateVersionRequest {
  template_id: string;
  active: 0 | 1;
  name: string;
  html_content?: string;
  plain_content?: string;
  subject: string;
  editor?: "code" | "design";
  generate_plain_content?: boolean;
  test_data?: string;
}

// ==================== Contacts ====================

export interface SendGridContact {
  id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  address_line_1?: string;
  address_line_2?: string;
  alternate_emails?: string[];
  city?: string;
  country?: string;
  postal_code?: string;
  state_province_region?: string;
  phone_number?: string;
  custom_fields?: Record<string, string | number>;
}

export interface SendGridUpsertContactsRequest {
  list_ids?: string[];
  contacts: SendGridContact[];
}

export interface SendGridUpsertContactsResponse {
  job_id: string;
}

export interface SendGridSearchContactsRequest {
  query: string;
}

export interface SendGridSearchContactsResponse {
  result: SendGridContact[];
  contact_count: number;
  _metadata?: {
    self: string;
  };
}

export interface SendGridDeleteContactsResponse {
  job_id: string;
}

export interface SendGridContactList {
  id: string;
  name: string;
  contact_count: number;
  _metadata?: {
    self: string;
  };
}

export interface SendGridListContactListsResponse {
  result: SendGridContactList[];
  _metadata?: {
    self: string;
    count: number;
  };
}

// ==================== Stats ====================

export interface SendGridGlobalStats {
  date: string;
  stats: Array<{
    metrics: SendGridStatsMetrics;
  }>;
}

export interface SendGridStatsMetrics {
  blocks: number;
  bounce_drops: number;
  bounces: number;
  clicks: number;
  deferred: number;
  delivered: number;
  invalid_emails: number;
  opens: number;
  processed: number;
  requests: number;
  spam_report_drops: number;
  spam_reports: number;
  unique_clicks: number;
  unique_opens: number;
  unsubscribe_drops: number;
  unsubscribes: number;
}

export interface SendGridStatsParams {
  start_date: string; // YYYY-MM-DD
  end_date?: string;
  aggregated_by?: "day" | "week" | "month";
}

export interface SendGridCategoryStatsParams extends SendGridStatsParams {
  categories: string;
}

// ==================== Webhook Events ====================

export type SendGridWebhookEventType =
  | "processed"
  | "dropped"
  | "delivered"
  | "deferred"
  | "bounce"
  | "open"
  | "click"
  | "spamreport"
  | "unsubscribe"
  | "group_unsubscribe"
  | "group_resubscribe";

export interface SendGridWebhookEvent {
  email: string;
  timestamp: number;
  event: SendGridWebhookEventType;
  sg_event_id: string;
  sg_message_id: string;
  category?: string[];
  asm_group_id?: number;
  url?: string; // for click events
  ip?: string;
  useragent?: string;
  reason?: string; // for bounce/dropped
  status?: string;
  response?: string;
  attempt?: string;
  type?: string; // bounce type
  bounce_classification?: string;
}

export interface SendGridWebhookPayload {
  events: SendGridWebhookEvent[];
}

// ==================== Client Config ====================

export interface SendGridClientConfig {
  apiKey: string;
  /** Webhook signing secret for event verification */
  webhookVerificationKey?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

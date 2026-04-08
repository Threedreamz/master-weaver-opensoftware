// ==================== Resend Types ====================

// ==================== Send Email ====================

export interface ResendEmailAddress {
  email: string;
  name?: string;
}

export interface ResendAttachment {
  /** Filename of the attachment */
  filename: string;
  /** Base64-encoded content */
  content?: string;
  /** URL to fetch attachment from */
  path?: string;
  /** Content type (MIME) */
  content_type?: string;
}

export interface ResendTag {
  name: string;
  value: string;
}

export interface ResendSendEmailRequest {
  from: string;
  to: string | string[];
  subject: string;
  bcc?: string | string[];
  cc?: string | string[];
  reply_to?: string | string[];
  html?: string;
  text?: string;
  /** React component (server-side only, not sent over API) */
  headers?: Record<string, string>;
  attachments?: ResendAttachment[];
  tags?: ResendTag[];
  /** Scheduled send time (ISO 8601) */
  scheduled_at?: string;
}

export interface ResendSendEmailResponse {
  id: string;
}

export interface ResendBatchSendRequest {
  emails: ResendSendEmailRequest[];
}

export interface ResendBatchSendResponse {
  data: Array<{ id: string }>;
}

// ==================== Email Operations ====================

export interface ResendEmail {
  id: string;
  object: "email";
  to: string[];
  from: string;
  created_at: string;
  subject: string;
  html?: string;
  text?: string;
  bcc?: string[];
  cc?: string[];
  reply_to?: string[];
  last_event: string;
}

// ==================== Domains ====================

export interface ResendDomain {
  id: string;
  name: string;
  status: "not_started" | "pending" | "verified" | "failed" | "temporary_failure";
  created_at: string;
  region: "us-east-1" | "eu-west-1" | "sa-east-1";
  records: ResendDNSRecord[];
}

export interface ResendDNSRecord {
  record: "MX" | "TXT" | "CNAME";
  name: string;
  type: string;
  ttl: string;
  status: "not_started" | "pending" | "verified" | "failed" | "temporary_failure";
  value: string;
  priority?: number;
}

export interface ResendCreateDomainRequest {
  name: string;
  region?: "us-east-1" | "eu-west-1" | "sa-east-1";
}

export interface ResendCreateDomainResponse {
  id: string;
  name: string;
  created_at: string;
  status: string;
  records: ResendDNSRecord[];
  region: string;
}

export interface ResendListDomainsResponse {
  data: ResendDomain[];
}

export interface ResendVerifyDomainResponse {
  object: "domain";
  id: string;
}

// ==================== API Keys ====================

export interface ResendApiKey {
  id: string;
  name: string;
  created_at: string;
}

export interface ResendCreateApiKeyRequest {
  name: string;
  /** Restrict to a specific domain */
  domain_id?: string;
  permission?: "full_access" | "sending_access";
}

export interface ResendCreateApiKeyResponse {
  id: string;
  token: string;
}

export interface ResendListApiKeysResponse {
  data: ResendApiKey[];
}

// ==================== Audiences ====================

export interface ResendAudience {
  id: string;
  name: string;
  created_at: string;
}

export interface ResendCreateAudienceRequest {
  name: string;
}

export interface ResendListAudiencesResponse {
  data: ResendAudience[];
}

// ==================== Contacts ====================

export interface ResendContact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  unsubscribed: boolean;
}

export interface ResendCreateContactRequest {
  email: string;
  first_name?: string;
  last_name?: string;
  unsubscribed?: boolean;
  audience_id: string;
}

export interface ResendCreateContactResponse {
  id: string;
  object: "contact";
}

export interface ResendListContactsResponse {
  data: ResendContact[];
}

// ==================== Webhook Events ====================

export type ResendWebhookEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.complained"
  | "email.bounced"
  | "email.opened"
  | "email.clicked";

export interface ResendWebhookEvent {
  type: ResendWebhookEventType;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    /** For click events */
    click?: { link: string; timestamp: string; userAgent: string; ipAddress: string };
    /** For bounce events */
    bounce?: { message: string };
  };
}

// ==================== Client Config ====================

export interface ResendClientConfig {
  apiKey: string;
  /** Webhook signing secret */
  webhookSecret?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

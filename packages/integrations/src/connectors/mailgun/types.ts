// ==================== Mailgun Types ====================

// ==================== Send Messages ====================

export interface MailgunSendMessageRequest {
  from: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  /** Template name to use */
  template?: string;
  /** Template variables as JSON string */
  "h:X-Mailgun-Variables"?: string;
  /** Template version tag */
  "t:version"?: string;
  /** Enable/disable template text */
  "t:text"?: "yes" | "no";
  /** Custom MIME headers (prefix with h:) */
  [header: `h:${string}`]: string | undefined;
  /** Custom variables (prefix with v:) */
  [variable: `v:${string}`]: string | undefined;
  /** Tags for tracking (max 3) */
  "o:tag"?: string | string[];
  /** Enable/disable DKIM */
  "o:dkim"?: "yes" | "no";
  /** Delivery time (RFC 2822) */
  "o:deliverytime"?: string;
  /** Enable test mode */
  "o:testmode"?: "yes";
  /** Enable tracking */
  "o:tracking"?: "yes" | "no";
  /** Enable click tracking */
  "o:tracking-clicks"?: "yes" | "no" | "htmlonly";
  /** Enable open tracking */
  "o:tracking-opens"?: "yes" | "no";
  /** Require TLS */
  "o:require-tls"?: "true" | "false";
  /** Skip certificate verification */
  "o:skip-verification"?: "true" | "false";
}

export interface MailgunSendMessageResponse {
  id: string;
  message: string;
}

// ==================== Templates ====================

export interface MailgunTemplate {
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
  id: string;
  version?: MailgunTemplateVersion;
}

export interface MailgunTemplateVersion {
  tag: string;
  template: string;
  engine: "handlebars" | "go";
  createdAt: string;
  comment: string;
  active: boolean;
  id: string;
}

export interface MailgunListTemplatesResponse {
  items: MailgunTemplate[];
  paging: MailgunPaging;
}

export interface MailgunCreateTemplateRequest {
  name: string;
  description?: string;
  template: string;
  tag?: string;
  engine?: "handlebars" | "go";
  comment?: string;
}

export interface MailgunCreateTemplateVersionRequest {
  template: string;
  tag: string;
  engine?: "handlebars" | "go";
  comment?: string;
  active?: "yes" | "no";
}

// ==================== Events ====================

export type MailgunEventType =
  | "accepted"
  | "delivered"
  | "failed"
  | "opened"
  | "clicked"
  | "unsubscribed"
  | "complained"
  | "stored"
  | "list_member_uploaded"
  | "list_member_upload_error"
  | "list_uploaded";

export interface MailgunEvent {
  id: string;
  event: MailgunEventType;
  timestamp: number;
  recipient: string;
  "log-level": "info" | "warn" | "error";
  message: {
    headers: {
      to: string;
      "message-id": string;
      from: string;
      subject: string;
    };
    size: number;
  };
  flags?: {
    "is-routed"?: boolean;
    "is-authenticated"?: boolean;
    "is-system-test"?: boolean;
    "is-test-mode"?: boolean;
  };
  tags?: string[];
  campaigns?: Array<{ id: string; name: string }>;
  "user-variables"?: Record<string, string>;
  envelope?: {
    transport: string;
    sender: string;
    "sending-ip": string;
    targets: string;
  };
  "delivery-status"?: {
    code: number;
    message: string;
    description: string;
    "attempt-no": number;
    "session-seconds": number;
  };
  severity?: "permanent" | "temporary";
  reason?: string;
  geolocation?: {
    country: string;
    region: string;
    city: string;
  };
  ip?: string;
  "client-info"?: {
    "client-os": string;
    "device-type": string;
    "client-name": string;
    "client-type": string;
    "user-agent": string;
  };
  url?: string;
}

export interface MailgunEventsResponse {
  items: MailgunEvent[];
  paging: MailgunPaging;
}

export interface MailgunEventsParams {
  event?: MailgunEventType;
  begin?: string;
  end?: string;
  ascending?: "yes" | "no";
  limit?: number;
  recipient?: string;
  tags?: string;
  severity?: "permanent" | "temporary";
}

// ==================== Bounces ====================

export interface MailgunBounce {
  address: string;
  code: string;
  error: string;
  created_at: string;
}

export interface MailgunBouncesResponse {
  items: MailgunBounce[];
  paging: MailgunPaging;
}

export interface MailgunCreateBounceRequest {
  address: string;
  code?: string;
  error?: string;
}

// ==================== Common ====================

export interface MailgunPaging {
  first: string;
  last: string;
  next?: string;
  previous?: string;
}

// ==================== Webhook Events ====================

export type MailgunWebhookEventType =
  | "clicked"
  | "complained"
  | "delivered"
  | "opened"
  | "permanent_fail"
  | "temporary_fail"
  | "unsubscribed";

export interface MailgunWebhookPayload {
  signature: {
    timestamp: string;
    token: string;
    signature: string;
  };
  "event-data": MailgunEvent;
}

// ==================== Client Config ====================

export interface MailgunClientConfig {
  apiKey: string;
  domain: string;
  /** Use EU region (api.eu.mailgun.net). Default: true */
  euRegion?: boolean;
  /** Webhook signing key for event verification */
  webhookSigningKey?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

// ==================== Brevo (Sendinblue) Types ====================

// ==================== Send Transactional Email ====================

export interface BrevoEmailAddress {
  email: string;
  name?: string;
}

export interface BrevoAttachment {
  /** URL to download the attachment from */
  url?: string;
  /** Base64-encoded content */
  content?: string;
  /** Filename */
  name: string;
}

export interface BrevoSendEmailRequest {
  sender: BrevoEmailAddress;
  to: BrevoEmailAddress[];
  cc?: BrevoEmailAddress[];
  bcc?: BrevoEmailAddress[];
  htmlContent?: string;
  textContent?: string;
  subject?: string;
  replyTo?: BrevoEmailAddress;
  attachment?: BrevoAttachment[];
  headers?: Record<string, string>;
  /** Template ID (if using a template) */
  templateId?: number;
  /** Template parameters */
  params?: Record<string, unknown>;
  tags?: string[];
  /** Schedule send time (ISO 8601) */
  scheduledAt?: string;
  /** Batch ID for grouping */
  batchId?: string;
}

export interface BrevoSendEmailResponse {
  messageId: string;
  messageIds?: string[];
}

// ==================== Contacts ====================

export interface BrevoContact {
  id: number;
  email: string;
  emailBlacklisted: boolean;
  smsBlacklisted: boolean;
  createdAt: string;
  modifiedAt: string;
  listIds: number[];
  listUnsubscribed?: number[];
  attributes: Record<string, unknown>;
  statistics?: {
    messagesSent?: Array<{ campaignId: number; eventTime: string }>;
    hardBounces?: Array<{ campaignId: number; eventTime: string }>;
    softBounces?: Array<{ campaignId: number; eventTime: string }>;
    complaints?: Array<{ campaignId: number; eventTime: string }>;
    unsubscriptions?: { userUnsubscription: Array<{ campaignId: number; eventTime: string }>; adminUnsubscription: Array<{ campaignId: number; eventTime: string }> };
    opened?: Array<{ campaignId: number; count: number; eventTime: string; ip: string }>;
    clicked?: Array<{ campaignId: number; links: Array<{ count: number; eventTime: string; ip: string; url: string }> }>;
  };
}

export interface BrevoCreateContactRequest {
  email: string;
  attributes?: Record<string, unknown>;
  emailBlacklisted?: boolean;
  smsBlacklisted?: boolean;
  listIds?: number[];
  updateEnabled?: boolean;
  smtpBlacklistSender?: string[];
}

export interface BrevoCreateContactResponse {
  id: number;
}

export interface BrevoUpdateContactRequest {
  attributes?: Record<string, unknown>;
  emailBlacklisted?: boolean;
  smsBlacklisted?: boolean;
  listIds?: number[];
  unlinkListIds?: number[];
  smtpBlacklistSender?: string[];
}

export interface BrevoListContactsResponse {
  contacts: BrevoContact[];
  count: number;
}

export interface BrevoListContactsParams {
  limit?: number;
  offset?: number;
  modifiedSince?: string;
  sort?: "asc" | "desc";
}

// ==================== Contact Lists ====================

export interface BrevoContactList {
  id: number;
  name: string;
  totalBlacklisted: number;
  totalSubscribers: number;
  uniqueSubscribers: number;
  folderId: number;
  createdAt: string;
  campaignStats?: Array<{
    campaignId: number;
    stats: Record<string, number>;
  }>;
  dynamicList?: boolean;
}

export interface BrevoListContactListsResponse {
  lists: BrevoContactList[];
  count: number;
}

export interface BrevoCreateContactListRequest {
  name: string;
  folderId: number;
}

export interface BrevoCreateContactListResponse {
  id: number;
}

// ==================== Campaigns ====================

export interface BrevoCampaign {
  id: number;
  name: string;
  subject: string;
  type: "classic" | "trigger";
  status: "draft" | "sent" | "archive" | "queued" | "suspended" | "in_process";
  scheduledAt?: string;
  testSent: boolean;
  header: string;
  footer: string;
  sender: BrevoEmailAddress;
  replyTo: string;
  toField: string;
  htmlContent: string;
  shareLink?: string;
  tag: string;
  createdAt: string;
  modifiedAt: string;
  inlineImageActivation?: boolean;
  mirrorActive?: boolean;
  recurring?: boolean;
  sentDate?: string;
  recipients: {
    lists: number[];
    exclusionLists: number[];
  };
  statistics?: {
    globalStats: BrevoCampaignStats;
    campaignStats: BrevoCampaignStats[];
    mirrorClick?: number;
    remaining?: number;
    linksStats?: Record<string, BrevoCampaignStats>;
    statsByDomain?: Record<string, BrevoCampaignStats>;
  };
}

export interface BrevoCampaignStats {
  listId?: number;
  uniqueClicks: number;
  clickers: number;
  complaints: number;
  delivered: number;
  sent: number;
  softBounces: number;
  hardBounces: number;
  uniqueViews: number;
  trackableViews: number;
  unsubscriptions: number;
  viewed: number;
  deferred?: number;
}

export interface BrevoListCampaignsResponse {
  campaigns: BrevoCampaign[];
  count: number;
}

export interface BrevoListCampaignsParams {
  type?: "classic" | "trigger";
  status?: "draft" | "sent" | "archive" | "queued" | "suspended" | "in_process";
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sort?: "asc" | "desc";
}

export interface BrevoCreateCampaignRequest {
  name: string;
  subject: string;
  sender: BrevoEmailAddress;
  htmlContent?: string;
  htmlUrl?: string;
  scheduledAt?: string;
  replyTo?: string;
  toField?: string;
  recipients: {
    listIds: number[];
    exclusionListIds?: number[];
  };
  inlineImageActivation?: boolean;
  mirrorActive?: boolean;
  tag?: string;
  header?: string;
  footer?: string;
  params?: Record<string, unknown>;
}

export interface BrevoCreateCampaignResponse {
  id: number;
}

// ==================== Templates ====================

export interface BrevoTemplate {
  id: number;
  name: string;
  subject: string;
  isActive: boolean;
  testSent: boolean;
  sender: BrevoEmailAddress;
  replyTo: string;
  toField: string;
  tag: string;
  htmlContent: string;
  createdAt: string;
  modifiedAt: string;
  doiTemplate?: boolean;
}

export interface BrevoListTemplatesResponse {
  count: number;
  templates: BrevoTemplate[];
}

export interface BrevoListTemplatesParams {
  templateStatus?: boolean;
  limit?: number;
  offset?: number;
  sort?: "asc" | "desc";
}

export interface BrevoCreateTemplateRequest {
  tag?: string;
  sender: BrevoEmailAddress;
  templateName: string;
  htmlContent?: string;
  htmlUrl?: string;
  subject: string;
  replyTo?: string;
  toField?: string;
  isActive?: boolean;
  attachmentUrl?: string;
  params?: Record<string, unknown>;
}

export interface BrevoCreateTemplateResponse {
  id: number;
}

export interface BrevoUpdateTemplateRequest {
  tag?: string;
  sender?: BrevoEmailAddress;
  templateName?: string;
  htmlContent?: string;
  htmlUrl?: string;
  subject?: string;
  replyTo?: string;
  toField?: string;
  isActive?: boolean;
  attachmentUrl?: string;
  params?: Record<string, unknown>;
}

// ==================== Webhook Events ====================

export type BrevoWebhookEventType =
  | "sent"
  | "delivered"
  | "request"
  | "soft_bounce"
  | "hard_bounce"
  | "invalid_email"
  | "deferred"
  | "click"
  | "opened"
  | "unique_opened"
  | "complaint"
  | "unsubscribed"
  | "blocked"
  | "error"
  | "list_addition";

export interface BrevoWebhookEvent {
  event: BrevoWebhookEventType;
  email: string;
  id: number;
  date: string;
  ts: number;
  "message-id": string;
  ts_event: number;
  subject: string;
  tag: string;
  sending_ip: string;
  ts_epoch: number;
  /** Click-specific fields */
  link?: string;
  /** Bounce-specific fields */
  reason?: string;
  /** Template ID */
  template_id?: number;
}

// ==================== Client Config ====================

export interface BrevoClientConfig {
  apiKey: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

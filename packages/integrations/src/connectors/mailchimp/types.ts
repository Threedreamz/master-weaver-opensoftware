// ==================== Mailchimp API Types ====================

/** Mailchimp list/audience */
export interface MailchimpList {
  id: string;
  web_id: number;
  name: string;
  contact: {
    company: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
  };
  permission_reminder: string;
  campaign_defaults: {
    from_name: string;
    from_email: string;
    subject: string;
    language: string;
  };
  stats: {
    member_count: number;
    unsubscribe_count: number;
    cleaned_count: number;
    member_count_since_send: number;
    unsubscribe_count_since_send: number;
    cleaned_count_since_send: number;
    campaign_count: number;
    campaign_last_sent: string;
    merge_field_count: number;
    avg_sub_rate: number;
    avg_unsub_rate: number;
    target_sub_rate: number;
    open_rate: number;
    click_rate: number;
    last_sub_date: string;
    last_unsub_date: string;
  };
  list_rating: number;
  date_created: string;
}

export interface MailchimpListsResponse {
  lists: MailchimpList[];
  total_items: number;
}

/** Mailchimp member (subscriber) */
export interface MailchimpMember {
  id: string;
  email_address: string;
  unique_email_id: string;
  email_type: string;
  status: MailchimpMemberStatus;
  merge_fields: Record<string, string>;
  interests: Record<string, boolean>;
  stats: {
    avg_open_rate: number;
    avg_click_rate: number;
  };
  ip_signup: string;
  timestamp_signup: string;
  ip_opt: string;
  timestamp_opt: string;
  member_rating: number;
  last_changed: string;
  language: string;
  vip: boolean;
  list_id: string;
  tags: Array<{ id: number; name: string }>;
}

export type MailchimpMemberStatus =
  | "subscribed"
  | "unsubscribed"
  | "cleaned"
  | "pending"
  | "transactional"
  | "archived";

export interface MailchimpMembersResponse {
  members: MailchimpMember[];
  list_id: string;
  total_items: number;
}

export interface MailchimpCreateMemberInput {
  email_address: string;
  status: MailchimpMemberStatus;
  email_type?: "html" | "text";
  merge_fields?: Record<string, string>;
  interests?: Record<string, boolean>;
  language?: string;
  vip?: boolean;
  tags?: string[];
}

export interface MailchimpUpdateMemberInput {
  email_address?: string;
  status?: MailchimpMemberStatus;
  merge_fields?: Record<string, string>;
  interests?: Record<string, boolean>;
  language?: string;
  vip?: boolean;
}

/** Mailchimp campaign */
export interface MailchimpCampaign {
  id: string;
  web_id: number;
  type: MailchimpCampaignType;
  create_time: string;
  archive_url: string;
  long_archive_url: string;
  status: MailchimpCampaignStatus;
  emails_sent: number;
  send_time: string;
  content_type: string;
  recipients: {
    list_id: string;
    list_is_active: boolean;
    list_name: string;
    recipient_count: number;
  };
  settings: {
    subject_line: string;
    preview_text: string;
    title: string;
    from_name: string;
    reply_to: string;
  };
  tracking: {
    opens: boolean;
    html_clicks: boolean;
    text_clicks: boolean;
  };
  report_summary?: {
    opens: number;
    unique_opens: number;
    open_rate: number;
    clicks: number;
    subscriber_clicks: number;
    click_rate: number;
  };
}

export type MailchimpCampaignType = "regular" | "plaintext" | "absplit" | "rss" | "variate";
export type MailchimpCampaignStatus =
  | "save"
  | "paused"
  | "schedule"
  | "sending"
  | "sent"
  | "canceled"
  | "canceling"
  | "archived";

export interface MailchimpCampaignsResponse {
  campaigns: MailchimpCampaign[];
  total_items: number;
}

export interface MailchimpCreateCampaignInput {
  type: MailchimpCampaignType;
  recipients: {
    list_id: string;
    segment_opts?: {
      saved_segment_id?: number;
      match?: "any" | "all";
      conditions?: Array<Record<string, unknown>>;
    };
  };
  settings: {
    subject_line: string;
    preview_text?: string;
    title?: string;
    from_name: string;
    reply_to: string;
  };
  tracking?: {
    opens?: boolean;
    html_clicks?: boolean;
    text_clicks?: boolean;
  };
}

export interface MailchimpUpdateCampaignInput {
  recipients?: MailchimpCreateCampaignInput["recipients"];
  settings?: Partial<MailchimpCreateCampaignInput["settings"]>;
  tracking?: MailchimpCreateCampaignInput["tracking"];
}

/** Mailchimp template */
export interface MailchimpTemplate {
  id: number;
  type: string;
  name: string;
  drag_and_drop: boolean;
  responsive: boolean;
  category: string;
  date_created: string;
  date_edited: string;
  created_by: string;
  edited_by: string;
  active: boolean;
  folder_id: string;
  thumbnail: string;
}

export interface MailchimpTemplatesResponse {
  templates: MailchimpTemplate[];
  total_items: number;
}

export interface MailchimpCreateTemplateInput {
  name: string;
  html: string;
  folder_id?: string;
}

/** Mailchimp campaign report */
export interface MailchimpCampaignReport {
  id: string;
  campaign_title: string;
  type: string;
  list_id: string;
  list_is_active: boolean;
  list_name: string;
  subject_line: string;
  preview_text: string;
  emails_sent: number;
  abuse_reports: number;
  unsubscribed: number;
  send_time: string;
  bounces: {
    hard_bounces: number;
    soft_bounces: number;
    syntax_errors: number;
  };
  forwards: {
    forwards_count: number;
    forwards_opens: number;
  };
  opens: {
    opens_total: number;
    unique_opens: number;
    open_rate: number;
    last_open: string;
  };
  clicks: {
    clicks_total: number;
    unique_clicks: number;
    unique_subscriber_clicks: number;
    click_rate: number;
    last_click: string;
  };
  industry_stats: {
    type: string;
    open_rate: number;
    click_rate: number;
    bounce_rate: number;
    unopen_rate: number;
    unsub_rate: number;
    abuse_rate: number;
  };
}

export interface MailchimpReportsResponse {
  reports: MailchimpCampaignReport[];
  total_items: number;
}

/** Mailchimp campaign content */
export interface MailchimpCampaignContent {
  variate_contents: unknown[];
  plain_text: string;
  html: string;
  archive_html: string;
}

export interface MailchimpSetCampaignContentInput {
  plain_text?: string;
  html?: string;
  template?: {
    id: number;
    sections?: Record<string, string>;
  };
}

/** Mailchimp webhook */
export interface MailchimpWebhookEvent {
  type: MailchimpWebhookEventType;
  fired_at: string;
  data: {
    id?: string;
    email?: string;
    email_type?: string;
    ip_opt?: string;
    list_id?: string;
    merges?: Record<string, string>;
    reason?: string;
    action?: string;
    [key: string]: unknown;
  };
}

export type MailchimpWebhookEventType =
  | "subscribe"
  | "unsubscribe"
  | "profile"
  | "upemail"
  | "cleaned"
  | "campaign";

/** Mailchimp pagination params */
export interface MailchimpPaginationParams {
  offset?: number;
  count?: number;
  sort_field?: string;
  sort_dir?: "ASC" | "DESC";
}

/** Client configuration */
export interface MailchimpClientConfig {
  apiKey: string;
  serverPrefix?: string;
  timeout?: number;
}

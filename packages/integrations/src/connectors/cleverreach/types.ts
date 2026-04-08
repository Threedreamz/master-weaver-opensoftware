// ==================== CleverReach API Types ====================

/** CleverReach group (equivalent to a list/audience) */
export interface CleverReachGroup {
  id: number;
  name: string;
  stamp: number;
  last_mailing: number;
  last_changed: number;
  receiver_count: number;
  inactive_count: number;
  total_count: number;
}

/** CleverReach receiver (subscriber) */
export interface CleverReachReceiver {
  id: number;
  email: string;
  registered: number;
  activated: number;
  deactivated: number;
  source: string;
  global_attributes: Record<string, string>;
  attributes: Record<string, string>;
  tags: string[];
  orders: CleverReachReceiverOrder[];
  active: boolean;
}

export interface CleverReachReceiverOrder {
  order_id: string;
  product_id: string;
  product: string;
  quantity: number;
  price: number;
  currency: string;
  stamp: number;
}

export interface CleverReachCreateReceiverInput {
  email: string;
  registered?: number;
  activated?: number;
  source?: string;
  global_attributes?: Record<string, string>;
  attributes?: Record<string, string>;
  tags?: string[];
  orders?: CleverReachReceiverOrder[];
}

export interface CleverReachUpdateReceiverInput {
  email?: string;
  global_attributes?: Record<string, string>;
  attributes?: Record<string, string>;
  tags?: string[];
  active?: boolean;
}

export interface CleverReachBulkReceiverInput {
  receivers: CleverReachCreateReceiverInput[];
}

/** CleverReach mailing */
export interface CleverReachMailing {
  id: number;
  name: string;
  subject: string;
  sender_name: string;
  sender_email: string;
  body_html: string;
  body_text: string;
  receivers: {
    groups: number[];
    filter?: string;
  };
  settings: {
    editor: string;
    open_tracking: boolean;
    click_tracking: boolean;
    link_tracking_url: string;
    link_tracking_profile: number;
    unsubscribe_form_id: number;
    campaign_id: number;
    category: string;
  };
  stamp: number;
  created: number;
  finished: number;
  channel_id: number;
  state: CleverReachMailingState;
}

export type CleverReachMailingState =
  | "draft"
  | "queued"
  | "sending"
  | "done"
  | "canceled";

export interface CleverReachCreateMailingInput {
  name: string;
  subject: string;
  sender_name: string;
  sender_email: string;
  receivers: {
    groups: number[];
  };
  content: {
    type: "html" | "html/text";
    html: string;
    text?: string;
  };
  settings?: {
    open_tracking?: boolean;
    click_tracking?: boolean;
    category?: string;
  };
}

export interface CleverReachUpdateMailingInput {
  name?: string;
  subject?: string;
  sender_name?: string;
  sender_email?: string;
  receivers?: {
    groups: number[];
  };
  content?: {
    type: "html" | "html/text";
    html: string;
    text?: string;
  };
  settings?: {
    open_tracking?: boolean;
    click_tracking?: boolean;
  };
}

/** CleverReach report/statistics */
export interface CleverReachMailingReport {
  id: number;
  name: string;
  subject: string;
  sent: number;
  delivered: number;
  opened: number;
  unique_opened: number;
  clicked: number;
  unique_clicked: number;
  bounced: number;
  hard_bounced: number;
  soft_bounced: number;
  unsubscribed: number;
  spam_complaints: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  unsubscribe_rate: number;
}

export interface CleverReachGlobalReport {
  total_mailings: number;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_unsubscribed: number;
  avg_open_rate: number;
  avg_click_rate: number;
}

/** CleverReach webhook */
export interface CleverReachWebhookRegistration {
  url: string;
  event: CleverReachWebhookEventType;
  /** Group ID for group-specific events, 0 for account-wide. */
  group_id?: number;
}

export interface CleverReachWebhookResponse {
  id: number;
  url: string;
  event: string;
  group_id: number;
  state: string;
}

export interface CleverReachWebhookPayload {
  event: CleverReachWebhookEventType;
  group_id?: number;
  payload: {
    id?: number;
    email?: string;
    pool_id?: number;
    [key: string]: unknown;
  };
}

export type CleverReachWebhookEventType =
  | "receiver.subscribed"
  | "receiver.unsubscribed"
  | "receiver.activated"
  | "receiver.deactivated"
  | "mailing.sent"
  | "mailing.finished"
  | "form.submitted";

/** CleverReach pagination */
export interface CleverReachPaginationParams {
  page?: number;
  pagesize?: number;
}

/** Client configuration */
export interface CleverReachClientConfig {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  timeout?: number;
}

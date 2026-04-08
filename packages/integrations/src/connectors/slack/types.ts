// ==================== Slack Web API Types ====================

// ==================== Common ====================

export interface SlackApiResponse {
  ok: boolean;
  error?: string;
  response_metadata?: {
    next_cursor?: string;
    scopes?: string[];
    acceptedScopes?: string[];
  };
}

// ==================== Messages ====================

export interface SlackMessage {
  type: string;
  subtype?: string;
  channel?: string;
  user?: string;
  text: string;
  ts: string;
  thread_ts?: string;
  reply_count?: number;
  reply_users_count?: number;
  latest_reply?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  bot_id?: string;
  edited?: { user: string; ts: string };
}

export interface SlackBlock {
  type: string;
  block_id?: string;
  elements?: unknown[];
  text?: { type: string; text: string };
  [key: string]: unknown;
}

export interface SlackAttachment {
  fallback?: string;
  color?: string;
  pretext?: string;
  author_name?: string;
  title?: string;
  text?: string;
  fields?: Array<{ title: string; value: string; short: boolean }>;
  ts?: string;
  [key: string]: unknown;
}

export interface SlackPostMessageParams {
  channel: string;
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  thread_ts?: string;
  reply_broadcast?: boolean;
  unfurl_links?: boolean;
  unfurl_media?: boolean;
  mrkdwn?: boolean;
  metadata?: { event_type: string; event_payload: Record<string, unknown> };
}

export interface SlackPostMessageResponse extends SlackApiResponse {
  channel: string;
  ts: string;
  message: SlackMessage;
}

export interface SlackUpdateMessageParams {
  channel: string;
  ts: string;
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

export interface SlackUpdateMessageResponse extends SlackApiResponse {
  channel: string;
  ts: string;
  text: string;
}

// ==================== Channels ====================

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  is_archived: boolean;
  is_general: boolean;
  is_member: boolean;
  created: number;
  creator: string;
  topic: { value: string; creator: string; last_set: number };
  purpose: { value: string; creator: string; last_set: number };
  num_members: number;
}

export interface SlackChannelsListParams {
  types?: string;
  exclude_archived?: boolean;
  limit?: number;
  cursor?: string;
  team_id?: string;
}

export interface SlackChannelsListResponse extends SlackApiResponse {
  channels: SlackChannel[];
}

export interface SlackChannelHistoryParams {
  channel: string;
  limit?: number;
  cursor?: string;
  oldest?: string;
  latest?: string;
  inclusive?: boolean;
}

export interface SlackChannelHistoryResponse extends SlackApiResponse {
  messages: SlackMessage[];
  has_more: boolean;
}

// ==================== Users ====================

export interface SlackUser {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  real_name: string;
  tz: string;
  tz_label: string;
  tz_offset: number;
  profile: SlackUserProfile;
  is_admin: boolean;
  is_owner: boolean;
  is_bot: boolean;
  is_app_user: boolean;
  updated: number;
}

export interface SlackUserProfile {
  avatar_hash: string;
  status_text: string;
  status_emoji: string;
  real_name: string;
  display_name: string;
  email?: string;
  image_24: string;
  image_32: string;
  image_48: string;
  image_72: string;
  image_192: string;
  image_512: string;
  title?: string;
  phone?: string;
  skype?: string;
}

export interface SlackUsersListParams {
  limit?: number;
  cursor?: string;
  team_id?: string;
}

export interface SlackUsersListResponse extends SlackApiResponse {
  members: SlackUser[];
}

// ==================== Files ====================

export interface SlackFile {
  id: string;
  name: string;
  title: string;
  mimetype: string;
  filetype: string;
  size: number;
  url_private: string;
  url_private_download: string;
  permalink: string;
  created: number;
  timestamp: number;
  user: string;
  channels: string[];
  groups: string[];
  ims: string[];
}

export interface SlackFilesListParams {
  channel?: string;
  user?: string;
  types?: string;
  count?: number;
  page?: number;
  ts_from?: string;
  ts_to?: string;
}

export interface SlackFilesListResponse extends SlackApiResponse {
  files: SlackFile[];
  paging: {
    count: number;
    total: number;
    page: number;
    pages: number;
  };
}

export interface SlackFileUploadParams {
  channels?: string;
  content?: string;
  filename?: string;
  filetype?: string;
  initial_comment?: string;
  title?: string;
  thread_ts?: string;
}

export interface SlackFileUploadResponse extends SlackApiResponse {
  file: SlackFile;
}

// ==================== Webhook Events ====================

export interface SlackEventPayload {
  token: string;
  team_id: string;
  api_app_id: string;
  type: "event_callback" | "url_verification";
  event_id?: string;
  event_time?: number;
  event?: SlackEvent;
  challenge?: string;
}

export interface SlackEvent {
  type: string;
  user?: string;
  channel?: string;
  text?: string;
  ts?: string;
  event_ts?: string;
  channel_type?: string;
  [key: string]: unknown;
}

export interface SlackInteractionPayload {
  type: "block_actions" | "view_submission" | "view_closed" | "shortcut" | "message_action";
  user: { id: string; username: string; name: string; team_id: string };
  trigger_id: string;
  channel?: { id: string; name: string };
  message?: SlackMessage;
  actions?: Array<{
    action_id: string;
    block_id: string;
    type: string;
    value?: string;
    selected_option?: { text: { type: string; text: string }; value: string };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

// ==================== Client Config ====================

export interface SlackClientConfig {
  /** Slack Bot OAuth Token (xoxb-...) */
  botToken: string;
  /** Slack Signing Secret (for webhook verification) */
  signingSecret?: string;
  /** Request timeout in ms */
  timeout?: number;
}

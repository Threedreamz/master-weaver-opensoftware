// ==================== Toggl Track API Types ====================
// Time tracking — time entries, projects, clients, workspaces, reports
// API key authentication (basic auth with token:api_token) + webhooks

/** Toggl Track client configuration */
export interface TogglTrackClientConfig {
  /** Toggl API token (used as basic auth username with "api_token" as password) */
  apiToken: string;
  /** Default workspace ID */
  workspaceId?: number;
  /** Webhook signing secret */
  webhookSecret?: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Time Entries ====================

export interface TogglTimeEntry {
  id: number;
  workspace_id: number;
  project_id?: number;
  task_id?: number;
  billable: boolean;
  start: string;
  stop?: string;
  duration: number;
  description?: string;
  tags?: string[];
  tag_ids?: number[];
  duronly: boolean;
  at: string;
  server_deleted_at?: string;
  user_id: number;
}

export interface TogglCreateTimeEntryRequest {
  workspace_id: number;
  project_id?: number;
  task_id?: number;
  billable?: boolean;
  start: string;
  stop?: string;
  duration: number;
  description?: string;
  tags?: string[];
  tag_ids?: number[];
  created_with: string;
}

export interface TogglUpdateTimeEntryRequest {
  project_id?: number;
  task_id?: number;
  billable?: boolean;
  start?: string;
  stop?: string;
  duration?: number;
  description?: string;
  tags?: string[];
  tag_ids?: number[];
}

export interface TogglTimeEntryListParams {
  start_date?: string;
  end_date?: string;
  meta?: boolean;
}

// ==================== Projects ====================

export interface TogglProject {
  id: number;
  workspace_id: number;
  client_id?: number;
  name: string;
  is_private: boolean;
  active: boolean;
  at: string;
  created_at: string;
  server_deleted_at?: string;
  color: string;
  billable?: boolean;
  template?: boolean;
  auto_estimates?: boolean;
  estimated_hours?: number;
  actual_hours?: number;
  rate?: number;
  rate_last_updated?: string;
  currency?: string;
  recurring: boolean;
  status: string;
}

export interface TogglCreateProjectRequest {
  name: string;
  workspace_id: number;
  client_id?: number;
  is_private?: boolean;
  active?: boolean;
  color?: string;
  billable?: boolean;
  estimated_hours?: number;
  rate?: number;
  currency?: string;
}

// ==================== Clients ====================

export interface TogglClient {
  id: number;
  workspace_id: number;
  name: string;
  archived: boolean;
  at: string;
  server_deleted_at?: string;
  creator_id: number;
}

export interface TogglCreateClientRequest {
  name: string;
  workspace_id: number;
}

// ==================== Workspaces ====================

export interface TogglWorkspace {
  id: number;
  organization_id: number;
  name: string;
  premium: boolean;
  admin: boolean;
  default_hourly_rate?: number;
  default_currency: string;
  rounding: number;
  rounding_minutes: number;
  at: string;
  logo_url?: string;
}

// ==================== Tags ====================

export interface TogglTag {
  id: number;
  workspace_id: number;
  name: string;
  at: string;
  creator_id: number;
}

// ==================== Reports ====================

export interface TogglSummaryReportParams {
  start_date: string;
  end_date: string;
  project_ids?: number[];
  client_ids?: number[];
  user_ids?: number[];
  grouping?: "projects" | "clients" | "users";
  sub_grouping?: "projects" | "clients" | "users" | "time_entries";
}

export interface TogglSummaryReport {
  groups: TogglSummaryGroup[];
  total_grand?: number;
}

export interface TogglSummaryGroup {
  id?: number;
  title: { [key: string]: string };
  time: number;
  total_currencies?: { currency: string; amount: number }[];
  sub_groups?: TogglSummaryGroup[];
}

export interface TogglDetailedReportParams {
  start_date: string;
  end_date: string;
  project_ids?: number[];
  client_ids?: number[];
  user_ids?: number[];
  page_size?: number;
  first_row_number?: number;
}

export interface TogglDetailedReport {
  data: TogglDetailedReportEntry[];
  total_count: number;
  per_page: number;
  total_grand?: number;
  total_billable?: number;
}

export interface TogglDetailedReportEntry {
  id: number;
  pid?: number;
  project?: string;
  client?: string;
  tid?: number;
  task?: string;
  uid: number;
  user: string;
  description?: string;
  start: string;
  end?: string;
  dur: number;
  billable?: number;
  tags?: string[];
}

// ==================== Webhook Types ====================

export type TogglWebhookEventType =
  | "time_entry.created"
  | "time_entry.updated"
  | "time_entry.deleted"
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "client.created"
  | "client.updated"
  | "client.deleted"
  | "tag.created"
  | "tag.updated"
  | "tag.deleted";

export interface TogglWebhookPayload {
  event_id: string;
  event: TogglWebhookEventType;
  workspace_id: number;
  user_id: number;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface TogglWebhookSubscription {
  subscription_id: number;
  workspace_id: number;
  url_callback: string;
  event_filters: { entity: string; action: string }[];
  enabled: boolean;
  secret: string;
  created_at: string;
}

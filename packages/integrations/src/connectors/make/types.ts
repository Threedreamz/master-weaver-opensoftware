// ==================== Make (Integromat) API Types ====================
// API key authentication. Webhook triggers + scenario management.

/** Make scenario summary. */
export interface MakeScenario {
  id: number;
  name: string;
  teamId: number;
  folderId?: number;
  description?: string;
  isEnabled: boolean;
  isPaused: boolean;
  scheduling: MakeScheduling | null;
  createdAt: string;
  updatedAt: string;
  nextExec?: string;
  lastExec?: string;
}

/** Make scenario scheduling configuration. */
export interface MakeScheduling {
  type: "immediately" | "once" | "interval" | "cron";
  interval?: number;
  cron?: string;
  date?: string;
}

/** Make scenario execution log entry. */
export interface MakeExecution {
  id: number;
  scenarioId: number;
  status: "success" | "warning" | "error";
  operations: number;
  transfer: number;
  duration: number;
  startedAt: string;
  finishedAt: string;
}

/** Make webhook definition. */
export interface MakeWebhook {
  id: number;
  name: string;
  url: string;
  teamId: number;
  scenarioId?: number;
  enabled: boolean;
  createdAt: string;
}

/** Make paginated list response. */
export interface MakeListResponse<T> {
  data: T[];
  pg: {
    limit: number;
    offset: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
  };
}

/** Pagination parameters for Make API. */
export interface MakePaginationParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

/** Webhook trigger payload for Make scenarios. */
export interface MakeWebhookTriggerPayload {
  source: "openflow";
  event: "form_submission";
  flowId: string;
  submissionId: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/** Response from triggering a Make webhook. */
export interface MakeWebhookTriggerResponse {
  accepted: boolean;
}

/** Configuration for the Make connector. */
export interface MakeClientConfig {
  /** Make API token. */
  apiToken: string;
  /** Make API region (default: eu1). */
  region?: string;
  /** Team ID for scoping API calls. */
  teamId: number;
  /** Request timeout in ms. */
  timeout?: number;
}

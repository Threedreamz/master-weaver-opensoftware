// ── Shared ──────────────────────────────────────────────────────────────────

export interface RossumClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

// ── Queues ─────────────────────────────────────────────────────────────────

export interface RossumQueue {
  id: number;
  name: string;
  url: string;
  workspace: string;
  schema: string;
  connector: string | null;
  webhooks: string[];
  status: "active" | "inactive";
  counts: {
    importing: number;
    to_review: number;
    reviewing: number;
    confirmed: number;
    exported: number;
    rejected: number;
    deleted: number;
  };
}

export interface RossumQueueListResponse {
  pagination: RossumPagination;
  results: RossumQueue[];
}

// ── Annotations ────────────────────────────────────────────────────────────

export type RossumAnnotationStatus =
  | "importing"
  | "to_review"
  | "reviewing"
  | "confirmed"
  | "exported"
  | "rejected"
  | "deleted";

export interface RossumAnnotation {
  id: number;
  url: string;
  queue: string;
  document: string;
  status: RossumAnnotationStatus;
  schema: string;
  content: string;
  modifier: string | null;
  modified_at: string;
  confirmed_at: string | null;
  exported_at: string | null;
  assigned_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface RossumAnnotationListParams {
  page?: number;
  page_size?: number;
  status?: RossumAnnotationStatus | RossumAnnotationStatus[];
  queue?: number;
  ordering?: string;
}

export interface RossumAnnotationListResponse {
  pagination: RossumPagination;
  results: RossumAnnotation[];
}

// ── Documents ──────────────────────────────────────────────────────────────

export interface RossumDocument {
  id: number;
  url: string;
  s3_name: string;
  file_name: string;
  mime_type: string;
  arrived_at: string;
  original_file_name: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface RossumUploadParams {
  /** Queue ID to upload to. */
  queueId: number;
  /** File content as base64. */
  content: string;
  /** Original filename. */
  filename: string;
  /** Metadata to attach. */
  metadata?: Record<string, unknown>;
}

// ── Data Extraction ────────────────────────────────────────────────────────

export interface RossumDatapoint {
  id: number;
  url: string;
  schema_id: string;
  category: "datapoint" | "multivalue" | "tuple";
  type: "string" | "number" | "date" | "enum";
  rir_field_names: string[];
  value: string | null;
  value_type: string;
  validation_sources: string[];
  content: { value: string; position: number[] }[] | null;
}

export interface RossumContent {
  children: RossumDatapoint[];
}

// ── Schemas ────────────────────────────────────────────────────────────────

export interface RossumSchema {
  id: number;
  url: string;
  name: string;
  content: unknown[];
  metadata: Record<string, unknown>;
}

// ── Pagination ─────────────────────────────────────────────────────────────

export interface RossumPagination {
  total: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
}

// ── Webhook Events ─────────────────────────────────────────────────────────

export type RossumWebhookEventType =
  | "annotation_status"
  | "annotation_content"
  | "invocation"
  | "email";

export interface RossumWebhookEvent {
  action: RossumWebhookEventType;
  event: string;
  timestamp: string;
  request_id: string;
  annotation: Record<string, unknown>;
  document: Record<string, unknown>;
}

export interface RossumWebhookConfig {
  signingSecret: string;
  tolerance?: number;
}

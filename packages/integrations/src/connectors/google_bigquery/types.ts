// ==================== Google BigQuery API Types ====================
// Query, Tables, Datasets, Jobs, Load data
// OAuth2 authentication

/** BigQuery client configuration */
export interface BigQueryClientConfig {
  /** OAuth2 access token */
  accessToken: string;
  /** Google Cloud project ID */
  projectId: string;
  /** Default dataset ID */
  defaultDatasetId?: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Datasets ====================

export interface BigQueryDataset {
  kind: "bigquery#dataset";
  id: string;
  datasetReference: BigQueryDatasetReference;
  friendlyName?: string;
  description?: string;
  defaultTableExpirationMs?: string;
  defaultPartitionExpirationMs?: string;
  labels?: Record<string, string>;
  location?: string;
  creationTime?: string;
  lastModifiedTime?: string;
}

export interface BigQueryDatasetReference {
  projectId: string;
  datasetId: string;
}

export interface BigQueryDatasetListResponse {
  kind: "bigquery#datasetList";
  datasets?: BigQueryDatasetListEntry[];
  nextPageToken?: string;
}

export interface BigQueryDatasetListEntry {
  kind: "bigquery#dataset";
  id: string;
  datasetReference: BigQueryDatasetReference;
  friendlyName?: string;
  labels?: Record<string, string>;
  location?: string;
}

export interface BigQueryCreateDatasetRequest {
  datasetReference: BigQueryDatasetReference;
  friendlyName?: string;
  description?: string;
  defaultTableExpirationMs?: string;
  defaultPartitionExpirationMs?: string;
  labels?: Record<string, string>;
  location?: string;
}

// ==================== Tables ====================

export interface BigQueryTable {
  kind: "bigquery#table";
  id: string;
  tableReference: BigQueryTableReference;
  friendlyName?: string;
  description?: string;
  schema?: BigQueryTableSchema;
  numBytes?: string;
  numLongTermBytes?: string;
  numRows?: string;
  creationTime?: string;
  expirationTime?: string;
  lastModifiedTime?: string;
  type?: "TABLE" | "VIEW" | "MATERIALIZED_VIEW" | "EXTERNAL" | "SNAPSHOT";
  location?: string;
  labels?: Record<string, string>;
  timePartitioning?: BigQueryTimePartitioning;
  clustering?: BigQueryClustering;
}

export interface BigQueryTableReference {
  projectId: string;
  datasetId: string;
  tableId: string;
}

export interface BigQueryTableSchema {
  fields: BigQueryTableFieldSchema[];
}

export interface BigQueryTableFieldSchema {
  name: string;
  type: "STRING" | "BYTES" | "INTEGER" | "INT64" | "FLOAT" | "FLOAT64" | "NUMERIC" | "BIGNUMERIC" | "BOOLEAN" | "BOOL" | "TIMESTAMP" | "DATE" | "TIME" | "DATETIME" | "GEOGRAPHY" | "RECORD" | "STRUCT" | "JSON";
  mode?: "NULLABLE" | "REQUIRED" | "REPEATED";
  description?: string;
  fields?: BigQueryTableFieldSchema[];
}

export interface BigQueryTimePartitioning {
  type: "DAY" | "HOUR" | "MONTH" | "YEAR";
  field?: string;
  expirationMs?: string;
  requirePartitionFilter?: boolean;
}

export interface BigQueryClustering {
  fields: string[];
}

export interface BigQueryTableListResponse {
  kind: "bigquery#tableList";
  tables?: BigQueryTableListEntry[];
  nextPageToken?: string;
  totalItems?: number;
}

export interface BigQueryTableListEntry {
  kind: "bigquery#table";
  id: string;
  tableReference: BigQueryTableReference;
  friendlyName?: string;
  type?: string;
  creationTime?: string;
  expirationTime?: string;
  labels?: Record<string, string>;
}

export interface BigQueryCreateTableRequest {
  tableReference: BigQueryTableReference;
  friendlyName?: string;
  description?: string;
  schema: BigQueryTableSchema;
  timePartitioning?: BigQueryTimePartitioning;
  clustering?: BigQueryClustering;
  expirationTime?: string;
  labels?: Record<string, string>;
}

// ==================== Query ====================

export interface BigQueryQueryRequest {
  query: string;
  useLegacySql?: boolean;
  maxResults?: number;
  timeoutMs?: number;
  dryRun?: boolean;
  useQueryCache?: boolean;
  defaultDataset?: BigQueryDatasetReference;
  parameterMode?: "POSITIONAL" | "NAMED";
  queryParameters?: BigQueryQueryParameter[];
  labels?: Record<string, string>;
}

export interface BigQueryQueryParameter {
  name?: string;
  parameterType: { type: string };
  parameterValue: { value?: string; arrayValues?: { value: string }[] };
}

export interface BigQueryQueryResponse {
  kind: "bigquery#queryResponse";
  schema?: BigQueryTableSchema;
  jobReference: BigQueryJobReference;
  totalRows?: string;
  pageToken?: string;
  rows?: BigQueryTableRow[];
  totalBytesProcessed?: string;
  jobComplete: boolean;
  cacheHit?: boolean;
  errors?: BigQueryError[];
}

export interface BigQueryTableRow {
  f: { v: unknown }[];
}

export interface BigQueryError {
  reason: string;
  location?: string;
  message: string;
}

// ==================== Jobs ====================

export interface BigQueryJob {
  kind: "bigquery#job";
  id: string;
  jobReference: BigQueryJobReference;
  status: BigQueryJobStatus;
  statistics?: BigQueryJobStatistics;
  configuration?: Record<string, unknown>;
  user_email?: string;
}

export interface BigQueryJobReference {
  projectId: string;
  jobId: string;
  location?: string;
}

export interface BigQueryJobStatus {
  state: "PENDING" | "RUNNING" | "DONE";
  errorResult?: BigQueryError;
  errors?: BigQueryError[];
}

export interface BigQueryJobStatistics {
  creationTime?: string;
  startTime?: string;
  endTime?: string;
  totalBytesProcessed?: string;
  query?: {
    totalBytesProcessed?: string;
    totalBytesBilled?: string;
    cacheHit?: boolean;
    statementType?: string;
  };
}

export interface BigQueryJobListResponse {
  kind: "bigquery#jobList";
  jobs?: BigQueryJob[];
  nextPageToken?: string;
}

// ==================== Insert (Streaming) ====================

export interface BigQueryInsertAllRequest {
  kind?: "bigquery#tableDataInsertAllRequest";
  skipInvalidRows?: boolean;
  ignoreUnknownValues?: boolean;
  rows: BigQueryInsertRow[];
}

export interface BigQueryInsertRow {
  insertId?: string;
  json: Record<string, unknown>;
}

export interface BigQueryInsertAllResponse {
  kind: "bigquery#tableDataInsertAllResponse";
  insertErrors?: {
    index: number;
    errors: BigQueryError[];
  }[];
}

// ==================== Pagination ====================

export interface BigQueryPaginationParams {
  pageToken?: string;
  maxResults?: number;
}

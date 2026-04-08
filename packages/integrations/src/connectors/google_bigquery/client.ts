import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  BigQueryClientConfig,
  BigQueryDataset,
  BigQueryDatasetListResponse,
  BigQueryCreateDatasetRequest,
  BigQueryTable,
  BigQueryTableListResponse,
  BigQueryCreateTableRequest,
  BigQueryQueryRequest,
  BigQueryQueryResponse,
  BigQueryJob,
  BigQueryJobListResponse,
  BigQueryInsertAllRequest,
  BigQueryInsertAllResponse,
  BigQueryPaginationParams,
} from "./types.js";

const BIGQUERY_BASE_URL = "https://bigquery.googleapis.com/bigquery/v2";

/**
 * Google BigQuery REST API client.
 *
 * Manages datasets, tables, queries, jobs, and streaming inserts.
 *
 * Uses OAuth2 authentication with Google Cloud access token.
 */
export class BigQueryClient extends BaseIntegrationClient {
  private readonly projectId: string;
  private readonly defaultDatasetId?: string;

  constructor(config: BigQueryClientConfig) {
    super({
      baseUrl: BIGQUERY_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 60_000,
      rateLimit: { requestsPerMinute: 60 },
    });
    this.projectId = config.projectId;
    this.defaultDatasetId = config.defaultDatasetId;
  }

  // ==================== Datasets ====================

  /** List datasets in the project. */
  async listDatasets(
    params?: BigQueryPaginationParams
  ): Promise<ApiResponse<BigQueryDatasetListResponse>> {
    const queryParams: Record<string, string> = {};
    if (params?.pageToken) queryParams.pageToken = params.pageToken;
    if (params?.maxResults != null) queryParams.maxResults = String(params.maxResults);

    return this.get<BigQueryDatasetListResponse>(
      `/projects/${this.projectId}/datasets`,
      queryParams
    );
  }

  /** Get a dataset by ID. */
  async getDataset(datasetId: string): Promise<ApiResponse<BigQueryDataset>> {
    return this.get<BigQueryDataset>(
      `/projects/${this.projectId}/datasets/${datasetId}`
    );
  }

  /** Create a new dataset. */
  async createDataset(
    data: BigQueryCreateDatasetRequest
  ): Promise<ApiResponse<BigQueryDataset>> {
    return this.post<BigQueryDataset>(
      `/projects/${this.projectId}/datasets`,
      data
    );
  }

  /** Delete a dataset. */
  async deleteDataset(
    datasetId: string,
    deleteContents = false
  ): Promise<ApiResponse<void>> {
    const params: Record<string, string> = {};
    if (deleteContents) params.deleteContents = "true";
    return this.request<void>({
      method: "DELETE",
      path: `/projects/${this.projectId}/datasets/${datasetId}`,
      params,
    });
  }

  // ==================== Tables ====================

  /** List tables in a dataset. */
  async listTables(
    datasetId: string,
    params?: BigQueryPaginationParams
  ): Promise<ApiResponse<BigQueryTableListResponse>> {
    const queryParams: Record<string, string> = {};
    if (params?.pageToken) queryParams.pageToken = params.pageToken;
    if (params?.maxResults != null) queryParams.maxResults = String(params.maxResults);

    return this.get<BigQueryTableListResponse>(
      `/projects/${this.projectId}/datasets/${datasetId}/tables`,
      queryParams
    );
  }

  /** Get a table by ID. */
  async getTable(
    datasetId: string,
    tableId: string
  ): Promise<ApiResponse<BigQueryTable>> {
    return this.get<BigQueryTable>(
      `/projects/${this.projectId}/datasets/${datasetId}/tables/${tableId}`
    );
  }

  /** Create a new table. */
  async createTable(
    datasetId: string,
    data: BigQueryCreateTableRequest
  ): Promise<ApiResponse<BigQueryTable>> {
    return this.post<BigQueryTable>(
      `/projects/${this.projectId}/datasets/${datasetId}/tables`,
      data
    );
  }

  /** Delete a table. */
  async deleteTable(
    datasetId: string,
    tableId: string
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(
      `/projects/${this.projectId}/datasets/${datasetId}/tables/${tableId}`
    );
  }

  // ==================== Query ====================

  /** Run a synchronous query. */
  async query(
    data: BigQueryQueryRequest
  ): Promise<ApiResponse<BigQueryQueryResponse>> {
    // Set default dataset if not provided
    if (!data.defaultDataset && this.defaultDatasetId) {
      data = {
        ...data,
        defaultDataset: {
          projectId: this.projectId,
          datasetId: this.defaultDatasetId,
        },
      };
    }
    return this.post<BigQueryQueryResponse>(
      `/projects/${this.projectId}/queries`,
      data
    );
  }

  /** Get query results (for paging through large results). */
  async getQueryResults(
    jobId: string,
    params?: { pageToken?: string; maxResults?: number; startIndex?: string }
  ): Promise<ApiResponse<BigQueryQueryResponse>> {
    const queryParams: Record<string, string> = {};
    if (params?.pageToken) queryParams.pageToken = params.pageToken;
    if (params?.maxResults != null) queryParams.maxResults = String(params.maxResults);
    if (params?.startIndex) queryParams.startIndex = params.startIndex;

    return this.get<BigQueryQueryResponse>(
      `/projects/${this.projectId}/queries/${jobId}`,
      queryParams
    );
  }

  // ==================== Jobs ====================

  /** List jobs in the project. */
  async listJobs(
    params?: BigQueryPaginationParams & { stateFilter?: string; allUsers?: boolean }
  ): Promise<ApiResponse<BigQueryJobListResponse>> {
    const queryParams: Record<string, string> = {};
    if (params?.pageToken) queryParams.pageToken = params.pageToken;
    if (params?.maxResults != null) queryParams.maxResults = String(params.maxResults);
    if (params?.stateFilter) queryParams.stateFilter = params.stateFilter;
    if (params?.allUsers != null) queryParams.allUsers = String(params.allUsers);

    return this.get<BigQueryJobListResponse>(
      `/projects/${this.projectId}/jobs`,
      queryParams
    );
  }

  /** Get a job by ID. */
  async getJob(jobId: string): Promise<ApiResponse<BigQueryJob>> {
    return this.get<BigQueryJob>(
      `/projects/${this.projectId}/jobs/${jobId}`
    );
  }

  /** Cancel a job. */
  async cancelJob(jobId: string): Promise<ApiResponse<{ job: BigQueryJob }>> {
    return this.post<{ job: BigQueryJob }>(
      `/projects/${this.projectId}/jobs/${jobId}/cancel`
    );
  }

  // ==================== Streaming Insert ====================

  /** Insert rows into a table via streaming insert. */
  async insertAll(
    datasetId: string,
    tableId: string,
    data: BigQueryInsertAllRequest
  ): Promise<ApiResponse<BigQueryInsertAllResponse>> {
    return this.post<BigQueryInsertAllResponse>(
      `/projects/${this.projectId}/datasets/${datasetId}/tables/${tableId}/insertAll`,
      data
    );
  }

  // ==================== Connection Test ====================

  /** Verify credentials by listing datasets. */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.listDatasets({ maxResults: 1 });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  TableauClientConfig,
  TableauAuthResponse,
  TableauWorkbook,
  TableauWorkbookListResponse,
  TableauView,
  TableauViewListResponse,
  TableauDatasource,
  TableauDatasourceListResponse,
  TableauProject,
  TableauProjectListResponse,
  TableauCreateProjectRequest,
  TableauUser,
  TableauJob,
  TableauQueryParams,
} from "./types.js";

const TABLEAU_DEFAULT_URL = "https://eu-west-1a.online.tableau.com/api/3.21";

/**
 * Tableau REST API client.
 *
 * Manages workbooks, views, datasources, projects, and publishing.
 *
 * Uses personal access token (PAT) authentication. The client
 * signs in on first request and uses the session token for
 * subsequent calls.
 */
export class TableauClient extends BaseIntegrationClient {
  private readonly tokenName: string;
  private readonly tokenValue: string;
  private readonly contentUrl: string;
  private authToken?: string;
  private siteIdResolved?: string;

  constructor(config: TableauClientConfig) {
    super({
      baseUrl: config.serverUrl ?? TABLEAU_DEFAULT_URL,
      authType: "custom",
      credentials: {
        tokenName: config.tokenName,
        tokenValue: config.tokenValue,
      },
      timeout: config.timeout ?? 60_000,
      rateLimit: { requestsPerMinute: 30 },
    });
    this.tokenName = config.tokenName;
    this.tokenValue = config.tokenValue;
    this.contentUrl = config.siteId;
  }

  /** Authenticate and retrieve a session token. */
  async signIn(): Promise<ApiResponse<TableauAuthResponse>> {
    const response = await this.post<TableauAuthResponse>("/auth/signin", {
      credentials: {
        personalAccessTokenName: this.tokenName,
        personalAccessTokenSecret: this.tokenValue,
        site: { contentUrl: this.contentUrl },
      },
    });
    this.authToken = response.data.credentials.token;
    this.siteIdResolved = response.data.credentials.site.id;
    return response;
  }

  /** Sign out and invalidate the session token. */
  async signOut(): Promise<ApiResponse<void>> {
    const response = await this.post<void>("/auth/signout");
    this.authToken = undefined;
    this.siteIdResolved = undefined;
    return response;
  }

  /** Ensure authenticated; sign in if needed. */
  private async ensureAuth(): Promise<void> {
    if (!this.authToken) {
      await this.signIn();
    }
  }

  private sitePath(): string {
    return `/sites/${this.siteIdResolved}`;
  }

  // ==================== Workbooks ====================

  /** List workbooks on the site. */
  async listWorkbooks(
    params?: TableauQueryParams
  ): Promise<ApiResponse<TableauWorkbookListResponse>> {
    await this.ensureAuth();
    return this.get<TableauWorkbookListResponse>(
      `${this.sitePath()}/workbooks`,
      this.queryParams(params)
    );
  }

  /** Get a workbook by ID. */
  async getWorkbook(workbookId: string): Promise<ApiResponse<{ workbook: TableauWorkbook }>> {
    await this.ensureAuth();
    return this.get<{ workbook: TableauWorkbook }>(
      `${this.sitePath()}/workbooks/${workbookId}`
    );
  }

  /** Delete a workbook. */
  async deleteWorkbook(workbookId: string): Promise<ApiResponse<void>> {
    await this.ensureAuth();
    return this.delete<void>(
      `${this.sitePath()}/workbooks/${workbookId}`
    );
  }

  /** Get views for a workbook. */
  async getWorkbookViews(
    workbookId: string
  ): Promise<ApiResponse<TableauViewListResponse>> {
    await this.ensureAuth();
    return this.get<TableauViewListResponse>(
      `${this.sitePath()}/workbooks/${workbookId}/views`
    );
  }

  // ==================== Views ====================

  /** List views on the site. */
  async listViews(
    params?: TableauQueryParams
  ): Promise<ApiResponse<TableauViewListResponse>> {
    await this.ensureAuth();
    return this.get<TableauViewListResponse>(
      `${this.sitePath()}/views`,
      this.queryParams(params)
    );
  }

  /** Get a view by ID. */
  async getView(viewId: string): Promise<ApiResponse<{ view: TableauView }>> {
    await this.ensureAuth();
    return this.get<{ view: TableauView }>(
      `${this.sitePath()}/views/${viewId}`
    );
  }

  // ==================== Datasources ====================

  /** List datasources on the site. */
  async listDatasources(
    params?: TableauQueryParams
  ): Promise<ApiResponse<TableauDatasourceListResponse>> {
    await this.ensureAuth();
    return this.get<TableauDatasourceListResponse>(
      `${this.sitePath()}/datasources`,
      this.queryParams(params)
    );
  }

  /** Get a datasource by ID. */
  async getDatasource(
    datasourceId: string
  ): Promise<ApiResponse<{ datasource: TableauDatasource }>> {
    await this.ensureAuth();
    return this.get<{ datasource: TableauDatasource }>(
      `${this.sitePath()}/datasources/${datasourceId}`
    );
  }

  /** Delete a datasource. */
  async deleteDatasource(datasourceId: string): Promise<ApiResponse<void>> {
    await this.ensureAuth();
    return this.delete<void>(
      `${this.sitePath()}/datasources/${datasourceId}`
    );
  }

  /** Refresh a datasource extract. */
  async refreshDatasource(
    datasourceId: string
  ): Promise<ApiResponse<{ job: TableauJob }>> {
    await this.ensureAuth();
    return this.post<{ job: TableauJob }>(
      `${this.sitePath()}/datasources/${datasourceId}/refresh`
    );
  }

  // ==================== Projects ====================

  /** List projects on the site. */
  async listProjects(
    params?: TableauQueryParams
  ): Promise<ApiResponse<TableauProjectListResponse>> {
    await this.ensureAuth();
    return this.get<TableauProjectListResponse>(
      `${this.sitePath()}/projects`,
      this.queryParams(params)
    );
  }

  /** Create a new project. */
  async createProject(
    data: TableauCreateProjectRequest
  ): Promise<ApiResponse<{ project: TableauProject }>> {
    await this.ensureAuth();
    return this.post<{ project: TableauProject }>(
      `${this.sitePath()}/projects`,
      data
    );
  }

  /** Update a project. */
  async updateProject(
    projectId: string,
    data: TableauCreateProjectRequest
  ): Promise<ApiResponse<{ project: TableauProject }>> {
    await this.ensureAuth();
    return this.put<{ project: TableauProject }>(
      `${this.sitePath()}/projects/${projectId}`,
      data
    );
  }

  /** Delete a project. */
  async deleteProject(projectId: string): Promise<ApiResponse<void>> {
    await this.ensureAuth();
    return this.delete<void>(
      `${this.sitePath()}/projects/${projectId}`
    );
  }

  // ==================== Users ====================

  /** List users on the site. */
  async listUsers(
    params?: TableauQueryParams
  ): Promise<ApiResponse<{ pagination: unknown; users: { user: TableauUser[] } }>> {
    await this.ensureAuth();
    return this.get<{ pagination: unknown; users: { user: TableauUser[] } }>(
      `${this.sitePath()}/users`,
      this.queryParams(params)
    );
  }

  // ==================== Jobs ====================

  /** Get a job by ID. */
  async getJob(jobId: string): Promise<ApiResponse<{ job: TableauJob }>> {
    await this.ensureAuth();
    return this.get<{ job: TableauJob }>(
      `${this.sitePath()}/jobs/${jobId}`
    );
  }

  // ==================== Connection Test ====================

  /** Verify credentials by signing in. */
  async testConnection(): Promise<boolean> {
    try {
      await this.signIn();
      return !!this.authToken;
    } catch {
      return false;
    }
  }

  // ==================== Private Helpers ====================

  private queryParams(
    params?: TableauQueryParams
  ): Record<string, string> {
    const result: Record<string, string> = {};
    if (params?.pageSize != null) result.pageSize = String(params.pageSize);
    if (params?.pageNumber != null) result.pageNumber = String(params.pageNumber);
    if (params?.filter) result.filter = params.filter;
    if (params?.sort) result.sort = params.sort;
    return result;
  }
}

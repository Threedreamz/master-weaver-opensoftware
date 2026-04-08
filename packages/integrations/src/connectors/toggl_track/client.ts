import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  TogglTrackClientConfig,
  TogglTimeEntry,
  TogglCreateTimeEntryRequest,
  TogglUpdateTimeEntryRequest,
  TogglTimeEntryListParams,
  TogglProject,
  TogglCreateProjectRequest,
  TogglClient,
  TogglCreateClientRequest,
  TogglWorkspace,
  TogglTag,
  TogglSummaryReportParams,
  TogglSummaryReport,
  TogglDetailedReportParams,
  TogglDetailedReport,
  TogglWebhookSubscription,
} from "./types.js";

const TOGGL_BASE_URL = "https://api.track.toggl.com/api/v9";
const TOGGL_REPORTS_URL = "https://api.track.toggl.com/reports/api/v3";

/**
 * Toggl Track API v9 client.
 *
 * Time tracking platform with projects, clients, workspaces, and reports.
 *
 * Uses basic auth with API token as username and "api_token" as password.
 */
export class TogglTrackClient extends BaseIntegrationClient {
  private readonly workspaceId?: number;

  constructor(config: TogglTrackClientConfig) {
    super({
      baseUrl: TOGGL_BASE_URL,
      authType: "basic_auth",
      credentials: {
        username: config.apiToken,
        password: "api_token",
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
    });
    this.workspaceId = config.workspaceId;
  }

  // ==================== Time Entries ====================

  /** List time entries (most recent first). */
  async listTimeEntries(
    params?: TogglTimeEntryListParams
  ): Promise<ApiResponse<TogglTimeEntry[]>> {
    const queryParams: Record<string, string> = {};
    if (params?.start_date) queryParams.start_date = params.start_date;
    if (params?.end_date) queryParams.end_date = params.end_date;
    if (params?.meta != null) queryParams.meta = String(params.meta);

    return this.get<TogglTimeEntry[]>("/me/time_entries", queryParams);
  }

  /** Get a time entry by ID. */
  async getTimeEntry(entryId: number): Promise<ApiResponse<TogglTimeEntry>> {
    return this.get<TogglTimeEntry>(`/me/time_entries/${entryId}`);
  }

  /** Get the current running time entry. */
  async getCurrentTimeEntry(): Promise<ApiResponse<TogglTimeEntry | null>> {
    return this.get<TogglTimeEntry | null>("/me/time_entries/current");
  }

  /** Create a new time entry. */
  async createTimeEntry(
    workspaceId: number,
    data: TogglCreateTimeEntryRequest
  ): Promise<ApiResponse<TogglTimeEntry>> {
    return this.post<TogglTimeEntry>(
      `/workspaces/${workspaceId}/time_entries`,
      { ...data, created_with: data.created_with ?? "opensoftware" }
    );
  }

  /** Update a time entry. */
  async updateTimeEntry(
    workspaceId: number,
    entryId: number,
    data: TogglUpdateTimeEntryRequest
  ): Promise<ApiResponse<TogglTimeEntry>> {
    return this.put<TogglTimeEntry>(
      `/workspaces/${workspaceId}/time_entries/${entryId}`,
      data
    );
  }

  /** Delete a time entry. */
  async deleteTimeEntry(
    workspaceId: number,
    entryId: number
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(
      `/workspaces/${workspaceId}/time_entries/${entryId}`
    );
  }

  /** Stop the current running time entry. */
  async stopTimeEntry(
    workspaceId: number,
    entryId: number
  ): Promise<ApiResponse<TogglTimeEntry>> {
    return this.patch<TogglTimeEntry>(
      `/workspaces/${workspaceId}/time_entries/${entryId}/stop`
    );
  }

  // ==================== Projects ====================

  /** List projects in a workspace. */
  async listProjects(
    workspaceId?: number
  ): Promise<ApiResponse<TogglProject[]>> {
    const wsId = workspaceId ?? this.workspaceId;
    return this.get<TogglProject[]>(`/workspaces/${wsId}/projects`);
  }

  /** Get a project by ID. */
  async getProject(
    workspaceId: number,
    projectId: number
  ): Promise<ApiResponse<TogglProject>> {
    return this.get<TogglProject>(
      `/workspaces/${workspaceId}/projects/${projectId}`
    );
  }

  /** Create a new project. */
  async createProject(
    workspaceId: number,
    data: TogglCreateProjectRequest
  ): Promise<ApiResponse<TogglProject>> {
    return this.post<TogglProject>(
      `/workspaces/${workspaceId}/projects`,
      data
    );
  }

  /** Update a project. */
  async updateProject(
    workspaceId: number,
    projectId: number,
    data: Partial<TogglCreateProjectRequest>
  ): Promise<ApiResponse<TogglProject>> {
    return this.put<TogglProject>(
      `/workspaces/${workspaceId}/projects/${projectId}`,
      data
    );
  }

  /** Delete a project. */
  async deleteProject(
    workspaceId: number,
    projectId: number
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(
      `/workspaces/${workspaceId}/projects/${projectId}`
    );
  }

  // ==================== Clients ====================

  /** List clients in a workspace. */
  async listClients(
    workspaceId?: number
  ): Promise<ApiResponse<TogglClient[]>> {
    const wsId = workspaceId ?? this.workspaceId;
    return this.get<TogglClient[]>(`/workspaces/${wsId}/clients`);
  }

  /** Create a new client. */
  async createClient(
    workspaceId: number,
    data: TogglCreateClientRequest
  ): Promise<ApiResponse<TogglClient>> {
    return this.post<TogglClient>(
      `/workspaces/${workspaceId}/clients`,
      data
    );
  }

  /** Update a client. */
  async updateClient(
    workspaceId: number,
    clientId: number,
    data: Partial<TogglCreateClientRequest>
  ): Promise<ApiResponse<TogglClient>> {
    return this.put<TogglClient>(
      `/workspaces/${workspaceId}/clients/${clientId}`,
      data
    );
  }

  /** Delete a client. */
  async deleteClient(
    workspaceId: number,
    clientId: number
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(
      `/workspaces/${workspaceId}/clients/${clientId}`
    );
  }

  // ==================== Workspaces ====================

  /** List all workspaces for the authenticated user. */
  async listWorkspaces(): Promise<ApiResponse<TogglWorkspace[]>> {
    return this.get<TogglWorkspace[]>("/workspaces");
  }

  /** Get a workspace by ID. */
  async getWorkspace(workspaceId: number): Promise<ApiResponse<TogglWorkspace>> {
    return this.get<TogglWorkspace>(`/workspaces/${workspaceId}`);
  }

  // ==================== Tags ====================

  /** List tags in a workspace. */
  async listTags(workspaceId?: number): Promise<ApiResponse<TogglTag[]>> {
    const wsId = workspaceId ?? this.workspaceId;
    return this.get<TogglTag[]>(`/workspaces/${wsId}/tags`);
  }

  // ==================== Reports ====================

  /** Get a summary report for a workspace. */
  async getSummaryReport(
    workspaceId: number,
    params: TogglSummaryReportParams
  ): Promise<ApiResponse<TogglSummaryReport>> {
    // Reports API uses POST with body
    return this.request<TogglSummaryReport>({
      method: "POST",
      path: `${TOGGL_REPORTS_URL}/workspace/${workspaceId}/summary/time_entries`,
      body: params,
    });
  }

  /** Get a detailed report for a workspace. */
  async getDetailedReport(
    workspaceId: number,
    params: TogglDetailedReportParams
  ): Promise<ApiResponse<TogglDetailedReport>> {
    return this.request<TogglDetailedReport>({
      method: "POST",
      path: `${TOGGL_REPORTS_URL}/workspace/${workspaceId}/search/time_entries`,
      body: params,
    });
  }

  // ==================== Webhooks ====================

  /** List webhook subscriptions for a workspace. */
  async listWebhookSubscriptions(
    workspaceId: number
  ): Promise<ApiResponse<TogglWebhookSubscription[]>> {
    return this.get<TogglWebhookSubscription[]>(
      `/workspaces/${workspaceId}/webhooks`
    );
  }

  /** Create a webhook subscription. */
  async createWebhookSubscription(
    workspaceId: number,
    data: { url_callback: string; event_filters: { entity: string; action: string }[]; secret: string }
  ): Promise<ApiResponse<TogglWebhookSubscription>> {
    return this.post<TogglWebhookSubscription>(
      `/workspaces/${workspaceId}/webhooks`,
      data
    );
  }

  /** Delete a webhook subscription. */
  async deleteWebhookSubscription(
    workspaceId: number,
    subscriptionId: number
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(
      `/workspaces/${workspaceId}/webhooks/${subscriptionId}`
    );
  }

  // ==================== Connection Test ====================

  /** Verify credentials by fetching user profile. */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.get<{ id: number }>("/me");
      return response.status === 200 && !!response.data.id;
    } catch {
      return false;
    }
  }
}

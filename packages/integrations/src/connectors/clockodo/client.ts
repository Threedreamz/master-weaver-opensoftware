import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  ClockodoClientConfig,
  ClockodoTimeEntry,
  ClockodoCreateTimeEntryRequest,
  ClockodoUpdateTimeEntryRequest,
  ClockodoTimeEntryListParams,
  ClockodoCustomer,
  ClockodoCreateCustomerRequest,
  ClockodoProject,
  ClockodoCreateProjectRequest,
  ClockodoService,
  ClockodoCreateServiceRequest,
  ClockodoUser,
  ClockodoUserReport,
  ClockodoProjectReport,
  ClockodoReportParams,
  ClockodoClock,
  ClockodoStartClockRequest,
} from "./types.js";

const CLOCKODO_BASE_URL = "https://my.clockodo.com/api";

/**
 * Clockodo API client.
 *
 * German time tracking platform with projects, customers,
 * services, and reporting for billing.
 *
 * Uses API key auth: X-ClockodoApiUser (email) + X-ClockodoApiKey.
 */
export class ClockodoClient extends BaseIntegrationClient {
  constructor(config: ClockodoClientConfig) {
    super({
      baseUrl: CLOCKODO_BASE_URL,
      authType: "api_key",
      credentials: {
        apiKey: config.apiKey,
        headerName: "X-ClockodoApiKey",
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
      defaultHeaders: {
        "X-ClockodoApiUser": config.email,
        "X-Clockodo-External-Application": "opensoftware;integrations",
      },
    });
  }

  // ==================== Time Entries ====================

  /** List time entries within a date range. */
  async listTimeEntries(
    params: ClockodoTimeEntryListParams
  ): Promise<ApiResponse<{ entries: ClockodoTimeEntry[] }>> {
    const queryParams: Record<string, string> = {
      time_since: params.timeSince,
      time_until: params.timeUntil,
    };
    if (params.usersId != null) queryParams.users_id = String(params.usersId);
    if (params.customersId != null) queryParams.customers_id = String(params.customersId);
    if (params.projectsId != null) queryParams.projects_id = String(params.projectsId);
    if (params.servicesId != null) queryParams.services_id = String(params.servicesId);
    if (params.billable != null) queryParams.billable = String(params.billable);
    if (params.page != null) queryParams.page = String(params.page);

    return this.get<{ entries: ClockodoTimeEntry[] }>("/v2/entries", queryParams);
  }

  /** Get a time entry by ID. */
  async getTimeEntry(entryId: number): Promise<ApiResponse<{ entry: ClockodoTimeEntry }>> {
    return this.get<{ entry: ClockodoTimeEntry }>(`/v2/entries/${entryId}`);
  }

  /** Create a new time entry. */
  async createTimeEntry(
    data: ClockodoCreateTimeEntryRequest
  ): Promise<ApiResponse<{ entry: ClockodoTimeEntry }>> {
    return this.post<{ entry: ClockodoTimeEntry }>("/v2/entries", data);
  }

  /** Update a time entry. */
  async updateTimeEntry(
    entryId: number,
    data: ClockodoUpdateTimeEntryRequest
  ): Promise<ApiResponse<{ entry: ClockodoTimeEntry }>> {
    return this.put<{ entry: ClockodoTimeEntry }>(`/v2/entries/${entryId}`, data);
  }

  /** Delete a time entry. */
  async deleteTimeEntry(entryId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/v2/entries/${entryId}`);
  }

  // ==================== Customers ====================

  /** List all customers. */
  async listCustomers(): Promise<ApiResponse<{ customers: ClockodoCustomer[] }>> {
    return this.get<{ customers: ClockodoCustomer[] }>("/v2/customers");
  }

  /** Get a customer by ID. */
  async getCustomer(customerId: number): Promise<ApiResponse<{ customer: ClockodoCustomer }>> {
    return this.get<{ customer: ClockodoCustomer }>(`/v2/customers/${customerId}`);
  }

  /** Create a new customer. */
  async createCustomer(
    data: ClockodoCreateCustomerRequest
  ): Promise<ApiResponse<{ customer: ClockodoCustomer }>> {
    return this.post<{ customer: ClockodoCustomer }>("/v2/customers", data);
  }

  /** Update a customer. */
  async updateCustomer(
    customerId: number,
    data: Partial<ClockodoCreateCustomerRequest>
  ): Promise<ApiResponse<{ customer: ClockodoCustomer }>> {
    return this.put<{ customer: ClockodoCustomer }>(`/v2/customers/${customerId}`, data);
  }

  /** Delete a customer. */
  async deleteCustomer(customerId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/v2/customers/${customerId}`);
  }

  // ==================== Projects ====================

  /** List all projects. */
  async listProjects(
    params?: { customersId?: number }
  ): Promise<ApiResponse<{ projects: ClockodoProject[] }>> {
    const queryParams: Record<string, string> = {};
    if (params?.customersId != null) queryParams.customers_id = String(params.customersId);
    return this.get<{ projects: ClockodoProject[] }>("/v2/projects", queryParams);
  }

  /** Get a project by ID. */
  async getProject(projectId: number): Promise<ApiResponse<{ project: ClockodoProject }>> {
    return this.get<{ project: ClockodoProject }>(`/v2/projects/${projectId}`);
  }

  /** Create a new project. */
  async createProject(
    data: ClockodoCreateProjectRequest
  ): Promise<ApiResponse<{ project: ClockodoProject }>> {
    return this.post<{ project: ClockodoProject }>("/v2/projects", data);
  }

  /** Update a project. */
  async updateProject(
    projectId: number,
    data: Partial<ClockodoCreateProjectRequest>
  ): Promise<ApiResponse<{ project: ClockodoProject }>> {
    return this.put<{ project: ClockodoProject }>(`/v2/projects/${projectId}`, data);
  }

  /** Delete a project. */
  async deleteProject(projectId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/v2/projects/${projectId}`);
  }

  // ==================== Services ====================

  /** List all services. */
  async listServices(): Promise<ApiResponse<{ services: ClockodoService[] }>> {
    return this.get<{ services: ClockodoService[] }>("/v2/services");
  }

  /** Create a new service. */
  async createService(
    data: ClockodoCreateServiceRequest
  ): Promise<ApiResponse<{ service: ClockodoService }>> {
    return this.post<{ service: ClockodoService }>("/v2/services", data);
  }

  // ==================== Users ====================

  /** List all users. */
  async listUsers(): Promise<ApiResponse<{ users: ClockodoUser[] }>> {
    return this.get<{ users: ClockodoUser[] }>("/v2/users");
  }

  /** Get the current authenticated user. */
  async getCurrentUser(): Promise<ApiResponse<{ user: ClockodoUser }>> {
    return this.get<{ user: ClockodoUser }>("/v2/users/me");
  }

  // ==================== Reports ====================

  /** Get user reports for a given period. */
  async getUserReports(
    params: ClockodoReportParams
  ): Promise<ApiResponse<{ userReports: ClockodoUserReport[] }>> {
    const queryParams: Record<string, string> = {
      year: String(params.year),
    };
    if (params.month != null) queryParams.month = String(params.month);
    if (params.usersId != null) queryParams.users_id = String(params.usersId);

    return this.get<{ userReports: ClockodoUserReport[] }>("/v2/reports/users", queryParams);
  }

  /** Get project reports for a given period. */
  async getProjectReports(
    params: ClockodoReportParams
  ): Promise<ApiResponse<{ projectReports: ClockodoProjectReport[] }>> {
    const queryParams: Record<string, string> = {
      year: String(params.year),
    };
    if (params.month != null) queryParams.month = String(params.month);
    if (params.customersId != null) queryParams.customers_id = String(params.customersId);

    return this.get<{ projectReports: ClockodoProjectReport[] }>("/v2/reports/projects", queryParams);
  }

  // ==================== Clock (Running Timer) ====================

  /** Get the currently running timer. */
  async getClock(): Promise<ApiResponse<ClockodoClock>> {
    return this.get<ClockodoClock>("/v2/clock");
  }

  /** Start a new timer. */
  async startClock(
    data: ClockodoStartClockRequest
  ): Promise<ApiResponse<{ running: ClockodoTimeEntry }>> {
    return this.post<{ running: ClockodoTimeEntry }>("/v2/clock", data);
  }

  /** Stop the currently running timer. */
  async stopClock(): Promise<ApiResponse<{ entry: ClockodoTimeEntry }>> {
    return this.delete<{ entry: ClockodoTimeEntry }>("/v2/clock");
  }

  // ==================== Connection Test ====================

  /** Verify credentials by fetching the current user. */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.getCurrentUser();
      return response.status === 200 && !!response.data.user.id;
    } catch {
      return false;
    }
  }
}

import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  HarvestClientConfig,
  HarvestTimeEntry,
  HarvestCreateTimeEntryRequest,
  HarvestUpdateTimeEntryRequest,
  HarvestTimeEntryListParams,
  HarvestProject,
  HarvestCreateProjectRequest,
  HarvestClient as HarvestClientRecord,
  HarvestCreateClientRequest,
  HarvestInvoice,
  HarvestCreateInvoiceRequest,
  HarvestExpense,
  HarvestCreateExpenseRequest,
  HarvestUser,
  HarvestWebhookSubscription,
} from "./types.js";

const HARVEST_BASE_URL = "https://api.harvestapp.com/v2";

/**
 * Harvest API v2 client.
 *
 * Time tracking and invoicing platform with projects, clients,
 * invoices, and expenses.
 *
 * Uses OAuth2 authentication with Harvest-Account-Id header.
 */
export class HarvestClient extends BaseIntegrationClient {
  constructor(config: HarvestClientConfig) {
    super({
      baseUrl: HARVEST_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 100 },
      defaultHeaders: {
        "Harvest-Account-Id": config.accountId,
      },
    });
  }

  // ==================== Time Entries ====================

  /** List time entries with optional filters. */
  async listTimeEntries(
    params?: HarvestTimeEntryListParams
  ): Promise<ApiResponse<{ time_entries: HarvestTimeEntry[] }>> {
    const queryParams: Record<string, string> = {};
    if (params?.user_id != null) queryParams.user_id = String(params.user_id);
    if (params?.client_id != null) queryParams.client_id = String(params.client_id);
    if (params?.project_id != null) queryParams.project_id = String(params.project_id);
    if (params?.task_id != null) queryParams.task_id = String(params.task_id);
    if (params?.is_billed != null) queryParams.is_billed = String(params.is_billed);
    if (params?.is_running != null) queryParams.is_running = String(params.is_running);
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;
    if (params?.page != null) queryParams.page = String(params.page);
    if (params?.per_page != null) queryParams.per_page = String(params.per_page);
    if (params?.updated_since) queryParams.updated_since = params.updated_since;

    return this.get<{ time_entries: HarvestTimeEntry[] }>("/time_entries", queryParams);
  }

  /** Get a time entry by ID. */
  async getTimeEntry(entryId: number): Promise<ApiResponse<HarvestTimeEntry>> {
    return this.get<HarvestTimeEntry>(`/time_entries/${entryId}`);
  }

  /** Create a new time entry. */
  async createTimeEntry(
    data: HarvestCreateTimeEntryRequest
  ): Promise<ApiResponse<HarvestTimeEntry>> {
    return this.post<HarvestTimeEntry>("/time_entries", data);
  }

  /** Update a time entry. */
  async updateTimeEntry(
    entryId: number,
    data: HarvestUpdateTimeEntryRequest
  ): Promise<ApiResponse<HarvestTimeEntry>> {
    return this.patch<HarvestTimeEntry>(`/time_entries/${entryId}`, data);
  }

  /** Delete a time entry. */
  async deleteTimeEntry(entryId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/time_entries/${entryId}`);
  }

  /** Stop a running time entry. */
  async stopTimeEntry(entryId: number): Promise<ApiResponse<HarvestTimeEntry>> {
    return this.patch<HarvestTimeEntry>(`/time_entries/${entryId}/stop`);
  }

  /** Restart a stopped time entry. */
  async restartTimeEntry(entryId: number): Promise<ApiResponse<HarvestTimeEntry>> {
    return this.patch<HarvestTimeEntry>(`/time_entries/${entryId}/restart`);
  }

  // ==================== Projects ====================

  /** List projects. */
  async listProjects(
    params?: { client_id?: number; is_active?: boolean; page?: number; per_page?: number }
  ): Promise<ApiResponse<{ projects: HarvestProject[] }>> {
    const queryParams: Record<string, string> = {};
    if (params?.client_id != null) queryParams.client_id = String(params.client_id);
    if (params?.is_active != null) queryParams.is_active = String(params.is_active);
    if (params?.page != null) queryParams.page = String(params.page);
    if (params?.per_page != null) queryParams.per_page = String(params.per_page);

    return this.get<{ projects: HarvestProject[] }>("/projects", queryParams);
  }

  /** Get a project by ID. */
  async getProject(projectId: number): Promise<ApiResponse<HarvestProject>> {
    return this.get<HarvestProject>(`/projects/${projectId}`);
  }

  /** Create a new project. */
  async createProject(
    data: HarvestCreateProjectRequest
  ): Promise<ApiResponse<HarvestProject>> {
    return this.post<HarvestProject>("/projects", data);
  }

  /** Update a project. */
  async updateProject(
    projectId: number,
    data: Partial<HarvestCreateProjectRequest>
  ): Promise<ApiResponse<HarvestProject>> {
    return this.patch<HarvestProject>(`/projects/${projectId}`, data);
  }

  /** Delete a project. */
  async deleteProject(projectId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/projects/${projectId}`);
  }

  // ==================== Clients ====================

  /** List clients. */
  async listClients(
    params?: { is_active?: boolean; page?: number; per_page?: number }
  ): Promise<ApiResponse<{ clients: HarvestClientRecord[] }>> {
    const queryParams: Record<string, string> = {};
    if (params?.is_active != null) queryParams.is_active = String(params.is_active);
    if (params?.page != null) queryParams.page = String(params.page);
    if (params?.per_page != null) queryParams.per_page = String(params.per_page);

    return this.get<{ clients: HarvestClientRecord[] }>("/clients", queryParams);
  }

  /** Get a client by ID. */
  async getClient(clientId: number): Promise<ApiResponse<HarvestClientRecord>> {
    return this.get<HarvestClientRecord>(`/clients/${clientId}`);
  }

  /** Create a new client. */
  async createClient(
    data: HarvestCreateClientRequest
  ): Promise<ApiResponse<HarvestClientRecord>> {
    return this.post<HarvestClientRecord>("/clients", data);
  }

  /** Update a client. */
  async updateClient(
    clientId: number,
    data: Partial<HarvestCreateClientRequest>
  ): Promise<ApiResponse<HarvestClientRecord>> {
    return this.patch<HarvestClientRecord>(`/clients/${clientId}`, data);
  }

  /** Delete a client. */
  async deleteClient(clientId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/clients/${clientId}`);
  }

  // ==================== Invoices ====================

  /** List invoices. */
  async listInvoices(
    params?: { client_id?: number; state?: string; from?: string; to?: string; page?: number; per_page?: number }
  ): Promise<ApiResponse<{ invoices: HarvestInvoice[] }>> {
    const queryParams: Record<string, string> = {};
    if (params?.client_id != null) queryParams.client_id = String(params.client_id);
    if (params?.state) queryParams.state = params.state;
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;
    if (params?.page != null) queryParams.page = String(params.page);
    if (params?.per_page != null) queryParams.per_page = String(params.per_page);

    return this.get<{ invoices: HarvestInvoice[] }>("/invoices", queryParams);
  }

  /** Get an invoice by ID. */
  async getInvoice(invoiceId: number): Promise<ApiResponse<HarvestInvoice>> {
    return this.get<HarvestInvoice>(`/invoices/${invoiceId}`);
  }

  /** Create a new invoice. */
  async createInvoice(
    data: HarvestCreateInvoiceRequest
  ): Promise<ApiResponse<HarvestInvoice>> {
    return this.post<HarvestInvoice>("/invoices", data);
  }

  /** Update an invoice. */
  async updateInvoice(
    invoiceId: number,
    data: Partial<HarvestCreateInvoiceRequest>
  ): Promise<ApiResponse<HarvestInvoice>> {
    return this.patch<HarvestInvoice>(`/invoices/${invoiceId}`, data);
  }

  /** Delete an invoice. */
  async deleteInvoice(invoiceId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/invoices/${invoiceId}`);
  }

  // ==================== Expenses ====================

  /** List expenses. */
  async listExpenses(
    params?: { user_id?: number; client_id?: number; project_id?: number; is_billed?: boolean; from?: string; to?: string; page?: number }
  ): Promise<ApiResponse<{ expenses: HarvestExpense[] }>> {
    const queryParams: Record<string, string> = {};
    if (params?.user_id != null) queryParams.user_id = String(params.user_id);
    if (params?.client_id != null) queryParams.client_id = String(params.client_id);
    if (params?.project_id != null) queryParams.project_id = String(params.project_id);
    if (params?.is_billed != null) queryParams.is_billed = String(params.is_billed);
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;
    if (params?.page != null) queryParams.page = String(params.page);

    return this.get<{ expenses: HarvestExpense[] }>("/expenses", queryParams);
  }

  /** Create a new expense. */
  async createExpense(
    data: HarvestCreateExpenseRequest
  ): Promise<ApiResponse<HarvestExpense>> {
    return this.post<HarvestExpense>("/expenses", data);
  }

  /** Delete an expense. */
  async deleteExpense(expenseId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/expenses/${expenseId}`);
  }

  // ==================== Users ====================

  /** Get the current authenticated user. */
  async getMe(): Promise<ApiResponse<HarvestUser>> {
    return this.get<HarvestUser>("/users/me");
  }

  /** List users. */
  async listUsers(
    params?: { is_active?: boolean; page?: number }
  ): Promise<ApiResponse<{ users: HarvestUser[] }>> {
    const queryParams: Record<string, string> = {};
    if (params?.is_active != null) queryParams.is_active = String(params.is_active);
    if (params?.page != null) queryParams.page = String(params.page);

    return this.get<{ users: HarvestUser[] }>("/users", queryParams);
  }

  // ==================== Webhooks ====================

  /** List webhook subscriptions. */
  async listWebhookSubscriptions(): Promise<
    ApiResponse<{ webhooks: HarvestWebhookSubscription[] }>
  > {
    return this.get<{ webhooks: HarvestWebhookSubscription[] }>("/webhooks");
  }

  /** Create a webhook subscription. */
  async createWebhookSubscription(
    data: { name: string; events: string[]; webhook_url: string }
  ): Promise<ApiResponse<HarvestWebhookSubscription>> {
    return this.post<HarvestWebhookSubscription>("/webhooks", data);
  }

  /** Delete a webhook subscription. */
  async deleteWebhookSubscription(
    webhookId: number
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(`/webhooks/${webhookId}`);
  }

  // ==================== Connection Test ====================

  /** Verify credentials by fetching the current user. */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.getMe();
      return response.status === 200 && !!response.data.id;
    } catch {
      return false;
    }
  }
}

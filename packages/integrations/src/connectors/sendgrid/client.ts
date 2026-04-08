import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  SendGridClientConfig,
  SendGridSendEmailRequest,
  SendGridTemplate,
  SendGridListTemplatesResponse,
  SendGridCreateTemplateRequest,
  SendGridCreateTemplateVersionRequest,
  SendGridTemplateVersion,
  SendGridContact,
  SendGridUpsertContactsRequest,
  SendGridUpsertContactsResponse,
  SendGridSearchContactsRequest,
  SendGridSearchContactsResponse,
  SendGridDeleteContactsResponse,
  SendGridContactList,
  SendGridListContactListsResponse,
  SendGridGlobalStats,
  SendGridStatsParams,
  SendGridCategoryStatsParams,
} from "./types.js";

/**
 * SendGrid API v3 client.
 *
 * Supports: sending email, template management, contact management, and statistics.
 * Auth: Bearer token (API key).
 * Rate limit: 600 RPM default.
 */
export class SendGridClient extends BaseIntegrationClient {
  constructor(config: SendGridClientConfig) {
    super({
      baseUrl: "https://api.sendgrid.com/v3",
      authType: "api_key",
      credentials: { apiKey: config.apiKey },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 600 },
    });
  }

  // ==================== Send Email ====================

  /**
   * Send an email via SendGrid v3/mail/send.
   * Returns 202 Accepted on success (empty body).
   */
  async sendEmail(
    email: SendGridSendEmailRequest
  ): Promise<ApiResponse<Record<string, never>>> {
    return this.post<Record<string, never>>("/mail/send", email);
  }

  // ==================== Templates ====================

  /** List all transactional templates. */
  async listTemplates(
    params?: { generations?: "legacy" | "dynamic"; page_size?: number }
  ): Promise<ApiResponse<SendGridListTemplatesResponse>> {
    const queryParams: Record<string, string> = {};
    if (params?.generations) queryParams.generations = params.generations;
    if (params?.page_size) queryParams.page_size = String(params.page_size);
    return this.get<SendGridListTemplatesResponse>("/templates", queryParams);
  }

  /** Get a single template by ID (includes versions). */
  async getTemplate(
    templateId: string
  ): Promise<ApiResponse<SendGridTemplate>> {
    return this.get<SendGridTemplate>(`/templates/${templateId}`);
  }

  /** Create a new transactional template. */
  async createTemplate(
    data: SendGridCreateTemplateRequest
  ): Promise<ApiResponse<SendGridTemplate>> {
    return this.post<SendGridTemplate>("/templates", data);
  }

  /** Update a template name. */
  async updateTemplate(
    templateId: string,
    data: { name: string }
  ): Promise<ApiResponse<SendGridTemplate>> {
    return this.patch<SendGridTemplate>(`/templates/${templateId}`, data);
  }

  /** Delete a template. */
  async deleteTemplate(templateId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/templates/${templateId}`);
  }

  /** Create a new version under a template. */
  async createTemplateVersion(
    templateId: string,
    data: SendGridCreateTemplateVersionRequest
  ): Promise<ApiResponse<SendGridTemplateVersion>> {
    return this.post<SendGridTemplateVersion>(
      `/templates/${templateId}/versions`,
      data
    );
  }

  /** Activate a specific template version. */
  async activateTemplateVersion(
    templateId: string,
    versionId: string
  ): Promise<ApiResponse<SendGridTemplateVersion>> {
    return this.post<SendGridTemplateVersion>(
      `/templates/${templateId}/versions/${versionId}/activate`
    );
  }

  /** Delete a template version. */
  async deleteTemplateVersion(
    templateId: string,
    versionId: string
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(
      `/templates/${templateId}/versions/${versionId}`
    );
  }

  // ==================== Contacts (Marketing) ====================

  /** Add or update contacts. Returns a job_id for async processing. */
  async upsertContacts(
    data: SendGridUpsertContactsRequest
  ): Promise<ApiResponse<SendGridUpsertContactsResponse>> {
    return this.put<SendGridUpsertContactsResponse>(
      "/marketing/contacts",
      data
    );
  }

  /** Search contacts using SGQL query syntax. */
  async searchContacts(
    data: SendGridSearchContactsRequest
  ): Promise<ApiResponse<SendGridSearchContactsResponse>> {
    return this.post<SendGridSearchContactsResponse>(
      "/marketing/contacts/search",
      data
    );
  }

  /** Get a single contact by ID. */
  async getContact(contactId: string): Promise<ApiResponse<SendGridContact>> {
    return this.get<SendGridContact>(`/marketing/contacts/${contactId}`);
  }

  /** Delete contacts by IDs. Returns a job_id. */
  async deleteContacts(
    ids: string[]
  ): Promise<ApiResponse<SendGridDeleteContactsResponse>> {
    return this.delete<SendGridDeleteContactsResponse>(
      `/marketing/contacts?ids=${ids.join(",")}`
    );
  }

  /** Get total contact count. */
  async getContactCount(): Promise<ApiResponse<{ contact_count: number }>> {
    return this.get<{ contact_count: number }>("/marketing/contacts/count");
  }

  /** List all contact lists. */
  async listContactLists(
    params?: { page_size?: number }
  ): Promise<ApiResponse<SendGridListContactListsResponse>> {
    const queryParams: Record<string, string> = {};
    if (params?.page_size) queryParams.page_size = String(params.page_size);
    return this.get<SendGridListContactListsResponse>(
      "/marketing/lists",
      queryParams
    );
  }

  /** Create a new contact list. */
  async createContactList(
    data: { name: string }
  ): Promise<ApiResponse<SendGridContactList>> {
    return this.post<SendGridContactList>("/marketing/lists", data);
  }

  /** Delete a contact list. */
  async deleteContactList(listId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/marketing/lists/${listId}`);
  }

  // ==================== Stats ====================

  /** Get global email statistics. */
  async getGlobalStats(
    params: SendGridStatsParams
  ): Promise<ApiResponse<SendGridGlobalStats[]>> {
    const queryParams: Record<string, string> = {
      start_date: params.start_date,
    };
    if (params.end_date) queryParams.end_date = params.end_date;
    if (params.aggregated_by) queryParams.aggregated_by = params.aggregated_by;
    return this.get<SendGridGlobalStats[]>("/stats", queryParams);
  }

  /** Get stats grouped by category. */
  async getCategoryStats(
    params: SendGridCategoryStatsParams
  ): Promise<ApiResponse<SendGridGlobalStats[]>> {
    const queryParams: Record<string, string> = {
      start_date: params.start_date,
      categories: params.categories,
    };
    if (params.end_date) queryParams.end_date = params.end_date;
    if (params.aggregated_by) queryParams.aggregated_by = params.aggregated_by;
    return this.get<SendGridGlobalStats[]>("/categories/stats", queryParams);
  }

  // ==================== Connection Test ====================

  /** Verify credentials by fetching the authenticated user's scopes. */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.get<{ scopes: string[] }>("/scopes");
      return response.status === 200 && Array.isArray(response.data.scopes);
    } catch {
      return false;
    }
  }
}

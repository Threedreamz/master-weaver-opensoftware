import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  BrevoClientConfig,
  BrevoSendEmailRequest,
  BrevoSendEmailResponse,
  BrevoContact,
  BrevoCreateContactRequest,
  BrevoCreateContactResponse,
  BrevoUpdateContactRequest,
  BrevoListContactsResponse,
  BrevoListContactsParams,
  BrevoContactList,
  BrevoListContactListsResponse,
  BrevoCreateContactListRequest,
  BrevoCreateContactListResponse,
  BrevoCampaign,
  BrevoListCampaignsResponse,
  BrevoListCampaignsParams,
  BrevoCreateCampaignRequest,
  BrevoCreateCampaignResponse,
  BrevoTemplate,
  BrevoListTemplatesResponse,
  BrevoListTemplatesParams,
  BrevoCreateTemplateRequest,
  BrevoCreateTemplateResponse,
  BrevoUpdateTemplateRequest,
} from "./types.js";

/**
 * Brevo (formerly Sendinblue) API v3 client.
 *
 * Supports: transactional email, contacts, campaigns, templates.
 * Auth: api-key header.
 * Rate limit: 100 RPM default.
 */
export class BrevoClient extends BaseIntegrationClient {
  constructor(config: BrevoClientConfig) {
    super({
      baseUrl: "https://api.brevo.com/v3",
      authType: "api_key",
      credentials: {
        headerName: "api-key",
        apiKey: config.apiKey,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 100 },
    });
  }

  // ==================== Send Transactional Email ====================

  /** Send a transactional email. */
  async sendTransactionalEmail(
    params: BrevoSendEmailRequest
  ): Promise<ApiResponse<BrevoSendEmailResponse>> {
    return this.post<BrevoSendEmailResponse>("/smtp/email", params);
  }

  // ==================== Contacts ====================

  /** List contacts. */
  async listContacts(
    params?: BrevoListContactsParams
  ): Promise<ApiResponse<BrevoListContactsResponse>> {
    const queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.modifiedSince) queryParams.modifiedSince = params.modifiedSince;
    if (params?.sort) queryParams.sort = params.sort;
    return this.get<BrevoListContactsResponse>("/contacts", queryParams);
  }

  /** Get a single contact by email or ID. */
  async getContact(
    identifier: string | number
  ): Promise<ApiResponse<BrevoContact>> {
    return this.get<BrevoContact>(
      `/contacts/${encodeURIComponent(String(identifier))}`
    );
  }

  /** Create a new contact. */
  async createContact(
    data: BrevoCreateContactRequest
  ): Promise<ApiResponse<BrevoCreateContactResponse>> {
    return this.post<BrevoCreateContactResponse>("/contacts", data);
  }

  /** Update an existing contact. */
  async updateContact(
    identifier: string | number,
    data: BrevoUpdateContactRequest
  ): Promise<ApiResponse<void>> {
    return this.put<void>(
      `/contacts/${encodeURIComponent(String(identifier))}`,
      data
    );
  }

  /** Delete a contact by email or ID. */
  async deleteContact(
    identifier: string | number
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(
      `/contacts/${encodeURIComponent(String(identifier))}`
    );
  }

  /** Import contacts (batch create/update). */
  async importContacts(
    data: {
      fileBody?: string;
      fileUrl?: string;
      listIds?: number[];
      notifyUrl?: string;
      newList?: { listName: string; folderId: number };
      emailBlacklist?: boolean;
      smsBlacklist?: boolean;
      updateExistingContacts?: boolean;
      emptyContactsAttributes?: boolean;
    }
  ): Promise<ApiResponse<{ processId: number }>> {
    return this.post<{ processId: number }>("/contacts/import", data);
  }

  // ==================== Contact Lists ====================

  /** List all contact lists. */
  async listContactLists(
    params?: { limit?: number; offset?: number; sort?: "asc" | "desc" }
  ): Promise<ApiResponse<BrevoListContactListsResponse>> {
    const queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.sort) queryParams.sort = params.sort;
    return this.get<BrevoListContactListsResponse>("/contacts/lists", queryParams);
  }

  /** Get a single list by ID. */
  async getContactList(
    listId: number
  ): Promise<ApiResponse<BrevoContactList>> {
    return this.get<BrevoContactList>(`/contacts/lists/${listId}`);
  }

  /** Create a new contact list. */
  async createContactList(
    data: BrevoCreateContactListRequest
  ): Promise<ApiResponse<BrevoCreateContactListResponse>> {
    return this.post<BrevoCreateContactListResponse>("/contacts/lists", data);
  }

  /** Update a contact list name. */
  async updateContactList(
    listId: number,
    data: { name?: string; folderId?: number }
  ): Promise<ApiResponse<void>> {
    return this.put<void>(`/contacts/lists/${listId}`, data);
  }

  /** Delete a contact list. */
  async deleteContactList(listId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/contacts/lists/${listId}`);
  }

  /** Add contacts to a list. */
  async addContactsToList(
    listId: number,
    data: { emails?: string[]; ids?: number[] }
  ): Promise<ApiResponse<{ contacts: { success: string[]; failure: string[] } }>> {
    return this.post<{ contacts: { success: string[]; failure: string[] } }>(
      `/contacts/lists/${listId}/contacts/add`,
      data
    );
  }

  /** Remove contacts from a list. */
  async removeContactsFromList(
    listId: number,
    data: { emails?: string[]; ids?: number[] }
  ): Promise<ApiResponse<{ contacts: { success: string[]; failure: string[] } }>> {
    return this.post<{ contacts: { success: string[]; failure: string[] } }>(
      `/contacts/lists/${listId}/contacts/remove`,
      data
    );
  }

  // ==================== Campaigns ====================

  /** List email campaigns. */
  async listCampaigns(
    params?: BrevoListCampaignsParams
  ): Promise<ApiResponse<BrevoListCampaignsResponse>> {
    const queryParams: Record<string, string> = {};
    if (params?.type) queryParams.type = params.type;
    if (params?.status) queryParams.status = params.status;
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.sort) queryParams.sort = params.sort;
    return this.get<BrevoListCampaignsResponse>(
      "/emailCampaigns",
      queryParams
    );
  }

  /** Get a single campaign by ID. */
  async getCampaign(
    campaignId: number
  ): Promise<ApiResponse<BrevoCampaign>> {
    return this.get<BrevoCampaign>(`/emailCampaigns/${campaignId}`);
  }

  /** Create a new email campaign (draft). */
  async createCampaign(
    data: BrevoCreateCampaignRequest
  ): Promise<ApiResponse<BrevoCreateCampaignResponse>> {
    return this.post<BrevoCreateCampaignResponse>("/emailCampaigns", data);
  }

  /** Update a campaign. */
  async updateCampaign(
    campaignId: number,
    data: Partial<BrevoCreateCampaignRequest>
  ): Promise<ApiResponse<void>> {
    return this.put<void>(`/emailCampaigns/${campaignId}`, data);
  }

  /** Delete a campaign. */
  async deleteCampaign(campaignId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/emailCampaigns/${campaignId}`);
  }

  /** Send a campaign immediately. */
  async sendCampaignNow(campaignId: number): Promise<ApiResponse<void>> {
    return this.post<void>(`/emailCampaigns/${campaignId}/sendNow`);
  }

  /** Send a test email for a campaign. */
  async sendTestCampaign(
    campaignId: number,
    data: { emailTo: string[] }
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/emailCampaigns/${campaignId}/sendTest`, data);
  }

  // ==================== Templates ====================

  /** List SMTP templates. */
  async listTemplates(
    params?: BrevoListTemplatesParams
  ): Promise<ApiResponse<BrevoListTemplatesResponse>> {
    const queryParams: Record<string, string> = {};
    if (params?.templateStatus !== undefined)
      queryParams.templateStatus = String(params.templateStatus);
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.sort) queryParams.sort = params.sort;
    return this.get<BrevoListTemplatesResponse>(
      "/smtp/templates",
      queryParams
    );
  }

  /** Get a single template by ID. */
  async getTemplate(
    templateId: number
  ): Promise<ApiResponse<BrevoTemplate>> {
    return this.get<BrevoTemplate>(`/smtp/templates/${templateId}`);
  }

  /** Create a new SMTP template. */
  async createTemplate(
    data: BrevoCreateTemplateRequest
  ): Promise<ApiResponse<BrevoCreateTemplateResponse>> {
    return this.post<BrevoCreateTemplateResponse>("/smtp/templates", data);
  }

  /** Update an existing SMTP template. */
  async updateTemplate(
    templateId: number,
    data: BrevoUpdateTemplateRequest
  ): Promise<ApiResponse<void>> {
    return this.put<void>(`/smtp/templates/${templateId}`, data);
  }

  /** Delete an SMTP template. */
  async deleteTemplate(templateId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/smtp/templates/${templateId}`);
  }

  /** Send a test email for a template. */
  async sendTestTemplate(
    templateId: number,
    data: { emailTo: string[] }
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/smtp/templates/${templateId}/sendTest`, data);
  }

  // ==================== Account ====================

  /** Get account details. */
  async getAccount(): Promise<
    ApiResponse<{
      email: string;
      firstName: string;
      lastName: string;
      companyName: string;
      plan: Array<{ type: string; credits: number; creditType: string }>;
    }>
  > {
    return this.get("/account");
  }

  // ==================== Connection Test ====================

  /** Verify credentials by fetching account info. */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.getAccount();
      return response.status === 200 && !!response.data.email;
    } catch {
      return false;
    }
  }
}

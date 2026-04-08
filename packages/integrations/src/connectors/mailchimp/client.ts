import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type {
  MailchimpClientConfig,
  MailchimpList,
  MailchimpListsResponse,
  MailchimpMember,
  MailchimpMembersResponse,
  MailchimpCreateMemberInput,
  MailchimpUpdateMemberInput,
  MailchimpCampaign,
  MailchimpCampaignsResponse,
  MailchimpCreateCampaignInput,
  MailchimpUpdateCampaignInput,
  MailchimpCampaignContent,
  MailchimpSetCampaignContentInput,
  MailchimpTemplate,
  MailchimpTemplatesResponse,
  MailchimpCreateTemplateInput,
  MailchimpCampaignReport,
  MailchimpReportsResponse,
  MailchimpPaginationParams,
} from "./types.js";
import { createHash } from "node:crypto";

/**
 * Mailchimp Marketing API v3 client.
 *
 * Uses API key authentication via HTTP Basic Auth ("anystring:<api-key>").
 * The server prefix (e.g., "us1") is extracted from the API key automatically.
 *
 * @see https://mailchimp.com/developer/marketing/api/
 */
export class MailchimpClient extends BaseIntegrationClient {
  constructor(config: MailchimpClientConfig) {
    const serverPrefix = config.serverPrefix ?? MailchimpClient.extractServerPrefix(config.apiKey);

    super({
      baseUrl: `https://${serverPrefix}.api.mailchimp.com/3.0`,
      authType: "basic_auth",
      credentials: {
        username: "anystring",
        password: config.apiKey,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 10, burstSize: 10 },
    });
  }

  /**
   * Extract the data center prefix from a Mailchimp API key.
   * API keys are formatted as: "xxxxx-us1" where "us1" is the server prefix.
   */
  static extractServerPrefix(apiKey: string): string {
    const parts = apiKey.split("-");
    const prefix = parts[parts.length - 1];
    if (!prefix || !/^[a-z]{2}\d+$/.test(prefix)) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        "Invalid Mailchimp API key format. Expected format: 'key-serverprefix' (e.g., 'abc123-us1')"
      );
    }
    return prefix;
  }

  /**
   * Calculate the MD5 hash of an email address (used as subscriber ID).
   */
  static subscriberHash(email: string): string {
    return createHash("md5").update(email.toLowerCase().trim()).digest("hex");
  }

  // ==================== Lists / Audiences ====================

  /** Get all lists/audiences. */
  async getLists(params?: MailchimpPaginationParams): Promise<MailchimpListsResponse> {
    const queryParams = this.paginationToParams(params);
    const response = await this.get<MailchimpListsResponse>("/lists", queryParams);
    return response.data;
  }

  /** Get a single list by ID. */
  async getList(listId: string): Promise<MailchimpList> {
    const response = await this.get<MailchimpList>(`/lists/${listId}`);
    return response.data;
  }

  // ==================== Members / Subscribers ====================

  /** Get members from a list. */
  async getMembers(
    listId: string,
    params?: MailchimpPaginationParams & { status?: string }
  ): Promise<MailchimpMembersResponse> {
    const queryParams = this.paginationToParams(params);
    if (params?.status) queryParams.status = params.status;
    const response = await this.get<MailchimpMembersResponse>(
      `/lists/${listId}/members`,
      queryParams
    );
    return response.data;
  }

  /** Get a single member by email or subscriber hash. */
  async getMember(listId: string, emailOrHash: string): Promise<MailchimpMember> {
    const hash = emailOrHash.includes("@")
      ? MailchimpClient.subscriberHash(emailOrHash)
      : emailOrHash;
    const response = await this.get<MailchimpMember>(`/lists/${listId}/members/${hash}`);
    return response.data;
  }

  /** Add a new member to a list. */
  async createMember(
    listId: string,
    input: MailchimpCreateMemberInput
  ): Promise<MailchimpMember> {
    const response = await this.post<MailchimpMember>(`/lists/${listId}/members`, input);
    return response.data;
  }

  /** Update an existing member. */
  async updateMember(
    listId: string,
    emailOrHash: string,
    input: MailchimpUpdateMemberInput
  ): Promise<MailchimpMember> {
    const hash = emailOrHash.includes("@")
      ? MailchimpClient.subscriberHash(emailOrHash)
      : emailOrHash;
    const response = await this.patch<MailchimpMember>(
      `/lists/${listId}/members/${hash}`,
      input
    );
    return response.data;
  }

  /**
   * Add or update a member (upsert).
   * Uses PUT which creates the member if they don't exist.
   */
  async upsertMember(
    listId: string,
    email: string,
    input: MailchimpCreateMemberInput
  ): Promise<MailchimpMember> {
    const hash = MailchimpClient.subscriberHash(email);
    const body = { ...input, email_address: email };
    const response = await this.put<MailchimpMember>(
      `/lists/${listId}/members/${hash}`,
      body
    );
    return response.data;
  }

  /** Delete a member from a list permanently. */
  async deleteMember(listId: string, emailOrHash: string): Promise<void> {
    const hash = emailOrHash.includes("@")
      ? MailchimpClient.subscriberHash(emailOrHash)
      : emailOrHash;
    await this.post(`/lists/${listId}/members/${hash}/actions/delete-permanent`);
  }

  /** Archive a member (soft delete). */
  async archiveMember(listId: string, emailOrHash: string): Promise<void> {
    const hash = emailOrHash.includes("@")
      ? MailchimpClient.subscriberHash(emailOrHash)
      : emailOrHash;
    await this.delete(`/lists/${listId}/members/${hash}`);
  }

  /** Add tags to a member. */
  async addMemberTags(
    listId: string,
    emailOrHash: string,
    tags: string[]
  ): Promise<void> {
    const hash = emailOrHash.includes("@")
      ? MailchimpClient.subscriberHash(emailOrHash)
      : emailOrHash;
    await this.post(`/lists/${listId}/members/${hash}/tags`, {
      tags: tags.map((name) => ({ name, status: "active" })),
    });
  }

  /** Remove tags from a member. */
  async removeMemberTags(
    listId: string,
    emailOrHash: string,
    tags: string[]
  ): Promise<void> {
    const hash = emailOrHash.includes("@")
      ? MailchimpClient.subscriberHash(emailOrHash)
      : emailOrHash;
    await this.post(`/lists/${listId}/members/${hash}/tags`, {
      tags: tags.map((name) => ({ name, status: "inactive" })),
    });
  }

  // ==================== Campaigns ====================

  /** Get all campaigns. */
  async getCampaigns(
    params?: MailchimpPaginationParams & { status?: string; list_id?: string }
  ): Promise<MailchimpCampaignsResponse> {
    const queryParams = this.paginationToParams(params);
    if (params?.status) queryParams.status = params.status;
    if (params?.list_id) queryParams.list_id = params.list_id;
    const response = await this.get<MailchimpCampaignsResponse>("/campaigns", queryParams);
    return response.data;
  }

  /** Get a single campaign by ID. */
  async getCampaign(campaignId: string): Promise<MailchimpCampaign> {
    const response = await this.get<MailchimpCampaign>(`/campaigns/${campaignId}`);
    return response.data;
  }

  /** Create a new campaign. */
  async createCampaign(input: MailchimpCreateCampaignInput): Promise<MailchimpCampaign> {
    const response = await this.post<MailchimpCampaign>("/campaigns", input);
    return response.data;
  }

  /** Update a campaign. */
  async updateCampaign(
    campaignId: string,
    input: MailchimpUpdateCampaignInput
  ): Promise<MailchimpCampaign> {
    const response = await this.patch<MailchimpCampaign>(
      `/campaigns/${campaignId}`,
      input
    );
    return response.data;
  }

  /** Delete a campaign. */
  async deleteCampaign(campaignId: string): Promise<void> {
    await this.delete(`/campaigns/${campaignId}`);
  }

  /** Send a campaign immediately. */
  async sendCampaign(campaignId: string): Promise<void> {
    await this.post(`/campaigns/${campaignId}/actions/send`);
  }

  /** Schedule a campaign. */
  async scheduleCampaign(campaignId: string, scheduleTime: string): Promise<void> {
    await this.post(`/campaigns/${campaignId}/actions/schedule`, {
      schedule_time: scheduleTime,
    });
  }

  /** Unschedule a campaign. */
  async unscheduleCampaign(campaignId: string): Promise<void> {
    await this.post(`/campaigns/${campaignId}/actions/unschedule`);
  }

  /** Cancel a sending campaign. */
  async cancelCampaign(campaignId: string): Promise<void> {
    await this.post(`/campaigns/${campaignId}/actions/cancel-send`);
  }

  /** Get campaign content. */
  async getCampaignContent(campaignId: string): Promise<MailchimpCampaignContent> {
    const response = await this.get<MailchimpCampaignContent>(
      `/campaigns/${campaignId}/content`
    );
    return response.data;
  }

  /** Set campaign content. */
  async setCampaignContent(
    campaignId: string,
    input: MailchimpSetCampaignContentInput
  ): Promise<MailchimpCampaignContent> {
    const response = await this.put<MailchimpCampaignContent>(
      `/campaigns/${campaignId}/content`,
      input
    );
    return response.data;
  }

  // ==================== Templates ====================

  /** Get all templates. */
  async getTemplates(
    params?: MailchimpPaginationParams & { type?: string }
  ): Promise<MailchimpTemplatesResponse> {
    const queryParams = this.paginationToParams(params);
    if (params?.type) queryParams.type = params.type;
    const response = await this.get<MailchimpTemplatesResponse>("/templates", queryParams);
    return response.data;
  }

  /** Get a single template by ID. */
  async getTemplate(templateId: number): Promise<MailchimpTemplate> {
    const response = await this.get<MailchimpTemplate>(`/templates/${templateId}`);
    return response.data;
  }

  /** Create a new template. */
  async createTemplate(input: MailchimpCreateTemplateInput): Promise<MailchimpTemplate> {
    const response = await this.post<MailchimpTemplate>("/templates", input);
    return response.data;
  }

  /** Update a template. */
  async updateTemplate(
    templateId: number,
    input: Partial<MailchimpCreateTemplateInput>
  ): Promise<MailchimpTemplate> {
    const response = await this.patch<MailchimpTemplate>(
      `/templates/${templateId}`,
      input
    );
    return response.data;
  }

  /** Delete a template. */
  async deleteTemplate(templateId: number): Promise<void> {
    await this.delete(`/templates/${templateId}`);
  }

  // ==================== Reports ====================

  /** Get reports for all campaigns. */
  async getReports(params?: MailchimpPaginationParams): Promise<MailchimpReportsResponse> {
    const queryParams = this.paginationToParams(params);
    const response = await this.get<MailchimpReportsResponse>("/reports", queryParams);
    return response.data;
  }

  /** Get report for a specific campaign. */
  async getCampaignReport(campaignId: string): Promise<MailchimpCampaignReport> {
    const response = await this.get<MailchimpCampaignReport>(`/reports/${campaignId}`);
    return response.data;
  }

  // ==================== Connection Test ====================

  /** Test the connection by fetching the API root (ping). */
  async testConnection(): Promise<boolean> {
    try {
      await this.get("/ping");
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Helpers ====================

  private paginationToParams(
    params?: MailchimpPaginationParams
  ): Record<string, string> {
    const result: Record<string, string> = {};
    if (params?.offset !== undefined) result.offset = String(params.offset);
    if (params?.count !== undefined) result.count = String(params.count);
    if (params?.sort_field) result.sort_field = params.sort_field;
    if (params?.sort_dir) result.sort_dir = params.sort_dir;
    return result;
  }
}

import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  PostmarkClientConfig,
  PostmarkSendEmailRequest,
  PostmarkSendEmailResponse,
  PostmarkSendBatchEmailRequest,
  PostmarkSendBatchEmailResponse,
  PostmarkSendTemplateEmailRequest,
  PostmarkSendTemplateEmailResponse,
  PostmarkTemplate,
  PostmarkListTemplatesResponse,
  PostmarkCreateTemplateRequest,
  PostmarkUpdateTemplateRequest,
  PostmarkValidateTemplateRequest,
  PostmarkValidateTemplateResponse,
  PostmarkBounce,
  PostmarkBouncesResponse,
  PostmarkBounceDump,
  PostmarkDeliveryStats,
  PostmarkOutboundStats,
  PostmarkStatsDays,
  PostmarkStatsParams,
} from "./types.js";

/**
 * Postmark API client.
 *
 * Supports: sending email, templates, bounce management, statistics.
 * Auth: X-Postmark-Server-Token header.
 * Rate limit: 300 RPM default.
 */
export class PostmarkClient extends BaseIntegrationClient {
  constructor(config: PostmarkClientConfig) {
    super({
      baseUrl: "https://api.postmarkapp.com",
      authType: "api_key",
      credentials: {
        headerName: "X-Postmark-Server-Token",
        apiKey: config.serverToken,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 300 },
      defaultHeaders: {
        Accept: "application/json",
      },
    });
  }

  // ==================== Send Email ====================

  /** Send a single email. */
  async sendEmail(
    params: PostmarkSendEmailRequest
  ): Promise<ApiResponse<PostmarkSendEmailResponse>> {
    return this.post<PostmarkSendEmailResponse>("/email", params);
  }

  /** Send a batch of up to 500 emails. */
  async sendBatchEmail(
    params: PostmarkSendBatchEmailRequest
  ): Promise<ApiResponse<PostmarkSendBatchEmailResponse>> {
    return this.post<PostmarkSendBatchEmailResponse>(
      "/email/batch",
      params.Messages
    );
  }

  /** Send an email using a template. */
  async sendTemplateEmail(
    params: PostmarkSendTemplateEmailRequest
  ): Promise<ApiResponse<PostmarkSendTemplateEmailResponse>> {
    return this.post<PostmarkSendTemplateEmailResponse>(
      "/email/withTemplate",
      params
    );
  }

  /** Send a batch of templated emails. */
  async sendBatchTemplateEmail(
    messages: PostmarkSendTemplateEmailRequest[]
  ): Promise<ApiResponse<PostmarkSendTemplateEmailResponse[]>> {
    return this.post<PostmarkSendTemplateEmailResponse[]>(
      "/email/batchWithTemplates",
      { Messages: messages }
    );
  }

  // ==================== Templates ====================

  /** List templates. */
  async listTemplates(
    params?: {
      count?: number;
      offset?: number;
      templateType?: "Standard" | "Layout";
      layoutTemplate?: string;
    }
  ): Promise<ApiResponse<PostmarkListTemplatesResponse>> {
    const queryParams: Record<string, string> = {};
    if (params?.count) queryParams.Count = String(params.count);
    if (params?.offset) queryParams.Offset = String(params.offset);
    if (params?.templateType) queryParams.TemplateType = params.templateType;
    if (params?.layoutTemplate) queryParams.LayoutTemplate = params.layoutTemplate;
    return this.get<PostmarkListTemplatesResponse>("/templates", queryParams);
  }

  /** Get a single template by ID or alias. */
  async getTemplate(
    idOrAlias: number | string
  ): Promise<ApiResponse<PostmarkTemplate>> {
    return this.get<PostmarkTemplate>(`/templates/${idOrAlias}`);
  }

  /** Create a new template. */
  async createTemplate(
    data: PostmarkCreateTemplateRequest
  ): Promise<ApiResponse<PostmarkTemplate>> {
    return this.post<PostmarkTemplate>("/templates", data);
  }

  /** Update an existing template. */
  async updateTemplate(
    idOrAlias: number | string,
    data: PostmarkUpdateTemplateRequest
  ): Promise<ApiResponse<PostmarkTemplate>> {
    return this.put<PostmarkTemplate>(`/templates/${idOrAlias}`, data);
  }

  /** Delete a template. */
  async deleteTemplate(
    idOrAlias: number | string
  ): Promise<ApiResponse<{ ErrorCode: number; Message: string }>> {
    return this.delete<{ ErrorCode: number; Message: string }>(
      `/templates/${idOrAlias}`
    );
  }

  /** Validate a template (check for errors). */
  async validateTemplate(
    data: PostmarkValidateTemplateRequest
  ): Promise<ApiResponse<PostmarkValidateTemplateResponse>> {
    return this.post<PostmarkValidateTemplateResponse>(
      "/templates/validate",
      data
    );
  }

  // ==================== Bounce Management ====================

  /** Get delivery stats (bounce summary). */
  async getDeliveryStats(): Promise<ApiResponse<PostmarkDeliveryStats>> {
    return this.get<PostmarkDeliveryStats>("/deliverystats");
  }

  /** List bounces. */
  async listBounces(
    params?: {
      count?: number;
      offset?: number;
      type?: string;
      inactive?: boolean;
      emailFilter?: string;
      tag?: string;
      messageID?: string;
      fromdate?: string;
      todate?: string;
      messagestream?: string;
    }
  ): Promise<ApiResponse<PostmarkBouncesResponse>> {
    const queryParams: Record<string, string> = {};
    if (params?.count) queryParams.count = String(params.count);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.type) queryParams.type = params.type;
    if (params?.inactive !== undefined) queryParams.inactive = String(params.inactive);
    if (params?.emailFilter) queryParams.emailFilter = params.emailFilter;
    if (params?.tag) queryParams.tag = params.tag;
    if (params?.messageID) queryParams.messageID = params.messageID;
    if (params?.fromdate) queryParams.fromdate = params.fromdate;
    if (params?.todate) queryParams.todate = params.todate;
    if (params?.messagestream) queryParams.messagestream = params.messagestream;
    return this.get<PostmarkBouncesResponse>("/bounces", queryParams);
  }

  /** Get a single bounce by ID. */
  async getBounce(bounceId: number): Promise<ApiResponse<PostmarkBounce>> {
    return this.get<PostmarkBounce>(`/bounces/${bounceId}`);
  }

  /** Get the raw SMTP dump for a bounce. */
  async getBounceDump(bounceId: number): Promise<ApiResponse<PostmarkBounceDump>> {
    return this.get<PostmarkBounceDump>(`/bounces/${bounceId}/dump`);
  }

  /** Activate a bounced email (allow sending again). */
  async activateBounce(
    bounceId: number
  ): Promise<ApiResponse<{ Message: string; Bounce: PostmarkBounce }>> {
    return this.put<{ Message: string; Bounce: PostmarkBounce }>(
      `/bounces/${bounceId}/activate`
    );
  }

  /** Get bounce tags (list of tags that have bounced). */
  async getBounceTags(): Promise<ApiResponse<string[]>> {
    return this.get<string[]>("/bounces/tags");
  }

  // ==================== Stats ====================

  /** Get outbound overview stats. */
  async getOutboundStats(
    params?: PostmarkStatsParams
  ): Promise<ApiResponse<PostmarkOutboundStats>> {
    const queryParams = this.buildStatsParams(params);
    return this.get<PostmarkOutboundStats>(
      "/stats/outbound",
      queryParams
    );
  }

  /** Get sent counts by day. */
  async getSentCounts(
    params?: PostmarkStatsParams
  ): Promise<ApiResponse<PostmarkStatsDays>> {
    return this.get<PostmarkStatsDays>(
      "/stats/outbound/sends",
      this.buildStatsParams(params)
    );
  }

  /** Get bounce counts by day. */
  async getBounceCounts(
    params?: PostmarkStatsParams
  ): Promise<ApiResponse<PostmarkStatsDays>> {
    return this.get<PostmarkStatsDays>(
      "/stats/outbound/bounces",
      this.buildStatsParams(params)
    );
  }

  /** Get open counts by day. */
  async getOpenCounts(
    params?: PostmarkStatsParams
  ): Promise<ApiResponse<PostmarkStatsDays>> {
    return this.get<PostmarkStatsDays>(
      "/stats/outbound/opens",
      this.buildStatsParams(params)
    );
  }

  /** Get click counts by day. */
  async getClickCounts(
    params?: PostmarkStatsParams
  ): Promise<ApiResponse<PostmarkStatsDays>> {
    return this.get<PostmarkStatsDays>(
      "/stats/outbound/clicks",
      this.buildStatsParams(params)
    );
  }

  /** Get spam complaint counts by day. */
  async getSpamComplaintCounts(
    params?: PostmarkStatsParams
  ): Promise<ApiResponse<PostmarkStatsDays>> {
    return this.get<PostmarkStatsDays>(
      "/stats/outbound/spam",
      this.buildStatsParams(params)
    );
  }

  // ==================== Connection Test ====================

  /** Verify credentials by fetching server info. */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.get<{ Name: string }>("/server");
      return response.status === 200 && !!response.data.Name;
    } catch {
      return false;
    }
  }

  // ==================== Private Helpers ====================

  private buildStatsParams(
    params?: PostmarkStatsParams
  ): Record<string, string> {
    const queryParams: Record<string, string> = {};
    if (params?.tag) queryParams.tag = params.tag;
    if (params?.fromdate) queryParams.fromdate = params.fromdate;
    if (params?.todate) queryParams.todate = params.todate;
    if (params?.messagestream) queryParams.messagestream = params.messagestream;
    return queryParams;
  }
}

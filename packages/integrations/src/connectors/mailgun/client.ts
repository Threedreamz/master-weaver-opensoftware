import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  MailgunClientConfig,
  MailgunSendMessageRequest,
  MailgunSendMessageResponse,
  MailgunTemplate,
  MailgunListTemplatesResponse,
  MailgunCreateTemplateRequest,
  MailgunCreateTemplateVersionRequest,
  MailgunTemplateVersion,
  MailgunEventsResponse,
  MailgunEventsParams,
  MailgunBounce,
  MailgunBouncesResponse,
  MailgunCreateBounceRequest,
} from "./types.js";

/**
 * Mailgun API client.
 *
 * Supports: sending messages, template management, events, bounces.
 * Auth: HTTP Basic Auth (api:key-xxx).
 * Rate limit: 300 RPM default.
 */
export class MailgunClient extends BaseIntegrationClient {
  private readonly domain: string;

  constructor(config: MailgunClientConfig) {
    const baseUrl =
      config.euRegion !== false
        ? "https://api.eu.mailgun.net/v3"
        : "https://api.mailgun.net/v3";

    super({
      baseUrl,
      authType: "basic_auth",
      credentials: {
        username: "api",
        password: config.apiKey,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 300 },
    });

    this.domain = config.domain;
  }

  // ==================== Send Messages ====================

  /**
   * Send an email message.
   *
   * Note: Mailgun's send API uses form-encoded data, but also accepts JSON.
   * We send JSON for consistency with the base client.
   */
  async sendMessage(
    params: MailgunSendMessageRequest
  ): Promise<ApiResponse<MailgunSendMessageResponse>> {
    const body: Record<string, unknown> = {
      from: params.from,
      to: Array.isArray(params.to) ? params.to.join(",") : params.to,
      subject: params.subject,
    };

    if (params.cc) body.cc = Array.isArray(params.cc) ? params.cc.join(",") : params.cc;
    if (params.bcc) body.bcc = Array.isArray(params.bcc) ? params.bcc.join(",") : params.bcc;
    if (params.text) body.text = params.text;
    if (params.html) body.html = params.html;
    if (params.template) body.template = params.template;
    if (params["h:X-Mailgun-Variables"]) body["h:X-Mailgun-Variables"] = params["h:X-Mailgun-Variables"];
    if (params["t:version"]) body["t:version"] = params["t:version"];
    if (params["t:text"]) body["t:text"] = params["t:text"];
    if (params["o:tag"]) body["o:tag"] = params["o:tag"];
    if (params["o:dkim"]) body["o:dkim"] = params["o:dkim"];
    if (params["o:deliverytime"]) body["o:deliverytime"] = params["o:deliverytime"];
    if (params["o:testmode"]) body["o:testmode"] = params["o:testmode"];
    if (params["o:tracking"]) body["o:tracking"] = params["o:tracking"];
    if (params["o:tracking-clicks"]) body["o:tracking-clicks"] = params["o:tracking-clicks"];
    if (params["o:tracking-opens"]) body["o:tracking-opens"] = params["o:tracking-opens"];
    if (params["o:require-tls"]) body["o:require-tls"] = params["o:require-tls"];
    if (params["o:skip-verification"]) body["o:skip-verification"] = params["o:skip-verification"];

    return this.post<MailgunSendMessageResponse>(
      `/${this.domain}/messages`,
      body
    );
  }

  /**
   * Send a message using a stored template with variables.
   * Convenience wrapper around sendMessage with template params.
   */
  async sendTemplateMessage(
    params: {
      from: string;
      to: string | string[];
      subject: string;
      template: string;
      variables: Record<string, unknown>;
      version?: string;
      tags?: string[];
    }
  ): Promise<ApiResponse<MailgunSendMessageResponse>> {
    return this.sendMessage({
      from: params.from,
      to: params.to,
      subject: params.subject,
      template: params.template,
      "h:X-Mailgun-Variables": JSON.stringify(params.variables),
      "t:version": params.version,
      "o:tag": params.tags,
    });
  }

  // ==================== Templates ====================

  /** List all templates for the domain. */
  async listTemplates(
    params?: { page?: string; limit?: number }
  ): Promise<ApiResponse<MailgunListTemplatesResponse>> {
    const queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = String(params.limit);
    return this.get<MailgunListTemplatesResponse>(
      `/${this.domain}/templates`,
      queryParams
    );
  }

  /** Get a single template by name. */
  async getTemplate(
    name: string,
    active?: boolean
  ): Promise<ApiResponse<{ template: MailgunTemplate }>> {
    const params: Record<string, string> = {};
    if (active) params.active = "yes";
    return this.get<{ template: MailgunTemplate }>(
      `/${this.domain}/templates/${name}`,
      params
    );
  }

  /** Create a new template. */
  async createTemplate(
    data: MailgunCreateTemplateRequest
  ): Promise<ApiResponse<{ message: string; template: MailgunTemplate }>> {
    return this.post<{ message: string; template: MailgunTemplate }>(
      `/${this.domain}/templates`,
      data
    );
  }

  /** Update a template's description. */
  async updateTemplate(
    name: string,
    data: { description: string }
  ): Promise<ApiResponse<{ message: string; template: MailgunTemplate }>> {
    return this.put<{ message: string; template: MailgunTemplate }>(
      `/${this.domain}/templates/${name}`,
      data
    );
  }

  /** Delete a template. */
  async deleteTemplate(
    name: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(
      `/${this.domain}/templates/${name}`
    );
  }

  /** Create a new version for a template. */
  async createTemplateVersion(
    templateName: string,
    data: MailgunCreateTemplateVersionRequest
  ): Promise<ApiResponse<{ message: string; template: MailgunTemplateVersion }>> {
    return this.post<{ message: string; template: MailgunTemplateVersion }>(
      `/${this.domain}/templates/${templateName}/versions`,
      data
    );
  }

  /** Get a specific template version. */
  async getTemplateVersion(
    templateName: string,
    tag: string
  ): Promise<ApiResponse<{ template: MailgunTemplateVersion }>> {
    return this.get<{ template: MailgunTemplateVersion }>(
      `/${this.domain}/templates/${templateName}/versions/${tag}`
    );
  }

  /** Delete a template version. */
  async deleteTemplateVersion(
    templateName: string,
    tag: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(
      `/${this.domain}/templates/${templateName}/versions/${tag}`
    );
  }

  // ==================== Events ====================

  /** Query stored events (logs). */
  async getEvents(
    params?: MailgunEventsParams
  ): Promise<ApiResponse<MailgunEventsResponse>> {
    const queryParams: Record<string, string> = {};
    if (params?.event) queryParams.event = params.event;
    if (params?.begin) queryParams.begin = params.begin;
    if (params?.end) queryParams.end = params.end;
    if (params?.ascending) queryParams.ascending = params.ascending;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.recipient) queryParams.recipient = params.recipient;
    if (params?.tags) queryParams.tags = params.tags;
    if (params?.severity) queryParams.severity = params.severity;
    return this.get<MailgunEventsResponse>(
      `/${this.domain}/events`,
      queryParams
    );
  }

  // ==================== Bounces ====================

  /** List bounces for the domain. */
  async listBounces(
    params?: { limit?: number; skip?: number }
  ): Promise<ApiResponse<MailgunBouncesResponse>> {
    const queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.skip) queryParams.skip = String(params.skip);
    return this.get<MailgunBouncesResponse>(
      `/${this.domain}/bounces`,
      queryParams
    );
  }

  /** Get a single bounce by address. */
  async getBounce(
    address: string
  ): Promise<ApiResponse<MailgunBounce>> {
    return this.get<MailgunBounce>(
      `/${this.domain}/bounces/${encodeURIComponent(address)}`
    );
  }

  /** Add a bounce record (for suppression). */
  async createBounce(
    data: MailgunCreateBounceRequest
  ): Promise<ApiResponse<{ message: string; address: string }>> {
    return this.post<{ message: string; address: string }>(
      `/${this.domain}/bounces`,
      data
    );
  }

  /** Delete a bounce record. */
  async deleteBounce(
    address: string
  ): Promise<ApiResponse<{ message: string; address: string }>> {
    return this.delete<{ message: string; address: string }>(
      `/${this.domain}/bounces/${encodeURIComponent(address)}`
    );
  }

  /** Delete all bounce records for the domain. */
  async deleteAllBounces(): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/${this.domain}/bounces`);
  }

  // ==================== Connection Test ====================

  /** Verify credentials by fetching domain info. */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.get<{ domain: { name: string } }>(
        `/${this.domain}`
      );
      return response.status === 200 && !!response.data.domain;
    } catch {
      return false;
    }
  }
}

import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  MakeClientConfig,
  MakeScenario,
  MakeExecution,
  MakeWebhook,
  MakeListResponse,
  MakePaginationParams,
  MakeWebhookTriggerPayload,
  MakeWebhookTriggerResponse,
} from "./types.js";

/**
 * Make (Integromat) API client for OpenFlow form integrations.
 *
 * Triggers scenarios via webhooks and manages scenario/webhook resources.
 * Uses API key authentication.
 */
export class MakeClient extends BaseIntegrationClient {
  private teamId: number;

  constructor(config: MakeClientConfig) {
    const region = config.region ?? "eu1";

    super({
      baseUrl: `https://${region}.make.com/api/v2`,
      authType: "api_key",
      credentials: {
        headerName: "Authorization",
        apiKey: `Token ${config.apiToken}`,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
    });

    this.teamId = config.teamId;
  }

  // ==================== Scenarios ====================

  /** List all scenarios for the configured team. */
  async listScenarios(
    pagination?: MakePaginationParams
  ): Promise<ApiResponse<MakeListResponse<MakeScenario>>> {
    const params: Record<string, string> = {
      teamId: String(this.teamId),
    };
    if (pagination?.limit != null) params.pg_limit = String(pagination.limit);
    if (pagination?.offset != null) params.pg_offset = String(pagination.offset);
    if (pagination?.sortBy) params.pg_sortBy = pagination.sortBy;
    if (pagination?.sortDir) params.pg_sortDir = pagination.sortDir;

    return this.get<MakeListResponse<MakeScenario>>("/scenarios", params);
  }

  /** Get a single scenario by ID. */
  async getScenario(
    scenarioId: number
  ): Promise<ApiResponse<{ scenario: MakeScenario }>> {
    return this.get<{ scenario: MakeScenario }>(
      `/scenarios/${scenarioId}`
    );
  }

  /** Activate (enable) a scenario. */
  async activateScenario(
    scenarioId: number
  ): Promise<ApiResponse<{ scenario: MakeScenario }>> {
    return this.patch<{ scenario: MakeScenario }>(
      `/scenarios/${scenarioId}`,
      { isEnabled: true }
    );
  }

  /** Deactivate (disable) a scenario. */
  async deactivateScenario(
    scenarioId: number
  ): Promise<ApiResponse<{ scenario: MakeScenario }>> {
    return this.patch<{ scenario: MakeScenario }>(
      `/scenarios/${scenarioId}`,
      { isEnabled: false }
    );
  }

  /** Run a scenario immediately (on-demand execution). */
  async runScenario(
    scenarioId: number,
    data?: Record<string, unknown>
  ): Promise<ApiResponse<{ executionId: string }>> {
    return this.post<{ executionId: string }>(
      `/scenarios/${scenarioId}/run`,
      data ? { data } : undefined
    );
  }

  // ==================== Scenario Executions ====================

  /** List execution logs for a scenario. */
  async listExecutions(
    scenarioId: number,
    pagination?: MakePaginationParams
  ): Promise<ApiResponse<MakeListResponse<MakeExecution>>> {
    const params: Record<string, string> = {};
    if (pagination?.limit != null) params.pg_limit = String(pagination.limit);
    if (pagination?.offset != null) params.pg_offset = String(pagination.offset);

    return this.get<MakeListResponse<MakeExecution>>(
      `/scenarios/${scenarioId}/executions`,
      params
    );
  }

  // ==================== Webhooks ====================

  /** List all webhooks for the configured team. */
  async listWebhooks(
    pagination?: MakePaginationParams
  ): Promise<ApiResponse<MakeListResponse<MakeWebhook>>> {
    const params: Record<string, string> = {
      teamId: String(this.teamId),
    };
    if (pagination?.limit != null) params.pg_limit = String(pagination.limit);
    if (pagination?.offset != null) params.pg_offset = String(pagination.offset);

    return this.get<MakeListResponse<MakeWebhook>>("/hooks", params);
  }

  /** Get a single webhook by ID. */
  async getWebhook(
    webhookId: number
  ): Promise<ApiResponse<{ hook: MakeWebhook }>> {
    return this.get<{ hook: MakeWebhook }>(`/hooks/${webhookId}`);
  }

  /**
   * Trigger a Make webhook with an OpenFlow form submission payload.
   * The webhookUrl should be the full URL returned from Make's webhook module.
   */
  async triggerWebhook(
    webhookUrl: string,
    flowId: string,
    submissionId: string,
    data: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<ApiResponse<MakeWebhookTriggerResponse>> {
    const payload: MakeWebhookTriggerPayload = {
      source: "openflow",
      event: "form_submission",
      flowId,
      submissionId,
      timestamp: new Date().toISOString(),
      data,
      metadata,
    };

    // Make webhook URLs are external — we need a direct fetch call
    // since they may be on a different host than the API base URL.
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const text = await response.text();
    const responseData = text
      ? (JSON.parse(text) as MakeWebhookTriggerResponse)
      : { accepted: response.ok };

    return {
      data: responseData,
      status: response.status,
      headers: responseHeaders,
    };
  }

  /**
   * Trigger a Make webhook by webhook ID.
   * Fetches the webhook URL first, then sends the payload.
   */
  async triggerWebhookById(
    webhookId: number,
    flowId: string,
    submissionId: string,
    data: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<ApiResponse<MakeWebhookTriggerResponse>> {
    const hookResponse = await this.getWebhook(webhookId);
    const webhookUrl = hookResponse.data.hook.url;
    return this.triggerWebhook(webhookUrl, flowId, submissionId, data, metadata);
  }
}

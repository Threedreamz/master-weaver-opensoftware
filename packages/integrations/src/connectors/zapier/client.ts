import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  ZapierClientConfig,
  ZapierWebhookPayload,
  ZapierWebhookResponse,
  ZapierDeliveryResult,
  ZapierSubmissionMetadata,
} from "./types.js";

/**
 * Zapier Webhook client for OpenFlow form integrations.
 *
 * Sends form submissions to Zapier webhook URLs to trigger Zaps.
 * No authentication required — the webhook URL itself is the credential.
 */
export class ZapierWebhookClient extends BaseIntegrationClient {
  private webhookUrl: string;

  constructor(config: ZapierClientConfig) {
    // Extract the base URL (protocol + host) from the webhook URL.
    const url = new URL(config.webhookUrl);
    const baseUrl = `${url.protocol}//${url.host}`;

    super({
      baseUrl,
      authType: "none",
      credentials: {},
      timeout: config.timeout ?? 15_000,
      rateLimit: { requestsPerMinute: 100 },
    });

    this.webhookUrl = config.webhookUrl;
  }

  // ==================== Webhook Delivery ====================

  /**
   * Send a raw payload to the configured Zapier webhook URL.
   * Returns the full API response from Zapier.
   */
  async sendWebhook(
    payload: ZapierWebhookPayload
  ): Promise<ApiResponse<ZapierWebhookResponse>> {
    const path = new URL(this.webhookUrl).pathname;
    return this.post<ZapierWebhookResponse>(path, payload);
  }

  /**
   * Send an OpenFlow form submission to Zapier.
   * Wraps the submission in the standard ZapierWebhookPayload format.
   */
  async sendFormSubmission(
    flowId: string,
    submissionId: string,
    data: Record<string, unknown>,
    metadata?: ZapierSubmissionMetadata
  ): Promise<ZapierDeliveryResult> {
    const payload: ZapierWebhookPayload = {
      source: "openflow",
      event: "form_submission",
      flowId,
      submissionId,
      timestamp: new Date().toISOString(),
      data,
      metadata,
    };

    try {
      const response = await this.sendWebhook(payload);
      return {
        success: true,
        statusCode: response.status,
        webhookUrl: this.webhookUrl,
        response: response.data,
        deliveredAt: new Date().toISOString(),
      };
    } catch (error) {
      const message =
        error instanceof IntegrationError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown error";

      return {
        success: false,
        statusCode:
          error instanceof IntegrationError ? (error.status ?? 0) : 0,
        webhookUrl: this.webhookUrl,
        error: message,
        deliveredAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Send a partial/abandoned form event to Zapier.
   * Useful for tracking drop-offs in a flow.
   */
  async sendPartialSubmission(
    flowId: string,
    submissionId: string,
    data: Record<string, unknown>,
    abandoned: boolean,
    metadata?: ZapierSubmissionMetadata
  ): Promise<ZapierDeliveryResult> {
    const payload: ZapierWebhookPayload = {
      source: "openflow",
      event: abandoned ? "form_abandoned" : "form_partial",
      flowId,
      submissionId,
      timestamp: new Date().toISOString(),
      data,
      metadata,
    };

    try {
      const response = await this.sendWebhook(payload);
      return {
        success: true,
        statusCode: response.status,
        webhookUrl: this.webhookUrl,
        response: response.data,
        deliveredAt: new Date().toISOString(),
      };
    } catch (error) {
      const message =
        error instanceof IntegrationError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown error";

      return {
        success: false,
        statusCode:
          error instanceof IntegrationError ? (error.status ?? 0) : 0,
        webhookUrl: this.webhookUrl,
        error: message,
        deliveredAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Send a batch of form submissions to Zapier sequentially.
   * Returns delivery results for each submission.
   */
  async sendBatch(
    submissions: Array<{
      flowId: string;
      submissionId: string;
      data: Record<string, unknown>;
      metadata?: ZapierSubmissionMetadata;
    }>
  ): Promise<ZapierDeliveryResult[]> {
    const results: ZapierDeliveryResult[] = [];

    for (const sub of submissions) {
      const result = await this.sendFormSubmission(
        sub.flowId,
        sub.submissionId,
        sub.data,
        sub.metadata
      );
      results.push(result);
    }

    return results;
  }
}

import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  ZeroBounceClientConfig,
  ZeroBounceValidateResponse,
  ZeroBounceInlineBatchRequest,
  ZeroBounceInlineBatchResponse,
  ZeroBounceCreditsResponse,
  ZeroBounceApiUsageParams,
  ZeroBounceApiUsageResponse,
} from "./types.js";

/**
 * ZeroBounce API client for email validation and credit management.
 *
 * Authentication: API key as query parameter (`api_key`).
 * Docs: https://www.zerobounce.net/docs/
 */
export class ZeroBounceClient extends BaseIntegrationClient {
  private readonly apiKey: string;

  constructor(config: ZeroBounceClientConfig) {
    super({
      baseUrl: "https://api.zerobounce.net/v2",
      authType: "none",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 200 },
    });
    this.apiKey = config.apiKey;
  }

  /**
   * Inject the API key into every request as a query parameter.
   */
  private withApiKey(params?: Record<string, string>): Record<string, string> {
    return { ...params, api_key: this.apiKey };
  }

  // ==================== Validate Single Email ====================

  /**
   * Validate a single email address.
   * Returns comprehensive validation results including status,
   * SMTP info, domain age, and geographic data.
   *
   * @param email - The email address to validate
   * @param ipAddress - Optional IP address of the email sender for additional data
   */
  async validate(
    email: string,
    ipAddress?: string
  ): Promise<ZeroBounceValidateResponse> {
    const params: Record<string, string> = { email };
    if (ipAddress) params.ip_address = ipAddress;

    const response = await this.get<ZeroBounceValidateResponse>(
      "/validate",
      this.withApiKey(params)
    );
    return response.data;
  }

  // ==================== Batch Validate ====================

  /**
   * Validate a batch of email addresses in a single request.
   * Supports up to 100 emails per batch. Each email can optionally
   * include an IP address for additional enrichment data.
   *
   * @param batch - Array of email entries to validate
   */
  async batchValidate(
    batch: ZeroBounceInlineBatchRequest
  ): Promise<ZeroBounceInlineBatchResponse> {
    const response = await this.request<ZeroBounceInlineBatchResponse>({
      method: "POST",
      path: "/validatebatch",
      params: this.withApiKey(),
      body: batch,
    });
    return response.data;
  }

  // ==================== Credits ====================

  /**
   * Get the number of remaining validation credits on the account.
   */
  async getCredits(): Promise<ZeroBounceCreditsResponse> {
    const response = await this.get<ZeroBounceCreditsResponse>(
      "/getcredits",
      this.withApiKey()
    );
    return response.data;
  }

  // ==================== API Usage ====================

  /**
   * Get API usage statistics for a date range.
   *
   * @param params - Start and end dates in YYYY-MM-DD format
   */
  async getApiUsage(
    params: ZeroBounceApiUsageParams
  ): Promise<ZeroBounceApiUsageResponse> {
    const response = await this.get<ZeroBounceApiUsageResponse>(
      "/getapiusage",
      this.withApiKey({
        start_date: params.start_date,
        end_date: params.end_date,
      })
    );
    return response.data;
  }

  // ==================== Connection Test ====================

  /**
   * Verify that the API key is valid by fetching credit balance.
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.getCredits();
      return result.Credits !== "-1";
    } catch {
      return false;
    }
  }
}

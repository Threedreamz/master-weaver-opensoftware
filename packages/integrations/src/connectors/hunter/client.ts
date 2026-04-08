import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  HunterClientConfig,
  HunterDomainSearchResponse,
  HunterDomainSearchParams,
  HunterEmailFinderResponse,
  HunterEmailFinderParams,
  HunterEmailVerifierResponse,
  HunterAccountResponse,
} from "./types.js";

/**
 * Hunter.io API client for domain search, email finding, and verification.
 *
 * Authentication: API key as query parameter (`api_key`).
 * Docs: https://hunter.io/api-documentation/v2
 */
export class HunterClient extends BaseIntegrationClient {
  private readonly apiKey: string;

  constructor(config: HunterClientConfig) {
    super({
      baseUrl: "https://api.hunter.io",
      authType: "none",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 120 },
    });
    this.apiKey = config.apiKey;
  }

  /**
   * Inject the API key into every request as a query parameter.
   */
  private withApiKey(params?: Record<string, string>): Record<string, string> {
    return { ...params, api_key: this.apiKey };
  }

  // ==================== Domain Search ====================

  /**
   * Search for email addresses associated with a domain.
   * Returns all email addresses found for the given domain, along with
   * associated metadata (name, position, confidence, sources).
   */
  async domainSearch(
    params: HunterDomainSearchParams
  ): Promise<HunterDomainSearchResponse> {
    const queryParams: Record<string, string> = {
      domain: params.domain,
    };
    if (params.company) queryParams.company = params.company;
    if (params.limit != null) queryParams.limit = String(params.limit);
    if (params.offset != null) queryParams.offset = String(params.offset);
    if (params.type) queryParams.type = params.type;
    if (params.seniority) queryParams.seniority = params.seniority;
    if (params.department) queryParams.department = params.department;

    const response = await this.get<HunterDomainSearchResponse>(
      "/v2/domain-search",
      this.withApiKey(queryParams)
    );
    return response.data;
  }

  // ==================== Email Finder ====================

  /**
   * Find the most likely email address for a person at a given domain.
   * Provide the domain and the person's name to get their email address.
   */
  async findEmail(
    params: HunterEmailFinderParams
  ): Promise<HunterEmailFinderResponse> {
    const queryParams: Record<string, string> = {
      domain: params.domain,
    };
    if (params.first_name) queryParams.first_name = params.first_name;
    if (params.last_name) queryParams.last_name = params.last_name;
    if (params.full_name) queryParams.full_name = params.full_name;
    if (params.company) queryParams.company = params.company;

    const response = await this.get<HunterEmailFinderResponse>(
      "/v2/email-finder",
      this.withApiKey(queryParams)
    );
    return response.data;
  }

  // ==================== Email Verifier ====================

  /**
   * Verify the deliverability of an email address.
   * Returns detailed verification results including SMTP checks,
   * MX records, and confidence score.
   */
  async verifyEmail(email: string): Promise<HunterEmailVerifierResponse> {
    const response = await this.get<HunterEmailVerifierResponse>(
      "/v2/email-verifier",
      this.withApiKey({ email })
    );
    return response.data;
  }

  // ==================== Account ====================

  /**
   * Get account information and remaining API credits.
   */
  async getAccount(): Promise<HunterAccountResponse> {
    const response = await this.get<HunterAccountResponse>(
      "/v2/account",
      this.withApiKey()
    );
    return response.data;
  }

  // ==================== Connection Test ====================

  /**
   * Verify that the API key is valid by fetching account details.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccount();
      return true;
    } catch {
      return false;
    }
  }
}

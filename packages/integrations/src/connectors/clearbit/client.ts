import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  ClearbitClientConfig,
  ClearbitPerson,
  ClearbitCompany,
  ClearbitCombinedResponse,
} from "./types.js";

/**
 * Clearbit API client for person/company enrichment and email lookup.
 *
 * Authentication: API key as Bearer token.
 * Docs: https://dashboard.clearbit.com/docs
 */
export class ClearbitClient extends BaseIntegrationClient {
  constructor(config: ClearbitClientConfig) {
    super({
      baseUrl: "https://person.clearbit.com",
      authType: "api_key",
      credentials: { apiKey: config.apiKey },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 600 },
    });
  }

  // ==================== Person Enrichment ====================

  /**
   * Look up a person by email address.
   * Returns detailed person data including employment, social profiles, and geo.
   */
  async findPerson(email: string): Promise<ClearbitPerson> {
    const response = await this.get<ClearbitPerson>("/v2/people/find", {
      email,
    });
    return response.data;
  }

  // ==================== Company Enrichment ====================

  /**
   * Look up a company by domain.
   * Returns detailed company data including metrics, category, and tech stack.
   */
  async findCompany(domain: string): Promise<ClearbitCompany> {
    // Company enrichment uses a different base URL
    const response = await this.request<ClearbitCompany>({
      method: "GET",
      path: "/v2/companies/find",
      params: { domain },
      headers: {},
    });
    return response.data;
  }

  // ==================== Combined Enrichment ====================

  /**
   * Look up both person and company data by email.
   * Returns combined person + company enrichment in a single call.
   */
  async findCombined(email: string): Promise<ClearbitCombinedResponse> {
    const response = await this.get<ClearbitCombinedResponse>(
      "/v2/combined/find",
      { email }
    );
    return response.data;
  }

  // ==================== Email Lookup ====================

  /**
   * Look up a person by email and return enrichment data.
   * Alias for findPerson — provided for semantic clarity.
   */
  async emailLookup(email: string): Promise<ClearbitPerson> {
    return this.findPerson(email);
  }

  // ==================== Connection Test ====================

  /**
   * Verify that the API key is valid by performing a lightweight request.
   */
  async testConnection(): Promise<boolean> {
    try {
      // Use a known domain to verify the key works
      await this.request({
        method: "GET",
        path: "/v2/people/find",
        params: { email: "test@clearbit.com" },
      });
      return true;
    } catch {
      return false;
    }
  }
}

import { BaseIntegrationClient } from "../../core/base-client";
import type { ApiResponse } from "../../core/types";
import type {
  UnternehmensregisterClientConfig,
  UnternehmensregisterSearchParams,
  UnternehmensregisterSearchResponse,
  UnternehmensregisterCompanyDetail,
  UnternehmensregisterDocument,
} from "./types";

const UNTERNEHMENSREGISTER_BASE_URL = "https://www.unternehmensregister.de/api";

/**
 * Unternehmensregister client for German Company Register lookup.
 *
 * Provides access to the public German company register
 * (unternehmensregister.de) for company search, financial statements
 * lookup, and company detail retrieval.
 *
 * No authentication is required — all data is publicly accessible.
 */
export class UnternehmensregisterClient extends BaseIntegrationClient {
  constructor(config?: UnternehmensregisterClientConfig) {
    super({
      baseUrl: UNTERNEHMENSREGISTER_BASE_URL,
      authType: "none",
      credentials: {},
      timeout: config?.timeout ?? 15_000,
      rateLimit: { requestsPerMinute: 60 },
    });
  }

  // ==================== Company Search ====================

  /**
   * Search for companies in the German company register.
   *
   * Supports searching by company name, registration number,
   * registration court, city, and federal state.
   */
  async searchCompanies(
    params: UnternehmensregisterSearchParams
  ): Promise<ApiResponse<UnternehmensregisterSearchResponse>> {
    const queryParams: Record<string, string> = {};
    if (params.companyName) queryParams.company_name = params.companyName;
    if (params.registrationCourt) queryParams.registration_court = params.registrationCourt;
    if (params.registerNumber) queryParams.register_number = params.registerNumber;
    if (params.registerType) queryParams.register_type = params.registerType;
    if (params.city) queryParams.city = params.city;
    if (params.state) queryParams.state = params.state;
    if (params.status) queryParams.status = params.status;
    if (params.maxResults != null) queryParams.max_results = String(params.maxResults);

    return this.get<UnternehmensregisterSearchResponse>("/v1/companies", queryParams);
  }

  // ==================== Company Details ====================

  /**
   * Get detailed information about a specific company.
   *
   * Returns the full company profile including officers, documents,
   * and register history.
   */
  async getCompanyDetail(
    registerNumber: string,
    registrationCourt: string
  ): Promise<ApiResponse<UnternehmensregisterCompanyDetail>> {
    return this.get<UnternehmensregisterCompanyDetail>(
      `/v1/companies/${encodeURIComponent(registrationCourt)}/${encodeURIComponent(registerNumber)}`
    );
  }

  // ==================== Financial Statements ====================

  /**
   * Look up financial statements (Jahresabschluesse) for a company.
   *
   * Returns published financial statements from the Bundesanzeiger
   * linked through the Unternehmensregister.
   */
  async getFinancialStatements(
    registerNumber: string,
    registrationCourt: string,
    params?: { fiscalYear?: number; limit?: number }
  ): Promise<ApiResponse<UnternehmensregisterDocument[]>> {
    const queryParams: Record<string, string> = {
      type: "jahresabschluss",
    };
    if (params?.fiscalYear != null) queryParams.fiscal_year = String(params.fiscalYear);
    if (params?.limit != null) queryParams.limit = String(params.limit);

    return this.get<UnternehmensregisterDocument[]>(
      `/v1/companies/${encodeURIComponent(registrationCourt)}/${encodeURIComponent(registerNumber)}/documents`,
      queryParams
    );
  }

  /**
   * Get all documents for a company.
   *
   * Returns all published documents including register excerpts,
   * financial statements, shareholder lists, and announcements.
   */
  async getDocuments(
    registerNumber: string,
    registrationCourt: string
  ): Promise<ApiResponse<UnternehmensregisterDocument[]>> {
    return this.get<UnternehmensregisterDocument[]>(
      `/v1/companies/${encodeURIComponent(registrationCourt)}/${encodeURIComponent(registerNumber)}/documents`
    );
  }

  // ==================== Connection Test ====================

  /** Test the connection to the Unternehmensregister API. */
  async testConnection(): Promise<boolean> {
    try {
      await this.get("/v1/health");
      return true;
    } catch {
      return false;
    }
  }
}

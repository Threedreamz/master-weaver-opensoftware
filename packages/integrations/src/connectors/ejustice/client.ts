import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  EjusticeClientConfig,
  EjusticeSearchParams,
  EjusticeSearchResponse,
  EjusticeBusinessDetails,
  EjusticeMemberState,
} from "./types.js";

const EJUSTICE_BASE_URL = "https://e-justice.europa.eu/api/bris";

/**
 * eJustice Portal client for cross-border business register searches across the EU.
 *
 * Queries the Business Registers Interconnection System (BRIS), which
 * connects the central, commercial, and companies registers of all EU
 * member states.
 *
 * No authentication required.
 *
 * @see https://e-justice.europa.eu/content_business_registers_at_european_level-105-en.do
 */
export class EjusticeClient extends BaseIntegrationClient {
  private language: string;

  constructor(config: EjusticeClientConfig = {}) {
    super({
      baseUrl: EJUSTICE_BASE_URL,
      authType: "none",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 20 },
      defaultHeaders: {
        Accept: "application/json",
      },
    });

    this.language = config.language ?? "en";
  }

  // ==================== Search ====================

  /**
   * Search for businesses across EU member state registers.
   *
   * Searches the BRIS interconnected registers for companies matching
   * the given criteria. Can filter by country, entity type, and status.
   */
  async searchBusinesses(
    params: EjusticeSearchParams
  ): Promise<ApiResponse<EjusticeSearchResponse>> {
    const queryParams: Record<string, string> = {
      companyName: params.companyName,
      lang: this.language,
    };

    if (params.country) {
      queryParams.country = params.country;
    }

    if (params.countries && params.countries.length > 0) {
      queryParams.countries = params.countries.join(",");
    }

    if (params.registerNumber) {
      queryParams.registerNumber = params.registerNumber;
    }

    if (params.euid) {
      queryParams.euid = params.euid;
    }

    if (params.entityType) {
      queryParams.entityType = params.entityType;
    }

    if (params.status) {
      queryParams.status = params.status;
    }

    if (params.pageSize != null) {
      queryParams.pageSize = String(params.pageSize);
    }

    if (params.page != null) {
      queryParams.page = String(params.page);
    }

    return this.get<EjusticeSearchResponse>("/search", queryParams);
  }

  // ==================== Business Details ====================

  /**
   * Get detailed information about a business entity.
   *
   * @param euid - European Unique Identifier of the business
   */
  async getBusinessByEuid(
    euid: string
  ): Promise<ApiResponse<EjusticeBusinessDetails>> {
    return this.get<EjusticeBusinessDetails>(`/companies/${euid}`, {
      lang: this.language,
    });
  }

  /**
   * Get detailed information about a business by national register ID.
   *
   * @param country - Member state code (e.g., "DE", "FR")
   * @param registerId - National register identifier
   */
  async getBusinessByRegisterId(
    country: EjusticeMemberState,
    registerId: string
  ): Promise<ApiResponse<EjusticeBusinessDetails>> {
    return this.get<EjusticeBusinessDetails>(
      `/companies/${country}/${encodeURIComponent(registerId)}`,
      { lang: this.language }
    );
  }

  // ==================== Branches ====================

  /**
   * Get all branches of a company across EU member states.
   *
   * @param euid - European Unique Identifier of the parent company
   */
  async getCompanyBranches(
    euid: string
  ): Promise<ApiResponse<EjusticeBusinessDetails[]>> {
    return this.get<EjusticeBusinessDetails[]>(
      `/companies/${euid}/branches`,
      { lang: this.language }
    );
  }

  // ==================== Filings ====================

  /**
   * Get filing/document history for a company.
   *
   * @param euid - European Unique Identifier
   */
  async getCompanyFilings(
    euid: string,
    params: { page?: number; pageSize?: number } = {}
  ): Promise<ApiResponse<{ filings: Array<{ type: string; date: string; description?: string; available: boolean }> }>> {
    const queryParams: Record<string, string> = {
      lang: this.language,
    };

    if (params.page != null) {
      queryParams.page = String(params.page);
    }
    if (params.pageSize != null) {
      queryParams.pageSize = String(params.pageSize);
    }

    return this.get<{ filings: Array<{ type: string; date: string; description?: string; available: boolean }> }>(
      `/companies/${euid}/filings`,
      queryParams
    );
  }

  // ==================== Cross-border Operations ====================

  /**
   * Search for cross-border mergers involving EU companies.
   */
  async searchCrossBorderMergers(
    companyName: string,
    country?: EjusticeMemberState
  ): Promise<ApiResponse<EjusticeSearchResponse>> {
    const queryParams: Record<string, string> = {
      companyName,
      type: "merger",
      lang: this.language,
    };

    if (country) {
      queryParams.country = country;
    }

    return this.get<EjusticeSearchResponse>("/cross-border/mergers", queryParams);
  }

  /**
   * Look up a company by its EUID to check if it exists in the BRIS system.
   *
   * Returns a boolean indicating whether the EUID is valid and registered.
   */
  async verifyEuid(euid: string): Promise<boolean> {
    try {
      const response = await this.get(`/companies/${euid}/verify`, {
        lang: this.language,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

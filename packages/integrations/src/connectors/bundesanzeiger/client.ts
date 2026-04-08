import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  BundesanzeigerClientConfig,
  BundesanzeigerPublication,
  BundesanzeigerSubmissionResult,
  BundesanzeigerStatusResponse,
  BundesanzeigerSearchParams,
  BundesanzeigerSearchResponse,
} from "./types.js";

const BUNDESANZEIGER_BASE_URL = "https://publikations-plattform.bundesanzeiger.de/api";
const BUNDESANZEIGER_TEST_URL = "https://test-publikations-plattform.bundesanzeiger.de/api";

/**
 * Bundesanzeiger client for German Federal Gazette operations.
 *
 * Provides access to annual report publication search and company
 * filings lookup on the German Bundesanzeiger (Federal Gazette).
 *
 * Uses custom session authentication (username/password login to
 * obtain a session token, with optional client certificate).
 */
export class BundesanzeigerClient extends BaseIntegrationClient {
  private readonly username: string;
  private readonly password: string;
  private sessionToken: string | null = null;
  private sessionExpiresAt = 0;

  constructor(config: BundesanzeigerClientConfig) {
    const baseUrl =
      config.environment === "test"
        ? BUNDESANZEIGER_TEST_URL
        : BUNDESANZEIGER_BASE_URL;

    super({
      baseUrl,
      authType: "custom",
      credentials: {
        username: config.username,
        password: config.password,
        ...(config.certificatePath
          ? { certificatePath: config.certificatePath }
          : {}),
        ...(config.certificatePassphrase
          ? { certificatePassphrase: config.certificatePassphrase }
          : {}),
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
    });

    this.username = config.username;
    this.password = config.password;
  }

  // ==================== Publication Search ====================

  /**
   * Search for published annual reports and company filings.
   *
   * Searches the Bundesanzeiger publication database for financial
   * statements, management reports, and other mandatory publications.
   */
  async searchPublications(
    params: BundesanzeigerSearchParams
  ): Promise<ApiResponse<BundesanzeigerSearchResponse>> {
    await this.ensureAuthenticated();

    const queryParams: Record<string, string> = {};
    if (params.companyName) queryParams.company_name = params.companyName;
    if (params.registrationNumber) queryParams.registration_number = params.registrationNumber;
    if (params.registrationCourt) queryParams.registration_court = params.registrationCourt;
    if (params.publicationType) queryParams.publication_type = params.publicationType;
    if (params.fiscalYear != null) queryParams.fiscal_year = String(params.fiscalYear);
    if (params.dateFrom) queryParams.date_from = params.dateFrom;
    if (params.dateTo) queryParams.date_to = params.dateTo;
    if (params.page != null) queryParams.page = String(params.page);
    if (params.perPage != null) queryParams.per_page = String(params.perPage);

    return this.get<BundesanzeigerSearchResponse>("/v1/publications", queryParams);
  }

  // ==================== Company Filings ====================

  /**
   * Look up all filings for a specific company.
   *
   * Retrieves the full list of publications for a company identified
   * by its registration number and court.
   */
  async getCompanyFilings(
    registrationNumber: string,
    registrationCourt?: string
  ): Promise<ApiResponse<BundesanzeigerSearchResponse>> {
    await this.ensureAuthenticated();

    const params: Record<string, string> = {
      registration_number: registrationNumber,
    };
    if (registrationCourt) params.registration_court = registrationCourt;

    return this.get<BundesanzeigerSearchResponse>("/v1/publications", params);
  }

  // ==================== Publication Submission ====================

  /**
   * Submit a publication (e.g., annual report) to Bundesanzeiger.
   *
   * Submits financial statements or other mandatory publications
   * for processing and publication in the Federal Gazette.
   */
  async submitPublication(
    publication: BundesanzeigerPublication
  ): Promise<ApiResponse<BundesanzeigerSubmissionResult>> {
    await this.ensureAuthenticated();
    return this.post<BundesanzeigerSubmissionResult>("/v1/publications/submit", publication);
  }

  /**
   * Check the status of a submitted publication.
   */
  async getPublicationStatus(
    publicationId: string
  ): Promise<ApiResponse<BundesanzeigerStatusResponse>> {
    await this.ensureAuthenticated();
    return this.get<BundesanzeigerStatusResponse>(
      `/v1/publications/${publicationId}/status`
    );
  }

  // ==================== Authentication ====================

  /**
   * Authenticate with the Bundesanzeiger Publikations-Plattform.
   *
   * Obtains a session token using username/password credentials.
   */
  private async authenticate(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
      }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "Unknown error");
      throw new IntegrationError(
        "AUTH_ERROR",
        `Bundesanzeiger authentication failed: ${error}`,
        response.status
      );
    }

    const data = (await response.json()) as {
      sessionToken: string;
      expiresIn: number;
    };

    this.sessionToken = data.sessionToken;
    this.sessionExpiresAt = Date.now() + data.expiresIn * 1000 - 60_000;
    this.credentials.accessToken = data.sessionToken;
  }

  /** Ensure we have a valid session. */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.sessionToken || Date.now() >= this.sessionExpiresAt) {
      await this.authenticate();
    }
  }

  // ==================== Connection Test ====================

  /** Test the connection by authenticating with Bundesanzeiger. */
  async testConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch {
      return false;
    }
  }
}

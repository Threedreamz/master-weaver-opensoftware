import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  EurLexClientConfig,
  EurLexSearchParams,
  EurLexSearchResponse,
  EurLexDocumentContent,
  EurLexRecentParams,
  EurLexRecentResponse,
  EurLexLanguage,
} from "./types.js";

const EURLEX_BASE_URL = "https://eur-lex.europa.eu/eurlex-ws/rest";

/**
 * EUR-Lex API client for accessing European Union legislation.
 *
 * Provides search across EU legislation, case-law, and legal acts.
 * No authentication required. Uses the EUR-Lex REST web service.
 *
 * @see https://eur-lex.europa.eu/content/tools/webservices/SearchWebServiceUserManual_v2.00.pdf
 */
export class EurLexClient extends BaseIntegrationClient {
  private defaultLanguage: EurLexLanguage;

  constructor(config: EurLexClientConfig = {}) {
    super({
      baseUrl: EURLEX_BASE_URL,
      authType: "none",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
      defaultHeaders: {
        Accept: "application/json",
      },
    });

    this.defaultLanguage = config.defaultLanguage ?? "en";
  }

  // ==================== Search ====================

  /**
   * Search EUR-Lex for legislation, case-law, and other legal documents.
   *
   * Builds an expert search query from the provided parameters and
   * submits it to the EUR-Lex search web service.
   */
  async searchLegislation(
    params: EurLexSearchParams
  ): Promise<ApiResponse<EurLexSearchResponse>> {
    const expertQuery = this.buildExpertQuery(params);
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 20, 100);

    return this.request<EurLexSearchResponse>({
      method: "POST",
      path: "/search",
      body: {
        expertQuery,
        page,
        pageSize,
        language: params.language ?? this.defaultLanguage,
        sortBy: params.sortBy ?? "relevance",
        sortOrder: params.sortOrder ?? "desc",
      },
    });
  }

  // ==================== Get Document ====================

  /**
   * Retrieve a full document by its CELEX number.
   *
   * The CELEX number is the unique identifier for EU legal documents,
   * e.g., "32016R0679" for the GDPR.
   */
  async getDocumentByCelex(
    celexNumber: string,
    language?: EurLexLanguage
  ): Promise<ApiResponse<EurLexDocumentContent>> {
    const lang = language ?? this.defaultLanguage;

    return this.get<EurLexDocumentContent>("/document", {
      celex: celexNumber,
      language: lang,
    });
  }

  /**
   * Retrieve a document by its ELI (European Legislation Identifier) URI.
   */
  async getDocumentByEli(
    eliUri: string,
    language?: EurLexLanguage
  ): Promise<ApiResponse<EurLexDocumentContent>> {
    const lang = language ?? this.defaultLanguage;

    return this.get<EurLexDocumentContent>("/document", {
      eli: eliUri,
      language: lang,
    });
  }

  // ==================== Recent Publications ====================

  /**
   * Fetch recent publications from the Official Journal of the EU.
   *
   * Returns documents published in the OJ within the specified lookback
   * window (default: 7 days).
   */
  async getRecentPublications(
    params: EurLexRecentParams = {}
  ): Promise<ApiResponse<EurLexRecentResponse>> {
    const daysBack = params.daysBack ?? 7;
    const dateTo = new Date().toISOString().split("T")[0]!;
    const dateFrom = new Date(Date.now() - daysBack * 86_400_000)
      .toISOString()
      .split("T")[0]!;

    const queryParts: string[] = [
      `DD >= ${dateFrom}`,
      `DD <= ${dateTo}`,
    ];

    if (params.ojSeries) {
      queryParts.push(`OJ_SERIES = ${params.ojSeries}`);
    }

    if (params.resourceType) {
      queryParts.push(`TY = ${params.resourceType}`);
    }

    return this.request<EurLexRecentResponse>({
      method: "POST",
      path: "/search",
      body: {
        expertQuery: queryParts.join(" AND "),
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        language: params.language ?? this.defaultLanguage,
        sortBy: "date",
        sortOrder: "desc",
      },
    });
  }

  // ==================== Helpers ====================

  /**
   * Build an EUR-Lex expert search query string from structured parameters.
   */
  private buildExpertQuery(params: EurLexSearchParams): string {
    const parts: string[] = [];

    if (params.query) {
      parts.push(`TEXT = "${params.query}"`);
    }

    if (params.resourceType) {
      parts.push(`TY = ${params.resourceType}`);
    }

    if (params.documentType) {
      parts.push(`FM = ${params.documentType}`);
    }

    if (params.dateFrom) {
      parts.push(`DD >= ${params.dateFrom}`);
    }

    if (params.dateTo) {
      parts.push(`DD <= ${params.dateTo}`);
    }

    if (params.author) {
      parts.push(`AU = "${params.author}"`);
    }

    if (params.subjectMatter) {
      parts.push(`CT = "${params.subjectMatter}"`);
    }

    if (params.directoryCode) {
      parts.push(`DC = ${params.directoryCode}`);
    }

    if (params.inForceOnly) {
      parts.push("IF = true");
    }

    return parts.join(" AND ");
  }
}

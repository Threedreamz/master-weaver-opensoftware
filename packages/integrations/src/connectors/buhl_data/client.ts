import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  BuhlDataClientConfig,
  BuhlTaxCase,
  BuhlExportRequest,
  BuhlExportResult,
  BuhlImportRequest,
  BuhlImportResult,
  BuhlPaginationParams,
  BuhlListResponse,
  BuhlDataCategory,
  BuhlDataBlock,
} from "./types.js";

const BUHL_BASE_URL = "https://api.buhl.de";
const BUHL_SANDBOX_URL = "https://sandbox-api.buhl.de";

/**
 * Buhl / WISO tax software data exchange client.
 *
 * Enables import/export of tax data between OpenAccounting and Buhl's
 * WISO Steuer product line (WISO Steuer, tax:Mac, etc.).
 *
 * Uses API key authentication.
 */
export class BuhlDataClient extends BaseIntegrationClient {
  private product: string | undefined;

  constructor(config: BuhlDataClientConfig) {
    const baseUrl =
      config.environment === "sandbox" ? BUHL_SANDBOX_URL : BUHL_BASE_URL;

    super({
      baseUrl,
      authType: "api_key",
      credentials: {
        apiKey: config.apiKey,
        headerName: "X-Buhl-Api-Key",
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
    });

    this.product = config.product;
  }

  // ==================== Tax Cases ====================

  /** List tax cases. */
  async listTaxCases(
    pagination?: BuhlPaginationParams
  ): Promise<ApiResponse<BuhlListResponse<BuhlTaxCase>>> {
    const params: Record<string, string> = {};
    if (pagination?.offset != null) params.offset = String(pagination.offset);
    if (pagination?.limit != null) params.limit = String(pagination.limit);
    if (this.product) params.product = this.product;

    return this.get<BuhlListResponse<BuhlTaxCase>>("/v1/tax-cases", params);
  }

  /** Get a specific tax case by ID. */
  async getTaxCase(caseId: string): Promise<ApiResponse<BuhlTaxCase>> {
    return this.get<BuhlTaxCase>(`/v1/tax-cases/${caseId}`);
  }

  /** Get tax cases for a specific year. */
  async getTaxCasesByYear(
    year: number,
    pagination?: BuhlPaginationParams
  ): Promise<ApiResponse<BuhlListResponse<BuhlTaxCase>>> {
    const params: Record<string, string> = {
      tax_year: String(year),
    };
    if (pagination?.offset != null) params.offset = String(pagination.offset);
    if (pagination?.limit != null) params.limit = String(pagination.limit);

    return this.get<BuhlListResponse<BuhlTaxCase>>("/v1/tax-cases", params);
  }

  // ==================== Data Export ====================

  /** Export data from a tax case. */
  async exportData(
    request: BuhlExportRequest
  ): Promise<ApiResponse<BuhlExportResult>> {
    return this.post<BuhlExportResult>(
      `/v1/tax-cases/${request.taxCaseId}/export`,
      {
        categories: request.categories,
        format: request.format,
      }
    );
  }

  /** Export a single data category from a tax case. */
  async exportCategory(
    caseId: string,
    category: BuhlDataCategory
  ): Promise<ApiResponse<BuhlDataBlock>> {
    return this.get<BuhlDataBlock>(
      `/v1/tax-cases/${caseId}/data/${category}`
    );
  }

  // ==================== Data Import ====================

  /** Import data into a tax case (creates one if needed). */
  async importData(
    request: BuhlImportRequest
  ): Promise<ApiResponse<BuhlImportResult>> {
    return this.post<BuhlImportResult>("/v1/tax-cases/import", request);
  }

  /** Import a single data block into a tax case. */
  async importCategory(
    caseId: string,
    block: BuhlDataBlock,
    mergeStrategy: "merge" | "replace" = "merge"
  ): Promise<ApiResponse<BuhlImportResult>> {
    return this.put<BuhlImportResult>(
      `/v1/tax-cases/${caseId}/data/${block.category}`,
      {
        data: block.data,
        metadata: block.metadata,
        merge_strategy: mergeStrategy,
      }
    );
  }

  // ==================== Connection Test ====================

  /** Test the API connection by verifying the API key. */
  async testConnection(): Promise<boolean> {
    try {
      await this.get("/v1/ping");
      return true;
    } catch {
      return false;
    }
  }
}

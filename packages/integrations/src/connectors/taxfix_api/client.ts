import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  TaxfixClientConfig,
  TaxfixTaxReturn,
  TaxfixTaxYear,
  TaxfixIncomeRecord,
  TaxfixDeductionRecord,
  TaxfixDataExport,
  TaxfixDataImport,
  TaxfixImportResult,
  TaxfixPaginationParams,
  TaxfixListResponse,
} from "./types.js";

const TAXFIX_BASE_URL = "https://api.taxfix.de";
const TAXFIX_SANDBOX_URL = "https://sandbox-api.taxfix.de";

/**
 * Taxfix API client for tax data import/export.
 *
 * Provides access to German personal tax return data including
 * income records, deductions, and full data export/import.
 *
 * Uses API key authentication.
 */
export class TaxfixApiClient extends BaseIntegrationClient {
  constructor(config: TaxfixClientConfig) {
    const baseUrl =
      config.environment === "sandbox" ? TAXFIX_SANDBOX_URL : TAXFIX_BASE_URL;

    super({
      baseUrl,
      authType: "api_key",
      credentials: {
        apiKey: config.apiKey,
        headerName: "X-Taxfix-Api-Key",
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
    });
  }

  // ==================== Tax Returns ====================

  /** List tax returns with optional pagination. */
  async listTaxReturns(
    pagination?: TaxfixPaginationParams
  ): Promise<ApiResponse<TaxfixListResponse<TaxfixTaxReturn>>> {
    const params: Record<string, string> = {};
    if (pagination?.page != null) params.page = String(pagination.page);
    if (pagination?.perPage != null) params.per_page = String(pagination.perPage);
    if (pagination?.sortBy) params.sort_by = pagination.sortBy;
    if (pagination?.sortOrder) params.sort_order = pagination.sortOrder;

    return this.get<TaxfixListResponse<TaxfixTaxReturn>>("/v1/tax-returns", params);
  }

  /** Get a specific tax return by ID. */
  async getTaxReturn(returnId: string): Promise<ApiResponse<TaxfixTaxReturn>> {
    return this.get<TaxfixTaxReturn>(`/v1/tax-returns/${returnId}`);
  }

  /** Get tax returns for a specific tax year. */
  async getTaxReturnsByYear(
    year: TaxfixTaxYear
  ): Promise<ApiResponse<TaxfixListResponse<TaxfixTaxReturn>>> {
    return this.get<TaxfixListResponse<TaxfixTaxReturn>>("/v1/tax-returns", {
      tax_year: String(year),
    });
  }

  // ==================== Income Records ====================

  /** List income records for a tax return. */
  async listIncomeRecords(
    returnId: string,
    pagination?: TaxfixPaginationParams
  ): Promise<ApiResponse<TaxfixListResponse<TaxfixIncomeRecord>>> {
    const params: Record<string, string> = {};
    if (pagination?.page != null) params.page = String(pagination.page);
    if (pagination?.perPage != null) params.per_page = String(pagination.perPage);

    return this.get<TaxfixListResponse<TaxfixIncomeRecord>>(
      `/v1/tax-returns/${returnId}/income-records`,
      params
    );
  }

  /** Get a single income record. */
  async getIncomeRecord(
    returnId: string,
    recordId: string
  ): Promise<ApiResponse<TaxfixIncomeRecord>> {
    return this.get<TaxfixIncomeRecord>(
      `/v1/tax-returns/${returnId}/income-records/${recordId}`
    );
  }

  // ==================== Deductions ====================

  /** List deductions for a tax return. */
  async listDeductions(
    returnId: string,
    pagination?: TaxfixPaginationParams
  ): Promise<ApiResponse<TaxfixListResponse<TaxfixDeductionRecord>>> {
    const params: Record<string, string> = {};
    if (pagination?.page != null) params.page = String(pagination.page);
    if (pagination?.perPage != null) params.per_page = String(pagination.perPage);

    return this.get<TaxfixListResponse<TaxfixDeductionRecord>>(
      `/v1/tax-returns/${returnId}/deductions`,
      params
    );
  }

  // ==================== Data Export ====================

  /** Export all tax data for a specific return. */
  async exportTaxData(
    returnId: string,
    format: "json" | "csv" | "elster_xml" = "json"
  ): Promise<ApiResponse<TaxfixDataExport>> {
    return this.get<TaxfixDataExport>(
      `/v1/tax-returns/${returnId}/export`,
      { format }
    );
  }

  // ==================== Data Import ====================

  /** Import tax data (income records and deductions). */
  async importTaxData(
    data: TaxfixDataImport
  ): Promise<ApiResponse<TaxfixImportResult>> {
    return this.post<TaxfixImportResult>("/v1/tax-returns/import", data);
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

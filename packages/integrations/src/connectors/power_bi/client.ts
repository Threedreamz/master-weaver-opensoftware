import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  PowerBIClientConfig,
  PowerBIDataset,
  PowerBIDatasetCreateRequest,
  PowerBIRefreshRequest,
  PowerBIRefreshHistoryEntry,
  PowerBIReport,
  PowerBIExportRequest,
  PowerBIExportStatus,
  PowerBIDashboard,
  PowerBITile,
  PowerBIPushRowsRequest,
  PowerBIEmbedTokenRequest,
  PowerBIEmbedToken,
  PowerBIListResponse,
} from "./types.js";

const POWER_BI_BASE_URL = "https://api.powerbi.com/v1.0/myorg";

/**
 * Microsoft Power BI REST API client.
 *
 * Manages datasets, reports, dashboards, and push data rows.
 *
 * Uses OAuth2 authentication via Azure AD access token.
 */
export class PowerBIClient extends BaseIntegrationClient {
  private readonly groupId?: string;

  constructor(config: PowerBIClientConfig) {
    super({
      baseUrl: POWER_BI_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
    });
    this.groupId = config.groupId;
  }

  /** Build path prefix for group or personal workspace. */
  private groupPath(): string {
    return this.groupId ? `/groups/${this.groupId}` : "";
  }

  // ==================== Datasets ====================

  /** List datasets. */
  async listDatasets(): Promise<ApiResponse<PowerBIListResponse<PowerBIDataset>>> {
    return this.get<PowerBIListResponse<PowerBIDataset>>(
      `${this.groupPath()}/datasets`
    );
  }

  /** Get a dataset by ID. */
  async getDataset(datasetId: string): Promise<ApiResponse<PowerBIDataset>> {
    return this.get<PowerBIDataset>(
      `${this.groupPath()}/datasets/${datasetId}`
    );
  }

  /** Create a push dataset. */
  async createDataset(
    data: PowerBIDatasetCreateRequest
  ): Promise<ApiResponse<PowerBIDataset>> {
    return this.post<PowerBIDataset>(
      `${this.groupPath()}/datasets`,
      data
    );
  }

  /** Delete a dataset. */
  async deleteDataset(datasetId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(
      `${this.groupPath()}/datasets/${datasetId}`
    );
  }

  /** Trigger a dataset refresh. */
  async refreshDataset(
    datasetId: string,
    data?: PowerBIRefreshRequest
  ): Promise<ApiResponse<void>> {
    return this.post<void>(
      `${this.groupPath()}/datasets/${datasetId}/refreshes`,
      data ?? {}
    );
  }

  /** Get refresh history for a dataset. */
  async getRefreshHistory(
    datasetId: string
  ): Promise<ApiResponse<PowerBIListResponse<PowerBIRefreshHistoryEntry>>> {
    return this.get<PowerBIListResponse<PowerBIRefreshHistoryEntry>>(
      `${this.groupPath()}/datasets/${datasetId}/refreshes`
    );
  }

  // ==================== Push Rows ====================

  /** Push rows to a dataset table. */
  async pushRows(
    datasetId: string,
    tableName: string,
    data: PowerBIPushRowsRequest
  ): Promise<ApiResponse<void>> {
    return this.post<void>(
      `${this.groupPath()}/datasets/${datasetId}/tables/${tableName}/rows`,
      data
    );
  }

  /** Delete all rows from a dataset table. */
  async deleteRows(
    datasetId: string,
    tableName: string
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(
      `${this.groupPath()}/datasets/${datasetId}/tables/${tableName}/rows`
    );
  }

  // ==================== Reports ====================

  /** List reports. */
  async listReports(): Promise<ApiResponse<PowerBIListResponse<PowerBIReport>>> {
    return this.get<PowerBIListResponse<PowerBIReport>>(
      `${this.groupPath()}/reports`
    );
  }

  /** Get a report by ID. */
  async getReport(reportId: string): Promise<ApiResponse<PowerBIReport>> {
    return this.get<PowerBIReport>(
      `${this.groupPath()}/reports/${reportId}`
    );
  }

  /** Delete a report. */
  async deleteReport(reportId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(
      `${this.groupPath()}/reports/${reportId}`
    );
  }

  /** Export a report to file (starts async export). */
  async exportReport(
    reportId: string,
    data: PowerBIExportRequest
  ): Promise<ApiResponse<PowerBIExportStatus>> {
    return this.post<PowerBIExportStatus>(
      `${this.groupPath()}/reports/${reportId}/ExportTo`,
      data
    );
  }

  /** Get export status. */
  async getExportStatus(
    reportId: string,
    exportId: string
  ): Promise<ApiResponse<PowerBIExportStatus>> {
    return this.get<PowerBIExportStatus>(
      `${this.groupPath()}/reports/${reportId}/exports/${exportId}`
    );
  }

  // ==================== Dashboards ====================

  /** List dashboards. */
  async listDashboards(): Promise<ApiResponse<PowerBIListResponse<PowerBIDashboard>>> {
    return this.get<PowerBIListResponse<PowerBIDashboard>>(
      `${this.groupPath()}/dashboards`
    );
  }

  /** Get a dashboard by ID. */
  async getDashboard(dashboardId: string): Promise<ApiResponse<PowerBIDashboard>> {
    return this.get<PowerBIDashboard>(
      `${this.groupPath()}/dashboards/${dashboardId}`
    );
  }

  /** List tiles on a dashboard. */
  async listTiles(
    dashboardId: string
  ): Promise<ApiResponse<PowerBIListResponse<PowerBITile>>> {
    return this.get<PowerBIListResponse<PowerBITile>>(
      `${this.groupPath()}/dashboards/${dashboardId}/tiles`
    );
  }

  // ==================== Embed Tokens ====================

  /** Generate an embed token for a report. */
  async generateReportEmbedToken(
    reportId: string,
    data: PowerBIEmbedTokenRequest
  ): Promise<ApiResponse<PowerBIEmbedToken>> {
    return this.post<PowerBIEmbedToken>(
      `${this.groupPath()}/reports/${reportId}/GenerateToken`,
      data
    );
  }

  /** Generate an embed token for a dataset. */
  async generateDatasetEmbedToken(
    datasetId: string,
    data: PowerBIEmbedTokenRequest
  ): Promise<ApiResponse<PowerBIEmbedToken>> {
    return this.post<PowerBIEmbedToken>(
      `${this.groupPath()}/datasets/${datasetId}/GenerateToken`,
      data
    );
  }

  // ==================== Connection Test ====================

  /** Verify credentials by listing datasets. */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.listDatasets();
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

/**
 * Google Analytics Data API v1beta client.
 *
 * OAuth2 scopes required:
 *   - https://www.googleapis.com/auth/analytics.readonly
 *
 * @see https://developers.google.com/analytics/devguides/reporting/data/v1
 */

import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  RunReportRequest,
  RunReportResponse,
  RunRealtimeReportRequest,
  RunRealtimeReportResponse,
  MetadataResponse,
} from "./types.js";

const BASE_URL = "https://analyticsdata.googleapis.com/v1beta";

export class GoogleAnalyticsClient extends BaseIntegrationClient {
  private readonly propertyId: string;

  /**
   * @param propertyId - GA4 property ID (numeric, e.g. "123456789")
   * @param accessToken - OAuth2 access token
   */
  constructor(propertyId: string, accessToken: string) {
    super({
      baseUrl: BASE_URL,
      authType: "oauth2",
      credentials: { accessToken },
      rateLimit: { requestsPerMinute: 60 },
    });
    this.propertyId = propertyId;
  }

  // ── Run Report ────────────────────────────────────────────────

  /**
   * Run a standard report for the GA4 property.
   * Returns dimension and metric data for the specified date ranges.
   *
   * @param request - Report request parameters
   */
  async runReport(request: RunReportRequest): Promise<ApiResponse<RunReportResponse>> {
    return this.post<RunReportResponse>(
      `/properties/${this.propertyId}:runReport`,
      request,
    );
  }

  /**
   * Run a pivot report for multi-dimensional breakdowns.
   * This is a convenience wrapper that sends a standard report
   * with specific dimension/metric combinations.
   */
  async runReportForDateRange(
    startDate: string,
    endDate: string,
    metrics: string[],
    dimensions?: string[],
    limit?: number,
  ): Promise<ApiResponse<RunReportResponse>> {
    const request: RunReportRequest = {
      dateRanges: [{ startDate, endDate }],
      metrics: metrics.map((name) => ({ name })),
      dimensions: dimensions?.map((name) => ({ name })),
      limit,
    };
    return this.runReport(request);
  }

  // ── Realtime Report ───────────────────────────────────────────

  /**
   * Run a realtime report for the GA4 property.
   * Returns data from the last 30 minutes by default.
   *
   * @param request - Realtime report request parameters
   */
  async runRealtimeReport(
    request: RunRealtimeReportRequest,
  ): Promise<ApiResponse<RunRealtimeReportResponse>> {
    return this.post<RunRealtimeReportResponse>(
      `/properties/${this.propertyId}:runRealtimeReport`,
      request,
    );
  }

  /**
   * Get current active users with optional dimension breakdown.
   */
  async getActiveUsers(
    dimensions?: string[],
  ): Promise<ApiResponse<RunRealtimeReportResponse>> {
    return this.runRealtimeReport({
      metrics: [{ name: "activeUsers" }],
      dimensions: dimensions?.map((name) => ({ name })),
    });
  }

  // ── Metadata ──────────────────────────────────────────────────

  /**
   * Get available dimensions and metrics metadata for the property.
   * Useful for discovering what fields can be used in reports.
   */
  async getMetadata(): Promise<ApiResponse<MetadataResponse>> {
    return this.get<MetadataResponse>(
      `/properties/${this.propertyId}/metadata`,
    );
  }

  // ── Batch Reports ─────────────────────────────────────────────

  /**
   * Run multiple reports in a single request.
   * Accepts up to 5 report requests.
   *
   * @param requests - Array of report requests (max 5)
   */
  async batchRunReports(
    requests: RunReportRequest[],
  ): Promise<ApiResponse<{ reports: RunReportResponse[]; kind: string }>> {
    if (requests.length > 5) {
      throw new Error("batchRunReports accepts a maximum of 5 requests");
    }
    return this.post<{ reports: RunReportResponse[]; kind: string }>(
      `/properties/${this.propertyId}:batchRunReports`,
      { requests },
    );
  }
}

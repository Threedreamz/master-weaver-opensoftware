// ==================== Screaming Frog SEO Spider Client ====================

import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  ScreamingFrogClientConfig,
  CrawlConfig,
  CrawlJob,
  CrawlResult,
  CrawlSummary,
  CrawlResultsParams,
  PaginatedResponse,
} from "./types.js";

export class ScreamingFrogClient extends BaseIntegrationClient {
  constructor(config: ScreamingFrogClientConfig) {
    super({
      baseUrl: config.baseUrl ?? "https://api.screamingfrog.co.uk",
      authType: "api_key",
      credentials: {
        apiKey: config.licenseKey,
        headerName: "X-License-Key",
      },
      timeout: config.timeout ?? 60_000,
      rateLimit: { requestsPerMinute: 10 },
    });
  }

  // ==================== Crawl Configuration & Lifecycle ====================

  /** Create a new crawl job with the given configuration */
  async createCrawl(config: CrawlConfig): Promise<CrawlJob> {
    const response = await this.post<CrawlJob>("/v1/crawls", config);
    return response.data;
  }

  /** Start a queued crawl */
  async startCrawl(crawlId: string): Promise<CrawlJob> {
    const response = await this.post<CrawlJob>(`/v1/crawls/${crawlId}/start`);
    return response.data;
  }

  /** Pause a running crawl */
  async pauseCrawl(crawlId: string): Promise<CrawlJob> {
    const response = await this.post<CrawlJob>(`/v1/crawls/${crawlId}/pause`);
    return response.data;
  }

  /** Resume a paused crawl */
  async resumeCrawl(crawlId: string): Promise<CrawlJob> {
    const response = await this.post<CrawlJob>(`/v1/crawls/${crawlId}/resume`);
    return response.data;
  }

  /** Stop/cancel a running or paused crawl */
  async stopCrawl(crawlId: string): Promise<CrawlJob> {
    const response = await this.post<CrawlJob>(`/v1/crawls/${crawlId}/stop`);
    return response.data;
  }

  /** Delete a crawl and its results */
  async deleteCrawl(crawlId: string): Promise<void> {
    await this.delete(`/v1/crawls/${crawlId}`);
  }

  // ==================== Crawl Status ====================

  /** Get the status of a specific crawl */
  async getCrawl(crawlId: string): Promise<CrawlJob> {
    const response = await this.get<CrawlJob>(`/v1/crawls/${crawlId}`);
    return response.data;
  }

  /** List all crawl jobs */
  async listCrawls(page = 0, pageSize = 20): Promise<PaginatedResponse<CrawlJob>> {
    const response = await this.get<PaginatedResponse<CrawlJob>>("/v1/crawls", {
      page: String(page),
      pageSize: String(pageSize),
    });
    return response.data;
  }

  // ==================== Crawl Results ====================

  /** Get paginated crawl results with optional filters */
  async getCrawlResults(
    crawlId: string,
    params?: CrawlResultsParams
  ): Promise<PaginatedResponse<CrawlResult>> {
    const queryParams: Record<string, string> = {};

    if (params) {
      if (params.statusCode !== undefined) queryParams.statusCode = String(params.statusCode);
      if (params.contentType) queryParams.contentType = params.contentType;
      if (params.indexable !== undefined) queryParams.indexable = String(params.indexable);
      if (params.urlPattern) queryParams.urlPattern = params.urlPattern;
      if (params.sortBy) queryParams.sortBy = params.sortBy;
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
      if (params.page !== undefined) queryParams.page = String(params.page);
      if (params.pageSize !== undefined) queryParams.pageSize = String(params.pageSize);
    }

    const response = await this.get<PaginatedResponse<CrawlResult>>(
      `/v1/crawls/${crawlId}/results`,
      queryParams
    );
    return response.data;
  }

  /** Get the aggregated summary for a completed crawl */
  async getCrawlSummary(crawlId: string): Promise<CrawlSummary> {
    const response = await this.get<CrawlSummary>(`/v1/crawls/${crawlId}/summary`);
    return response.data;
  }

  /** Get results for a specific URL within a crawl */
  async getUrlResult(crawlId: string, url: string): Promise<CrawlResult> {
    const response = await this.get<CrawlResult>(
      `/v1/crawls/${crawlId}/results/url`,
      { url }
    );
    return response.data;
  }

  /** Export crawl results as CSV (returns download URL) */
  async exportResults(crawlId: string, format: "csv" | "xlsx" = "csv"): Promise<string> {
    const response = await this.post<{ downloadUrl: string }>(
      `/v1/crawls/${crawlId}/export`,
      { format }
    );
    return response.data.downloadUrl;
  }

  // ==================== Convenience Methods ====================

  /** Create and immediately start a crawl */
  async createAndStartCrawl(config: CrawlConfig): Promise<CrawlJob> {
    const job = await this.createCrawl(config);
    return this.startCrawl(job.id);
  }

  /**
   * Poll a crawl until it completes or fails.
   * @param crawlId - The crawl job ID
   * @param intervalMs - Polling interval in milliseconds (default: 10s)
   * @param maxWaitMs - Maximum wait time in milliseconds (default: 30min)
   */
  async waitForCrawl(
    crawlId: string,
    intervalMs = 10_000,
    maxWaitMs = 30 * 60_000
  ): Promise<CrawlJob> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const job = await this.getCrawl(crawlId);

      if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
        return job;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Crawl ${crawlId} did not complete within ${maxWaitMs}ms`);
  }

  // ==================== Connection Test ====================

  /** Test the license key by listing crawls */
  async testConnection(): Promise<boolean> {
    try {
      await this.listCrawls(0, 1);
      return true;
    } catch {
      return false;
    }
  }
}

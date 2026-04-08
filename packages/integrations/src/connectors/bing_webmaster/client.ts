// ==================== Bing Webmaster Tools Client ====================

import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  BingWebmasterClientConfig,
  BingUrlSubmission,
  BingUrlBatchSubmission,
  BingUrlSubmissionQuota,
  BingCrawlStats,
  BingCrawlIssue,
  BingKeywordData,
  BingKeywordParams,
  BingUrlTraffic,
  BingUrlTrafficParams,
  BingSite,
  BingApiResponse,
} from "./types.js";

export class BingWebmasterClient extends BaseIntegrationClient {
  constructor(config: BingWebmasterClientConfig) {
    super({
      baseUrl: "https://ssl.bing.com/webmaster/api.svc/json",
      authType: "api_key",
      credentials: {
        apiKey: config.apiKey,
        headerName: "x-ms-apikey",
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
    });
  }

  // ==================== Sites ====================

  /** List all verified sites */
  async getSites(): Promise<BingSite[]> {
    const response = await this.get<BingApiResponse<BingSite[]>>("/GetUserSites");
    return response.data.d;
  }

  /** Add a new site to monitor */
  async addSite(siteUrl: string): Promise<void> {
    await this.post("/AddSite", { siteUrl });
  }

  // ==================== URL Submission ====================

  /** Submit a single URL for crawling */
  async submitUrl(submission: BingUrlSubmission): Promise<void> {
    await this.post("/SubmitUrl", {
      siteUrl: submission.siteUrl,
      url: submission.url,
    });
  }

  /** Submit a batch of URLs for crawling */
  async submitUrlBatch(submission: BingUrlBatchSubmission): Promise<void> {
    await this.post("/SubmitUrlbatch", {
      siteUrl: submission.siteUrl,
      urlList: submission.urlList,
    });
  }

  /** Get current URL submission quota */
  async getUrlSubmissionQuota(siteUrl: string): Promise<BingUrlSubmissionQuota> {
    const response = await this.get<BingApiResponse<BingUrlSubmissionQuota>>(
      "/GetUrlSubmissionQuota",
      { siteUrl }
    );
    return response.data.d;
  }

  // ==================== Crawl Stats ====================

  /** Get crawl statistics for a site */
  async getCrawlStats(siteUrl: string): Promise<BingCrawlStats[]> {
    const response = await this.get<BingApiResponse<BingCrawlStats[]>>(
      "/GetCrawlStats",
      { siteUrl }
    );
    return response.data.d;
  }

  /** Get crawl issues for a site */
  async getCrawlIssues(siteUrl: string): Promise<BingCrawlIssue[]> {
    const response = await this.get<BingApiResponse<BingCrawlIssue[]>>(
      "/GetCrawlIssues",
      { siteUrl }
    );
    return response.data.d;
  }

  // ==================== Keyword Data ====================

  /** Get keyword data (search queries) for a site */
  async getKeywordData(params: BingKeywordParams): Promise<BingKeywordData[]> {
    const queryParams: Record<string, string> = {
      siteUrl: params.siteUrl,
    };
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;
    if (params.page !== undefined) queryParams.page = String(params.page);

    const response = await this.get<BingApiResponse<BingKeywordData[]>>(
      "/GetQueryStats",
      queryParams
    );
    return response.data.d;
  }

  // ==================== URL Traffic ====================

  /** Get traffic data for URLs */
  async getUrlTraffic(params: BingUrlTrafficParams): Promise<BingUrlTraffic[]> {
    const queryParams: Record<string, string> = {
      siteUrl: params.siteUrl,
    };
    if (params.url) queryParams.url = params.url;
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;
    if (params.page !== undefined) queryParams.page = String(params.page);

    const response = await this.get<BingApiResponse<BingUrlTraffic[]>>(
      "/GetPageStats",
      queryParams
    );
    return response.data.d;
  }

  // ==================== Connection Test ====================

  /** Test the API key by fetching the sites list */
  async testConnection(): Promise<boolean> {
    try {
      await this.getSites();
      return true;
    } catch {
      return false;
    }
  }
}

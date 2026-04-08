/**
 * Google Indexing API v3 client.
 *
 * Authentication: OAuth2 with service account.
 * Scope: https://www.googleapis.com/auth/indexing
 *
 * @see https://developers.google.com/search/apis/indexing-api/v3/reference
 */

import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  UrlNotificationType,
  PublishUrlNotificationRequest,
  PublishUrlNotificationResponse,
  UrlNotificationMetadata,
  BatchUrlNotificationResponse,
} from "./types.js";

const BASE_URL = "https://indexing.googleapis.com/v3";

/** Daily quota: 200 requests per day by default. */
const DEFAULT_DAILY_QUOTA = 200;

export class GoogleIndexingClient extends BaseIntegrationClient {
  private requestCount = 0;
  private readonly dailyQuota: number;

  /**
   * @param accessToken - OAuth2 access token (typically from a service account)
   * @param dailyQuota - Daily request quota (default: 200)
   */
  constructor(accessToken: string, dailyQuota = DEFAULT_DAILY_QUOTA) {
    super({
      baseUrl: BASE_URL,
      authType: "oauth2",
      credentials: { accessToken },
      rateLimit: { requestsPerMinute: 60 },
    });
    this.dailyQuota = dailyQuota;
  }

  // ── Publish URL Notification ──────────────────────────────────

  /**
   * Publish a URL notification to inform Google about a URL change.
   *
   * @param url - The fully qualified URL to notify about
   * @param type - "URL_UPDATED" for new/changed content, "URL_DELETED" for removed content
   */
  async publishUrlNotification(
    url: string,
    type: UrlNotificationType,
  ): Promise<ApiResponse<PublishUrlNotificationResponse>> {
    this.checkQuota();

    const body: PublishUrlNotificationRequest = { url, type };

    const result = await this.post<PublishUrlNotificationResponse>(
      "/urlNotifications:publish",
      body,
    );

    this.requestCount++;
    return result;
  }

  /**
   * Notify Google that a URL has been updated or added.
   */
  async notifyUrlUpdated(url: string): Promise<ApiResponse<PublishUrlNotificationResponse>> {
    return this.publishUrlNotification(url, "URL_UPDATED");
  }

  /**
   * Notify Google that a URL has been deleted.
   */
  async notifyUrlDeleted(url: string): Promise<ApiResponse<PublishUrlNotificationResponse>> {
    return this.publishUrlNotification(url, "URL_DELETED");
  }

  // ── Get Notification Status ───────────────────────────────────

  /**
   * Get the most recent notification status for a URL.
   *
   * @param url - The URL to check notification status for
   */
  async getNotificationStatus(url: string): Promise<ApiResponse<UrlNotificationMetadata>> {
    return this.get<UrlNotificationMetadata>(
      "/urlNotifications/metadata",
      { url },
    );
  }

  // ── Batch Operations ──────────────────────────────────────────

  /**
   * Publish notifications for multiple URLs.
   * Processes sequentially to respect rate limits.
   *
   * @param urls - Array of URL/type pairs
   * @param delayMs - Delay between requests in milliseconds (default: 100ms)
   */
  async batchPublishNotifications(
    urls: Array<{ url: string; type: UrlNotificationType }>,
    delayMs = 100,
  ): Promise<BatchUrlNotificationResponse> {
    const results: BatchUrlNotificationResponse["results"] = [];

    for (const { url, type } of urls) {
      try {
        const response = await this.publishUrlNotification(url, type);
        results.push({
          url,
          type,
          notifyTime: response.data.urlNotificationMetadata.latestUpdate?.notifyTime
            ?? response.data.urlNotificationMetadata.latestRemove?.notifyTime,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          url,
          type,
          error: {
            code: 0,
            message,
            status: "UNKNOWN",
          },
        });
      }

      // Respect rate limits
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return { results };
  }

  /**
   * Batch update multiple URLs (all as URL_UPDATED).
   */
  async batchNotifyUpdated(
    urls: string[],
    delayMs = 100,
  ): Promise<BatchUrlNotificationResponse> {
    return this.batchPublishNotifications(
      urls.map((url) => ({ url, type: "URL_UPDATED" as const })),
      delayMs,
    );
  }

  // ── Quota Management ──────────────────────────────────────────

  /**
   * Get the remaining quota for today.
   */
  getRemainingQuota(): number {
    return Math.max(0, this.dailyQuota - this.requestCount);
  }

  /**
   * Reset the internal request counter (call at the start of each day).
   */
  resetQuotaCounter(): void {
    this.requestCount = 0;
  }

  private checkQuota(): void {
    if (this.requestCount >= this.dailyQuota) {
      throw new Error(
        `Google Indexing API daily quota exceeded (${this.dailyQuota} requests). ` +
        "Request a quota increase at https://console.cloud.google.com/",
      );
    }
  }
}

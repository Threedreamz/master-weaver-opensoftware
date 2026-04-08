/**
 * Google Search Console API client.
 *
 * OAuth2 scopes required:
 *   - https://www.googleapis.com/auth/webmasters.readonly (read-only)
 *   - https://www.googleapis.com/auth/webmasters (read-write)
 *
 * @see https://developers.google.com/webmaster-tools/v1/api_reference_index
 */

import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  SearchAnalyticsRequest,
  SearchAnalyticsResponse,
  InspectUrlRequest,
  InspectUrlResponse,
  Sitemap,
  SitemapsListResponse,
  Site,
  SitesListResponse,
} from "./types.js";

const BASE_URL = "https://www.googleapis.com/webmasters/v3";
const SEARCH_CONSOLE_URL = "https://searchconsole.googleapis.com/v1";

export class GoogleSearchConsoleClient extends BaseIntegrationClient {
  private readonly accessToken: string;

  constructor(accessToken: string) {
    super({
      baseUrl: BASE_URL,
      authType: "oauth2",
      credentials: { accessToken },
      rateLimit: { requestsPerMinute: 60 },
    });
    this.accessToken = accessToken;
  }

  // ── Search Analytics ──────────────────────────────────────────

  /**
   * Query search analytics data for a verified site.
   *
   * @param siteUrl - The site URL (e.g. "https://example.com/" or "sc-domain:example.com")
   * @param request - Search analytics query parameters
   */
  async querySearchAnalytics(
    siteUrl: string,
    request: SearchAnalyticsRequest,
  ): Promise<ApiResponse<SearchAnalyticsResponse>> {
    const encodedSiteUrl = encodeURIComponent(siteUrl);
    return this.post<SearchAnalyticsResponse>(
      `/sites/${encodedSiteUrl}/searchAnalytics/query`,
      request,
    );
  }

  // ── URL Inspection ────────────────────────────────────────────

  /**
   * Inspect a URL to get indexing status, mobile usability, and rich results.
   * Uses the Search Console API v1 endpoint (different base URL).
   */
  async inspectUrl(request: InspectUrlRequest): Promise<InspectUrlResponse> {
    // URL Inspection uses a different base URL
    const url = `${SEARCH_CONSOLE_URL}/urlInspection/index:inspect`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Authorization": `Bearer ${this.accessToken}`,
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`URL Inspection failed: ${response.status} ${error}`);
    }

    return response.json() as Promise<InspectUrlResponse>;
  }

  // ── Sitemaps ──────────────────────────────────────────────────

  /**
   * List all sitemaps submitted for a site.
   *
   * @param siteUrl - The site URL
   * @param sitemapIndex - Optional URL of a sitemap index to filter by
   */
  async listSitemaps(
    siteUrl: string,
    sitemapIndex?: string,
  ): Promise<ApiResponse<SitemapsListResponse>> {
    const encodedSiteUrl = encodeURIComponent(siteUrl);
    return this.get<SitemapsListResponse>(
      `/sites/${encodedSiteUrl}/sitemaps`,
      sitemapIndex ? { sitemapIndex } : undefined,
    );
  }

  /**
   * Get information about a specific sitemap.
   */
  async getSitemap(siteUrl: string, feedpath: string): Promise<ApiResponse<Sitemap>> {
    const encodedSiteUrl = encodeURIComponent(siteUrl);
    const encodedFeedpath = encodeURIComponent(feedpath);
    return this.get<Sitemap>(
      `/sites/${encodedSiteUrl}/sitemaps/${encodedFeedpath}`,
    );
  }

  /**
   * Submit a sitemap for a site.
   */
  async submitSitemap(siteUrl: string, feedpath: string): Promise<ApiResponse<void>> {
    const encodedSiteUrl = encodeURIComponent(siteUrl);
    const encodedFeedpath = encodeURIComponent(feedpath);
    return this.put<void>(
      `/sites/${encodedSiteUrl}/sitemaps/${encodedFeedpath}`,
    );
  }

  /**
   * Delete a sitemap from the site.
   */
  async deleteSitemap(siteUrl: string, feedpath: string): Promise<ApiResponse<void>> {
    const encodedSiteUrl = encodeURIComponent(siteUrl);
    const encodedFeedpath = encodeURIComponent(feedpath);
    return this.delete<void>(
      `/sites/${encodedSiteUrl}/sitemaps/${encodedFeedpath}`,
    );
  }

  // ── Sites ─────────────────────────────────────────────────────

  /**
   * List all sites the authenticated user has access to.
   */
  async listSites(): Promise<ApiResponse<SitesListResponse>> {
    return this.get<SitesListResponse>("/sites");
  }

  /**
   * Get information about a specific site.
   */
  async getSite(siteUrl: string): Promise<ApiResponse<Site>> {
    const encodedSiteUrl = encodeURIComponent(siteUrl);
    return this.get<Site>(`/sites/${encodedSiteUrl}`);
  }

  /**
   * Add a site to the user's Search Console.
   */
  async addSite(siteUrl: string): Promise<ApiResponse<void>> {
    const encodedSiteUrl = encodeURIComponent(siteUrl);
    return this.put<void>(`/sites/${encodedSiteUrl}`);
  }

  /**
   * Remove a site from the user's Search Console.
   */
  async removeSite(siteUrl: string): Promise<ApiResponse<void>> {
    const encodedSiteUrl = encodeURIComponent(siteUrl);
    return this.delete<void>(`/sites/${encodedSiteUrl}`);
  }
}

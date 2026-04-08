// ==================== Google My Business (Business Profile) Client ====================

import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  GoogleMyBusinessClientConfig,
  BusinessAccount,
  BusinessLocation,
  Review,
  ReviewReply,
  ListReviewsParams,
  ListReviewsResponse,
  LocalPost,
  CreatePostParams,
  ListPostsParams,
  ListPostsResponse,
  LocationInsights,
  InsightsParams,
  GoogleListResponse,
} from "./types.js";

/**
 * Google My Business / Business Profile API client.
 *
 * Uses multiple Google API endpoints:
 * - Account management: mybusinessaccountmanagement.googleapis.com
 * - Business info: mybusinessbusinessinformation.googleapis.com
 * - Reviews: mybusiness.googleapis.com (legacy, still used)
 * - Posts: mybusiness.googleapis.com
 * - Insights: mybusiness.googleapis.com
 */
export class GoogleMyBusinessClient extends BaseIntegrationClient {
  constructor(config: GoogleMyBusinessClientConfig) {
    super({
      baseUrl: "https://mybusinessbusinessinformation.googleapis.com/v1",
      authType: "oauth2",
      credentials: {
        accessToken: config.accessToken,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
    });
  }

  // ==================== Accounts ====================

  /** List all business accounts accessible by the authenticated user */
  async listAccounts(): Promise<BusinessAccount[]> {
    const response = await this.requestToHost<GoogleListResponse<BusinessAccount>>(
      "https://mybusinessaccountmanagement.googleapis.com/v1",
      "/accounts"
    );
    return response.items ?? [];
  }

  // ==================== Locations ====================

  /** List locations for an account */
  async listLocations(
    accountName: string,
    pageSize = 20,
    pageToken?: string
  ): Promise<{ locations: BusinessLocation[]; nextPageToken?: string }> {
    const params: Record<string, string> = {
      pageSize: String(pageSize),
      readMask: "name,title,storefrontAddress,websiteUri,phoneNumbers,categories,regularHours,latlng,metadata,openInfo,profile",
    };
    if (pageToken) params.pageToken = pageToken;

    const response = await this.get<{
      locations?: BusinessLocation[];
      nextPageToken?: string;
    }>(`/${accountName}/locations`, params);

    return {
      locations: response.data.locations ?? [],
      nextPageToken: response.data.nextPageToken,
    };
  }

  /** Get a single location by resource name */
  async getLocation(locationName: string): Promise<BusinessLocation> {
    const response = await this.get<BusinessLocation>(
      `/${locationName}`,
      {
        readMask: "name,title,storefrontAddress,websiteUri,phoneNumbers,categories,regularHours,latlng,metadata,openInfo,profile",
      }
    );
    return response.data;
  }

  /** Update a location's fields */
  async updateLocation(
    locationName: string,
    fields: Partial<BusinessLocation>,
    updateMask: string
  ): Promise<BusinessLocation> {
    const response = await this.patch<BusinessLocation>(
      `/${locationName}?updateMask=${updateMask}`,
      fields
    );
    return response.data;
  }

  // ==================== Reviews ====================

  /** List reviews for a location */
  async listReviews(params: ListReviewsParams): Promise<ListReviewsResponse> {
    const queryParams: Record<string, string> = {};
    if (params.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params.pageToken) queryParams.pageToken = params.pageToken;
    if (params.orderBy) queryParams.orderBy = params.orderBy;

    const response = await this.requestToHost<ListReviewsResponse>(
      "https://mybusiness.googleapis.com/v4",
      `/${params.locationName}/reviews`,
      "GET",
      undefined,
      queryParams
    );
    return response;
  }

  /** Get a single review */
  async getReview(reviewName: string): Promise<Review> {
    const response = await this.requestToHost<Review>(
      "https://mybusiness.googleapis.com/v4",
      `/${reviewName}`
    );
    return response;
  }

  /** Reply to a review */
  async replyToReview(reviewName: string, comment: string): Promise<ReviewReply> {
    const response = await this.requestToHost<ReviewReply>(
      "https://mybusiness.googleapis.com/v4",
      `/${reviewName}/reply`,
      "PUT",
      { comment }
    );
    return response;
  }

  /** Delete a review reply */
  async deleteReviewReply(reviewName: string): Promise<void> {
    await this.requestToHost<void>(
      "https://mybusiness.googleapis.com/v4",
      `/${reviewName}/reply`,
      "DELETE"
    );
  }

  // ==================== Posts ====================

  /** List posts for a location */
  async listPosts(params: ListPostsParams): Promise<ListPostsResponse> {
    const queryParams: Record<string, string> = {};
    if (params.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params.pageToken) queryParams.pageToken = params.pageToken;

    const response = await this.requestToHost<ListPostsResponse>(
      "https://mybusiness.googleapis.com/v4",
      `/${params.locationName}/localPosts`,
      "GET",
      undefined,
      queryParams
    );
    return response;
  }

  /** Create a new post for a location */
  async createPost(params: CreatePostParams): Promise<LocalPost> {
    const response = await this.requestToHost<LocalPost>(
      "https://mybusiness.googleapis.com/v4",
      `/${params.locationName}/localPosts`,
      "POST",
      params.post
    );
    return response;
  }

  /** Update an existing post */
  async updatePost(
    postName: string,
    post: Partial<LocalPost>,
    updateMask: string
  ): Promise<LocalPost> {
    const response = await this.requestToHost<LocalPost>(
      "https://mybusiness.googleapis.com/v4",
      `/${postName}?updateMask=${updateMask}`,
      "PATCH",
      post
    );
    return response;
  }

  /** Delete a post */
  async deletePost(postName: string): Promise<void> {
    await this.requestToHost<void>(
      "https://mybusiness.googleapis.com/v4",
      `/${postName}`,
      "DELETE"
    );
  }

  // ==================== Insights ====================

  /** Get performance insights for a location */
  async getInsights(params: InsightsParams): Promise<LocationInsights> {
    const body = {
      locationNames: [params.locationName],
      basicRequest: {
        metricRequests: params.metrics.map((metric) => ({ metric })),
        timeRange: {
          startTime: params.startTime,
          endTime: params.endTime,
        },
      },
    };

    const response = await this.requestToHost<{
      locationMetrics: LocationInsights[];
    }>(
      "https://mybusiness.googleapis.com/v4",
      `/${params.locationName}:reportInsights`,
      "POST",
      body
    );

    return (
      response.locationMetrics?.[0] ?? {
        locationName: params.locationName,
        timeRange: { startTime: params.startTime, endTime: params.endTime },
        metrics: [],
      }
    );
  }

  // ==================== Connection Test ====================

  /** Test OAuth2 credentials by listing accounts */
  async testConnection(): Promise<boolean> {
    try {
      await this.listAccounts();
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Private Helpers ====================

  /**
   * Make a request to a specific Google API host.
   * Needed because GMB spans multiple API endpoints.
   */
  private async requestToHost<T>(
    baseUrl: string,
    path: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
    body?: unknown,
    params?: Record<string, string>
  ): Promise<T> {
    const response = await this.request<T>({
      method,
      path: `${baseUrl}${path}`,
      body,
      params,
    });
    return response.data;
  }
}

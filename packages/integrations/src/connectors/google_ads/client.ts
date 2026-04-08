import type { CampaignRow, KeywordRow, SearchTermRow, GeoMetricRow, DeviceMetricRow, HourMetricRow, DailyMetricRow, AssetRow } from "./types.js";

export interface GoogleAdsConfig {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string;
  loginCustomerId?: string;
}

interface GoogleAdsResponse {
  results: Array<Record<string, unknown>>;
  fieldMask: string;
  requestId: string;
}

/**
 * Lightweight Google Ads API client.
 * Wraps the REST API (v18) for search report queries.
 */
export class GoogleAdsClient {
  private baseUrl: string;
  private config: GoogleAdsConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(config: GoogleAdsConfig) {
    this.config = config;
    const cid = config.customerId.replace(/-/g, "");
    this.baseUrl = `https://googleads.googleapis.com/v18/customers/${cid}/googleAds:search`;
  }

  /** Refresh the OAuth2 access token using the stored refresh token. */
  private async refreshAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.config.refreshToken,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google OAuth token refresh failed: ${res.status} ${err}`);
    }

    const data = await res.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  /** Execute a GAQL query against the Google Ads API. */
  async search(query: string): Promise<GoogleAdsResponse> {
    const token = await this.refreshAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "developer-token": this.config.developerToken,
    };
    if (this.config.loginCustomerId) {
      headers["login-customer-id"] = this.config.loginCustomerId.replace(/-/g, "");
    }

    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Ads API error: ${res.status} ${err}`);
    }

    return res.json() as Promise<GoogleAdsResponse>;
  }

  /** Convert micros (1/1,000,000) to currency amount. */
  static microsToAmount(micros: number | string): number {
    return Number(micros) / 1_000_000;
  }
}

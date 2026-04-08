import { IntegrationError } from "./base-client";

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp in ms
  tokenType?: string;
  scope?: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

export class OAuthManager {
  constructor(private config: OAuthConfig) {}

  /**
   * Generate the authorization URL for the OAuth2 flow.
   * The user should be redirected to this URL.
   */
  getAuthorizationUrl(state: string): string {
    const url = new URL(this.config.authorizationUrl);
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", this.config.scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    return url.toString();
  }

  /**
   * Exchange an authorization code for tokens.
   */
  async exchangeCode(code: string): Promise<OAuthTokens> {
    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "Unknown error");
      throw new IntegrationError("AUTH_ERROR", `OAuth token exchange failed: ${error}`, response.status);
    }

    const data = await response.json() as Record<string, unknown>;
    return this.parseTokenResponse(data);
  }

  /**
   * Refresh an expired access token using the refresh token.
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "Unknown error");
      throw new IntegrationError("AUTH_ERROR", `OAuth token refresh failed: ${error}`, response.status);
    }

    const data = await response.json() as Record<string, unknown>;
    const tokens = this.parseTokenResponse(data);
    // Keep the old refresh token if a new one wasn't provided
    if (!tokens.refreshToken) {
      tokens.refreshToken = refreshToken;
    }
    return tokens;
  }

  /**
   * Check whether tokens are expired or about to expire (within 5 min).
   */
  isTokenExpired(tokens: OAuthTokens): boolean {
    if (!tokens.expiresAt) return false;
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    return Date.now() >= tokens.expiresAt - bufferMs;
  }

  /**
   * Get valid tokens — refreshes automatically if expired.
   */
  async getValidTokens(tokens: OAuthTokens): Promise<OAuthTokens> {
    if (!this.isTokenExpired(tokens)) return tokens;
    if (!tokens.refreshToken) {
      throw new IntegrationError("AUTH_ERROR", "Access token expired and no refresh token available");
    }
    return this.refreshAccessToken(tokens.refreshToken);
  }

  private parseTokenResponse(data: Record<string, unknown>): OAuthTokens {
    const accessToken = data.access_token as string | undefined;
    if (!accessToken) {
      throw new IntegrationError("AUTH_ERROR", "No access_token in OAuth response");
    }

    const expiresIn = data.expires_in as number | undefined;

    return {
      accessToken,
      refreshToken: (data.refresh_token as string) || undefined,
      expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
      tokenType: (data.token_type as string) || "Bearer",
      scope: (data.scope as string) || undefined,
    };
  }
}

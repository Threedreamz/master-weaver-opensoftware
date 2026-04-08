import { BaseIntegrationClient } from "../../core/base-client.js";
import { OAuthManager } from "../../core/oauth-manager.js";
import type { OAuthTokens } from "../../core/oauth-manager.js";
import type {
  MicrosoftGraphClientConfig,
  GraphMessage,
  GraphListResponse,
  GraphSendMailParams,
  GraphMessageListParams,
  GraphCalendar,
  GraphEvent,
  GraphCreateEventParams,
  GraphUser,
  GraphListParams,
  GraphSubscription,
  GraphCreateSubscriptionParams,
} from "./types.js";

/**
 * Microsoft Graph API client for mail, calendars, and users.
 *
 * Authentication: OAuth2 Bearer token.
 * Docs: https://learn.microsoft.com/en-us/graph/api/overview
 */
export class MicrosoftGraphClient extends BaseIntegrationClient {
  private oauthManager?: OAuthManager;
  private tokens: OAuthTokens;

  constructor(config: MicrosoftGraphClientConfig) {
    super({
      baseUrl: "https://graph.microsoft.com/v1.0",
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 600 },
    });

    this.tokens = {
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
    };

    if (config.clientId && config.clientSecret && config.tenantId) {
      this.oauthManager = new OAuthManager({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authorizationUrl: `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
        scopes: [
          "https://graph.microsoft.com/.default",
        ],
        redirectUri: "",
      });
    }
  }

  /**
   * Ensure the access token is valid before making a request.
   * Automatically refreshes the token if an OAuthManager is configured.
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.oauthManager) return;
    const refreshed = await this.oauthManager.getValidTokens(this.tokens);
    if (refreshed.accessToken !== this.tokens.accessToken) {
      this.tokens = refreshed;
      this.credentials.accessToken = refreshed.accessToken;
    }
  }

  /**
   * Build OData query params from a params object.
   */
  private toQueryParams(params?: GraphListParams): Record<string, string> {
    const result: Record<string, string> = {};
    if (!params) return result;
    if (params.$top != null) result.$top = String(params.$top);
    if (params.$skip != null) result.$skip = String(params.$skip);
    if (params.$select) result.$select = params.$select;
    if (params.$filter) result.$filter = params.$filter;
    if (params.$orderby) result.$orderby = params.$orderby;
    if (params.$search) result.$search = params.$search;
    if (params.$expand) result.$expand = params.$expand;
    return result;
  }

  // ==================== Mail ====================

  /**
   * Send an email on behalf of the signed-in user.
   */
  async sendMail(params: GraphSendMailParams): Promise<void> {
    await this.ensureValidToken();
    await this.post("/me/sendMail", params);
  }

  /**
   * List messages in the signed-in user's mailbox.
   * Supports OData query parameters for filtering and pagination.
   */
  async listMessages(
    params?: GraphMessageListParams
  ): Promise<GraphListResponse<GraphMessage>> {
    await this.ensureValidToken();
    const response = await this.get<GraphListResponse<GraphMessage>>(
      "/me/messages",
      this.toQueryParams(params)
    );
    return response.data;
  }

  /**
   * Get a specific message by ID.
   */
  async getMessage(messageId: string): Promise<GraphMessage> {
    await this.ensureValidToken();
    const response = await this.get<GraphMessage>(
      `/me/messages/${messageId}`
    );
    return response.data;
  }

  /**
   * List messages in a specific mail folder.
   */
  async listFolderMessages(
    folderId: string,
    params?: GraphMessageListParams
  ): Promise<GraphListResponse<GraphMessage>> {
    await this.ensureValidToken();
    const response = await this.get<GraphListResponse<GraphMessage>>(
      `/me/mailFolders/${folderId}/messages`,
      this.toQueryParams(params)
    );
    return response.data;
  }

  // ==================== Calendars ====================

  /**
   * List the signed-in user's calendars.
   */
  async listCalendars(
    params?: GraphListParams
  ): Promise<GraphListResponse<GraphCalendar>> {
    await this.ensureValidToken();
    const response = await this.get<GraphListResponse<GraphCalendar>>(
      "/me/calendars",
      this.toQueryParams(params)
    );
    return response.data;
  }

  /**
   * List events on the signed-in user's default calendar.
   */
  async listEvents(
    params?: GraphListParams
  ): Promise<GraphListResponse<GraphEvent>> {
    await this.ensureValidToken();
    const response = await this.get<GraphListResponse<GraphEvent>>(
      "/me/events",
      this.toQueryParams(params)
    );
    return response.data;
  }

  /**
   * List events on a specific calendar.
   */
  async listCalendarEvents(
    calendarId: string,
    params?: GraphListParams
  ): Promise<GraphListResponse<GraphEvent>> {
    await this.ensureValidToken();
    const response = await this.get<GraphListResponse<GraphEvent>>(
      `/me/calendars/${calendarId}/events`,
      this.toQueryParams(params)
    );
    return response.data;
  }

  /**
   * Create an event on the signed-in user's default calendar.
   */
  async createEvent(params: GraphCreateEventParams): Promise<GraphEvent> {
    await this.ensureValidToken();
    const response = await this.post<GraphEvent>("/me/events", params);
    return response.data;
  }

  /**
   * Get a specific event by ID.
   */
  async getEvent(eventId: string): Promise<GraphEvent> {
    await this.ensureValidToken();
    const response = await this.get<GraphEvent>(`/me/events/${eventId}`);
    return response.data;
  }

  /**
   * Delete an event by ID.
   */
  async deleteEvent(eventId: string): Promise<void> {
    await this.ensureValidToken();
    await this.delete(`/me/events/${eventId}`);
  }

  // ==================== Users ====================

  /**
   * Get the signed-in user's profile.
   */
  async getMe(): Promise<GraphUser> {
    await this.ensureValidToken();
    const response = await this.get<GraphUser>("/me");
    return response.data;
  }

  /**
   * List users in the organization (requires admin consent).
   */
  async listUsers(
    params?: GraphListParams
  ): Promise<GraphListResponse<GraphUser>> {
    await this.ensureValidToken();
    const response = await this.get<GraphListResponse<GraphUser>>(
      "/users",
      this.toQueryParams(params)
    );
    return response.data;
  }

  /**
   * Get a specific user by ID or UPN.
   */
  async getUser(userIdOrUpn: string): Promise<GraphUser> {
    await this.ensureValidToken();
    const response = await this.get<GraphUser>(
      `/users/${encodeURIComponent(userIdOrUpn)}`
    );
    return response.data;
  }

  // ==================== Subscriptions (Webhooks) ====================

  /**
   * Create a subscription (webhook) for change notifications.
   */
  async createSubscription(
    params: GraphCreateSubscriptionParams
  ): Promise<GraphSubscription> {
    await this.ensureValidToken();
    const response = await this.post<GraphSubscription>(
      "/subscriptions",
      params
    );
    return response.data;
  }

  /**
   * List active subscriptions.
   */
  async listSubscriptions(): Promise<GraphListResponse<GraphSubscription>> {
    await this.ensureValidToken();
    const response = await this.get<GraphListResponse<GraphSubscription>>(
      "/subscriptions"
    );
    return response.data;
  }

  /**
   * Delete a subscription by ID.
   */
  async deleteSubscription(subscriptionId: string): Promise<void> {
    await this.ensureValidToken();
    await this.delete(`/subscriptions/${subscriptionId}`);
  }

  /**
   * Renew a subscription by updating its expiration date.
   */
  async renewSubscription(
    subscriptionId: string,
    expirationDateTime: string
  ): Promise<GraphSubscription> {
    await this.ensureValidToken();
    const response = await this.patch<GraphSubscription>(
      `/subscriptions/${subscriptionId}`,
      { expirationDateTime }
    );
    return response.data;
  }

  // ==================== Connection Test ====================

  /**
   * Verify that the access token is valid by fetching the current user profile.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getMe();
      return true;
    } catch {
      return false;
    }
  }
}

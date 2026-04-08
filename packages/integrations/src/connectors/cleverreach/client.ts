import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import { OAuthManager } from "../../core/oauth-manager.js";
import type { OAuthTokens } from "../../core/oauth-manager.js";
import type {
  CleverReachClientConfig,
  CleverReachGroup,
  CleverReachReceiver,
  CleverReachCreateReceiverInput,
  CleverReachUpdateReceiverInput,
  CleverReachBulkReceiverInput,
  CleverReachMailing,
  CleverReachCreateMailingInput,
  CleverReachUpdateMailingInput,
  CleverReachMailingReport,
  CleverReachGlobalReport,
  CleverReachWebhookRegistration,
  CleverReachWebhookResponse,
  CleverReachPaginationParams,
} from "./types.js";

/**
 * CleverReach REST API v3 client.
 *
 * Uses OAuth2 Bearer token authentication.
 * Supports automatic token refresh when clientId and clientSecret are provided.
 *
 * @see https://rest.cleverreach.com/explorer/
 */
export class CleverReachClient extends BaseIntegrationClient {
  private oauthManager?: OAuthManager;
  private tokens: OAuthTokens;

  constructor(private config: CleverReachClientConfig) {
    super({
      baseUrl: "https://rest.cleverreach.com/v3",
      authType: "oauth2",
      credentials: {
        accessToken: config.accessToken,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60, burstSize: 20 },
    });

    this.tokens = {
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
    };

    if (config.clientId && config.clientSecret) {
      this.oauthManager = new OAuthManager({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authorizationUrl: "https://rest.cleverreach.com/oauth/authorize.php",
        tokenUrl: "https://rest.cleverreach.com/oauth/token.php",
        scopes: [],
        redirectUri: "", // Set at authorization time
      });
    }
  }

  /**
   * Ensure the access token is still valid; refresh if needed.
   * Updates the internal credentials so subsequent requests use the new token.
   */
  async ensureValidToken(): Promise<void> {
    if (!this.oauthManager) return;
    if (!this.oauthManager.isTokenExpired(this.tokens)) return;

    if (!this.tokens.refreshToken) {
      throw new IntegrationError(
        "AUTH_ERROR",
        "CleverReach access token expired and no refresh token available"
      );
    }

    this.tokens = await this.oauthManager.refreshAccessToken(this.tokens.refreshToken);
    this.credentials.accessToken = this.tokens.accessToken;
  }

  /** Get the current tokens (e.g., to persist after refresh). */
  getTokens(): OAuthTokens {
    return { ...this.tokens };
  }

  // ==================== Groups ====================

  /** Get all groups. */
  async getGroups(params?: CleverReachPaginationParams): Promise<CleverReachGroup[]> {
    await this.ensureValidToken();
    const queryParams = this.paginationToParams(params);
    const response = await this.get<CleverReachGroup[]>("/groups", queryParams);
    return response.data;
  }

  /** Get a single group by ID. */
  async getGroup(groupId: number): Promise<CleverReachGroup> {
    await this.ensureValidToken();
    const response = await this.get<CleverReachGroup>(`/groups/${groupId}`);
    return response.data;
  }

  /** Create a new group. */
  async createGroup(name: string): Promise<CleverReachGroup> {
    await this.ensureValidToken();
    const response = await this.post<CleverReachGroup>("/groups", { name });
    return response.data;
  }

  /** Update a group name. */
  async updateGroup(groupId: number, name: string): Promise<CleverReachGroup> {
    await this.ensureValidToken();
    const response = await this.put<CleverReachGroup>(`/groups/${groupId}`, { name });
    return response.data;
  }

  /** Delete a group. */
  async deleteGroup(groupId: number): Promise<void> {
    await this.ensureValidToken();
    await this.delete(`/groups/${groupId}`);
  }

  // ==================== Receivers ====================

  /** Get all receivers in a group. */
  async getReceivers(
    groupId: number,
    params?: CleverReachPaginationParams
  ): Promise<CleverReachReceiver[]> {
    await this.ensureValidToken();
    const queryParams = this.paginationToParams(params);
    const response = await this.get<CleverReachReceiver[]>(
      `/groups/${groupId}/receivers`,
      queryParams
    );
    return response.data;
  }

  /** Get a single receiver by ID within a group. */
  async getReceiver(groupId: number, receiverId: number): Promise<CleverReachReceiver> {
    await this.ensureValidToken();
    const response = await this.get<CleverReachReceiver>(
      `/groups/${groupId}/receivers/${receiverId}`
    );
    return response.data;
  }

  /** Find a receiver by email address across a group. */
  async findReceiverByEmail(
    groupId: number,
    email: string
  ): Promise<CleverReachReceiver | null> {
    await this.ensureValidToken();
    try {
      const response = await this.get<CleverReachReceiver>(
        `/groups/${groupId}/receivers/${email}`
      );
      return response.data;
    } catch (error) {
      if (error instanceof IntegrationError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /** Add a new receiver to a group. */
  async createReceiver(
    groupId: number,
    input: CleverReachCreateReceiverInput
  ): Promise<CleverReachReceiver> {
    await this.ensureValidToken();
    const response = await this.post<CleverReachReceiver>(
      `/groups/${groupId}/receivers`,
      input
    );
    return response.data;
  }

  /** Update an existing receiver. */
  async updateReceiver(
    groupId: number,
    receiverId: number,
    input: CleverReachUpdateReceiverInput
  ): Promise<CleverReachReceiver> {
    await this.ensureValidToken();
    const response = await this.put<CleverReachReceiver>(
      `/groups/${groupId}/receivers/${receiverId}`,
      input
    );
    return response.data;
  }

  /** Delete a receiver from a group. */
  async deleteReceiver(groupId: number, receiverId: number): Promise<void> {
    await this.ensureValidToken();
    await this.delete(`/groups/${groupId}/receivers/${receiverId}`);
  }

  /**
   * Bulk-insert receivers into a group.
   * Existing receivers (matched by email) are updated.
   */
  async bulkCreateReceivers(
    groupId: number,
    input: CleverReachBulkReceiverInput
  ): Promise<{ inserted: number; updated: number }> {
    await this.ensureValidToken();
    const response = await this.post<{ inserted: number; updated: number }>(
      `/groups/${groupId}/receivers/insert`,
      input.receivers
    );
    return response.data;
  }

  /** Activate a receiver (set as active/confirmed). */
  async activateReceiver(groupId: number, receiverId: number): Promise<void> {
    await this.ensureValidToken();
    await this.put(`/groups/${groupId}/receivers/${receiverId}/setactive`);
  }

  /** Deactivate a receiver. */
  async deactivateReceiver(groupId: number, receiverId: number): Promise<void> {
    await this.ensureValidToken();
    await this.put(`/groups/${groupId}/receivers/${receiverId}/setinactive`);
  }

  // ==================== Mailings ====================

  /** Get all mailings. */
  async getMailings(params?: CleverReachPaginationParams): Promise<CleverReachMailing[]> {
    await this.ensureValidToken();
    const queryParams = this.paginationToParams(params);
    const response = await this.get<CleverReachMailing[]>("/mailings", queryParams);
    return response.data;
  }

  /** Get a single mailing by ID. */
  async getMailing(mailingId: number): Promise<CleverReachMailing> {
    await this.ensureValidToken();
    const response = await this.get<CleverReachMailing>(`/mailings/${mailingId}`);
    return response.data;
  }

  /** Create a new mailing. */
  async createMailing(
    input: CleverReachCreateMailingInput
  ): Promise<CleverReachMailing> {
    await this.ensureValidToken();
    const response = await this.post<CleverReachMailing>("/mailings", input);
    return response.data;
  }

  /** Update a mailing. */
  async updateMailing(
    mailingId: number,
    input: CleverReachUpdateMailingInput
  ): Promise<CleverReachMailing> {
    await this.ensureValidToken();
    const response = await this.put<CleverReachMailing>(
      `/mailings/${mailingId}`,
      input
    );
    return response.data;
  }

  /** Delete a mailing. */
  async deleteMailing(mailingId: number): Promise<void> {
    await this.ensureValidToken();
    await this.delete(`/mailings/${mailingId}`);
  }

  /** Send a mailing. Triggers immediate dispatch. */
  async sendMailing(mailingId: number): Promise<void> {
    await this.ensureValidToken();
    await this.post(`/mailings/${mailingId}/send`);
  }

  // ==================== Reports / Statistics ====================

  /** Get report for a specific mailing. */
  async getMailingReport(mailingId: number): Promise<CleverReachMailingReport> {
    await this.ensureValidToken();
    const response = await this.get<CleverReachMailingReport>(
      `/mailings/${mailingId}/report`
    );
    return response.data;
  }

  /** Get global statistics for the account. */
  async getGlobalReport(): Promise<CleverReachGlobalReport> {
    await this.ensureValidToken();
    const response = await this.get<CleverReachGlobalReport>("/reports");
    return response.data;
  }

  // ==================== Webhooks (managed via API) ====================

  /** Register a new webhook. */
  async registerWebhook(
    registration: CleverReachWebhookRegistration
  ): Promise<CleverReachWebhookResponse> {
    await this.ensureValidToken();
    const response = await this.post<CleverReachWebhookResponse>(
      "/hooks/eventhook",
      registration
    );
    return response.data;
  }

  /** List all registered webhooks. */
  async listWebhooks(): Promise<CleverReachWebhookResponse[]> {
    await this.ensureValidToken();
    const response = await this.get<CleverReachWebhookResponse[]>("/hooks/eventhook");
    return response.data;
  }

  /** Delete a webhook by ID. */
  async deleteWebhook(webhookId: number): Promise<void> {
    await this.ensureValidToken();
    await this.delete(`/hooks/eventhook/${webhookId}`);
  }

  // ==================== Connection Test ====================

  /** Test the connection by fetching the current user/account info. */
  async testConnection(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      await this.get("/debug/whoami");
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Helpers ====================

  private paginationToParams(
    params?: CleverReachPaginationParams
  ): Record<string, string> {
    const result: Record<string, string> = {};
    if (params?.page !== undefined) result.page = String(params.page);
    if (params?.pagesize !== undefined) result.pagesize = String(params.pagesize);
    return result;
  }
}

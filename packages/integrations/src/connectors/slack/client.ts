import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  SlackClientConfig,
  SlackPostMessageParams,
  SlackPostMessageResponse,
  SlackUpdateMessageParams,
  SlackUpdateMessageResponse,
  SlackChannelsListParams,
  SlackChannelsListResponse,
  SlackChannelHistoryParams,
  SlackChannelHistoryResponse,
  SlackUsersListParams,
  SlackUsersListResponse,
  SlackUser,
  SlackApiResponse,
  SlackFilesListParams,
  SlackFilesListResponse,
  SlackFileUploadParams,
  SlackFileUploadResponse,
} from "./types.js";

/**
 * Slack Web API client for messaging, channels, users, and files.
 *
 * Authentication: Bearer token (xoxb-...).
 * Docs: https://api.slack.com/methods
 */
export class SlackClient extends BaseIntegrationClient {
  constructor(config: SlackClientConfig) {
    super({
      baseUrl: "https://slack.com/api",
      authType: "api_key",
      credentials: { apiKey: config.botToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60, burstSize: 20 },
    });
  }

  /**
   * Ensure a Slack response indicates success; throw on error.
   */
  private assertOk<T extends SlackApiResponse>(response: T): T {
    if (!response.ok) {
      throw new Error(`Slack API error: ${response.error ?? "unknown_error"}`);
    }
    return response;
  }

  // ==================== Messages ====================

  /**
   * Post a message to a channel.
   * Supports text, blocks, attachments, and threading.
   */
  async postMessage(
    params: SlackPostMessageParams
  ): Promise<SlackPostMessageResponse> {
    const response = await this.post<SlackPostMessageResponse>(
      "/chat.postMessage",
      params
    );
    return this.assertOk(response.data);
  }

  /**
   * Update an existing message.
   */
  async updateMessage(
    params: SlackUpdateMessageParams
  ): Promise<SlackUpdateMessageResponse> {
    const response = await this.post<SlackUpdateMessageResponse>(
      "/chat.update",
      params
    );
    return this.assertOk(response.data);
  }

  /**
   * Delete a message from a channel.
   */
  async deleteMessage(
    channel: string,
    ts: string
  ): Promise<SlackApiResponse> {
    const response = await this.post<SlackApiResponse>("/chat.delete", {
      channel,
      ts,
    });
    return this.assertOk(response.data);
  }

  // ==================== Channels ====================

  /**
   * List channels in the workspace.
   * Supports pagination via cursor.
   */
  async listChannels(
    params?: SlackChannelsListParams
  ): Promise<SlackChannelsListResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.types) queryParams.types = params.types;
    if (params?.exclude_archived != null)
      queryParams.exclude_archived = String(params.exclude_archived);
    if (params?.limit != null) queryParams.limit = String(params.limit);
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.team_id) queryParams.team_id = params.team_id;

    const response = await this.get<SlackChannelsListResponse>(
      "/conversations.list",
      queryParams
    );
    return this.assertOk(response.data);
  }

  /**
   * Get message history for a channel.
   */
  async getChannelHistory(
    params: SlackChannelHistoryParams
  ): Promise<SlackChannelHistoryResponse> {
    const queryParams: Record<string, string> = {
      channel: params.channel,
    };
    if (params.limit != null) queryParams.limit = String(params.limit);
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.oldest) queryParams.oldest = params.oldest;
    if (params.latest) queryParams.latest = params.latest;
    if (params.inclusive != null)
      queryParams.inclusive = String(params.inclusive);

    const response = await this.get<SlackChannelHistoryResponse>(
      "/conversations.history",
      queryParams
    );
    return this.assertOk(response.data);
  }

  // ==================== Users ====================

  /**
   * List all users in the workspace.
   * Supports pagination via cursor.
   */
  async listUsers(
    params?: SlackUsersListParams
  ): Promise<SlackUsersListResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.limit != null) queryParams.limit = String(params.limit);
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.team_id) queryParams.team_id = params.team_id;

    const response = await this.get<SlackUsersListResponse>(
      "/users.list",
      queryParams
    );
    return this.assertOk(response.data);
  }

  /**
   * Get info about a specific user by ID.
   */
  async getUser(userId: string): Promise<SlackUser> {
    const response = await this.get<SlackApiResponse & { user: SlackUser }>(
      "/users.info",
      { user: userId }
    );
    this.assertOk(response.data);
    return response.data.user;
  }

  /**
   * Look up a user by email address.
   */
  async lookupUserByEmail(email: string): Promise<SlackUser> {
    const response = await this.get<SlackApiResponse & { user: SlackUser }>(
      "/users.lookupByEmail",
      { email }
    );
    this.assertOk(response.data);
    return response.data.user;
  }

  // ==================== Files ====================

  /**
   * List files shared in the workspace.
   * Supports filtering by channel, user, type, and date range.
   */
  async listFiles(
    params?: SlackFilesListParams
  ): Promise<SlackFilesListResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.channel) queryParams.channel = params.channel;
    if (params?.user) queryParams.user = params.user;
    if (params?.types) queryParams.types = params.types;
    if (params?.count != null) queryParams.count = String(params.count);
    if (params?.page != null) queryParams.page = String(params.page);
    if (params?.ts_from) queryParams.ts_from = params.ts_from;
    if (params?.ts_to) queryParams.ts_to = params.ts_to;

    const response = await this.get<SlackFilesListResponse>(
      "/files.list",
      queryParams
    );
    return this.assertOk(response.data);
  }

  /**
   * Upload a file to Slack.
   * Provide content as a string; for binary files, base64 encode first.
   */
  async uploadFile(
    params: SlackFileUploadParams
  ): Promise<SlackFileUploadResponse> {
    const response = await this.post<SlackFileUploadResponse>(
      "/files.upload",
      params
    );
    return this.assertOk(response.data);
  }

  /**
   * Delete a file.
   */
  async deleteFile(fileId: string): Promise<SlackApiResponse> {
    const response = await this.post<SlackApiResponse>("/files.delete", {
      file: fileId,
    });
    return this.assertOk(response.data);
  }

  // ==================== Connection Test ====================

  /**
   * Verify that the bot token is valid by calling auth.test.
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.post<SlackApiResponse & { url: string; team: string }>(
        "/auth.test"
      );
      return response.data.ok;
    } catch {
      return false;
    }
  }
}

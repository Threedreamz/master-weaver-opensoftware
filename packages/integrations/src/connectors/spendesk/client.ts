import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  SpendeskExpense,
  SpendeskExpenseListParams,
  SpendeskVirtualCard,
  SpendeskCreateCardParams,
  SpendeskApproval,
  SpendeskExportParams,
  SpendeskExportResponse,
  SpendeskUser,
  SpendeskSupplier,
  SpendeskListResponse,
  SpendeskListParams,
} from "./types.js";

export interface SpendeskClientOptions {
  accessToken: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Spendesk API client for expense management, virtual cards, approvals, and exports.
 *
 * Uses OAuth2 Bearer token authentication.
 */
export class SpendeskClient extends BaseIntegrationClient {
  private currentAccessToken: string;

  constructor(config: SpendeskClientOptions) {
    super({
      baseUrl: config.baseUrl ?? "https://api.spendesk.com/v1",
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      retry: config.retries
        ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 }
        : undefined,
      rateLimit: { requestsPerMinute: 120 },
    });
    this.currentAccessToken = config.accessToken;
  }

  /** Update the access token after a refresh. */
  updateAccessToken(accessToken: string): void {
    this.currentAccessToken = accessToken;
    this.credentials.accessToken = accessToken;
  }

  // ── Expenses ───────────────────────────────────────────────────────────

  /** List expenses with optional filters. */
  async listExpenses(
    params?: SpendeskExpenseListParams,
  ): Promise<SpendeskListResponse<SpendeskExpense>> {
    const query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.cursor) query.cursor = params.cursor;
    if (params?.status) query.status = params.status;
    if (params?.from_date) query.from_date = params.from_date;
    if (params?.to_date) query.to_date = params.to_date;
    if (params?.user_id) query.user_id = params.user_id;

    const { data } = await this.get<SpendeskListResponse<SpendeskExpense>>(
      "/expenses",
      query,
    );
    return data;
  }

  /** Get a specific expense. */
  async getExpense(expenseId: string): Promise<SpendeskExpense> {
    const { data } = await this.get<SpendeskExpense>(
      `/expenses/${expenseId}`,
    );
    return data;
  }

  /** Approve an expense. */
  async approveExpense(expenseId: string): Promise<SpendeskExpense> {
    const { data } = await this.post<SpendeskExpense>(
      `/expenses/${expenseId}/approve`,
    );
    return data;
  }

  /** Reject an expense. */
  async rejectExpense(
    expenseId: string,
    reason?: string,
  ): Promise<SpendeskExpense> {
    const { data } = await this.post<SpendeskExpense>(
      `/expenses/${expenseId}/reject`,
      reason ? { reason } : undefined,
    );
    return data;
  }

  // ── Virtual Cards ──────────────────────────────────────────────────────

  /** List virtual cards. */
  async listCards(
    params?: SpendeskListParams,
  ): Promise<SpendeskListResponse<SpendeskVirtualCard>> {
    const query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.cursor) query.cursor = params.cursor;

    const { data } = await this.get<
      SpendeskListResponse<SpendeskVirtualCard>
    >("/cards", query);
    return data;
  }

  /** Create a virtual card. */
  async createCard(
    params: SpendeskCreateCardParams,
  ): Promise<SpendeskVirtualCard> {
    const { data } = await this.post<SpendeskVirtualCard>("/cards", params);
    return data;
  }

  /** Freeze a virtual card. */
  async freezeCard(cardId: string): Promise<SpendeskVirtualCard> {
    const { data } = await this.post<SpendeskVirtualCard>(
      `/cards/${cardId}/freeze`,
    );
    return data;
  }

  /** Cancel a virtual card. */
  async cancelCard(cardId: string): Promise<SpendeskVirtualCard> {
    const { data } = await this.post<SpendeskVirtualCard>(
      `/cards/${cardId}/cancel`,
    );
    return data;
  }

  // ── Approvals ──────────────────────────────────────────────────────────

  /** List pending approvals. */
  async listApprovals(
    params?: SpendeskListParams,
  ): Promise<SpendeskListResponse<SpendeskApproval>> {
    const query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.cursor) query.cursor = params.cursor;

    const { data } = await this.get<
      SpendeskListResponse<SpendeskApproval>
    >("/approvals", query);
    return data;
  }

  /** Approve a request. */
  async approveRequest(approvalId: string): Promise<SpendeskApproval> {
    const { data } = await this.post<SpendeskApproval>(
      `/approvals/${approvalId}/approve`,
    );
    return data;
  }

  /** Reject a request. */
  async rejectRequest(
    approvalId: string,
    reason?: string,
  ): Promise<SpendeskApproval> {
    const { data } = await this.post<SpendeskApproval>(
      `/approvals/${approvalId}/reject`,
      reason ? { reason } : undefined,
    );
    return data;
  }

  // ── Exports ────────────────────────────────────────────────────────────

  /** Start an export. */
  async createExport(
    params: SpendeskExportParams,
  ): Promise<SpendeskExportResponse> {
    const { data } = await this.post<SpendeskExportResponse>(
      "/exports",
      params,
    );
    return data;
  }

  /** Get export status. */
  async getExport(exportId: string): Promise<SpendeskExportResponse> {
    const { data } = await this.get<SpendeskExportResponse>(
      `/exports/${exportId}`,
    );
    return data;
  }

  // ── Users ──────────────────────────────────────────────────────────────

  /** List users. */
  async listUsers(
    params?: SpendeskListParams,
  ): Promise<SpendeskListResponse<SpendeskUser>> {
    const query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.cursor) query.cursor = params.cursor;

    const { data } = await this.get<SpendeskListResponse<SpendeskUser>>(
      "/users",
      query,
    );
    return data;
  }

  // ── Suppliers ──────────────────────────────────────────────────────────

  /** List suppliers. */
  async listSuppliers(
    params?: SpendeskListParams,
  ): Promise<SpendeskListResponse<SpendeskSupplier>> {
    const query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.cursor) query.cursor = params.cursor;

    const { data } = await this.get<SpendeskListResponse<SpendeskSupplier>>(
      "/suppliers",
      query,
    );
    return data;
  }

  // ── Connection Test ────────────────────────────────────────────────────

  /** Test the connection by listing users. */
  async testConnection(): Promise<boolean> {
    try {
      await this.listUsers({ limit: 1 });
      return true;
    } catch {
      return false;
    }
  }
}

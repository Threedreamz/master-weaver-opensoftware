import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  PleoExpense,
  PleoExpenseListParams,
  PleoCard,
  PleoCardListParams,
  PleoReimbursement,
  PleoCreateReimbursementParams,
  PleoExportParams,
  PleoExportResponse,
  PleoUser,
  PleoTeam,
  PleoReceipt,
  PleoListResponse,
  PleoListParams,
} from "./types.js";

export interface PleoClientOptions {
  accessToken: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Pleo API client for company cards, expenses, reimbursements, and exports.
 *
 * Uses OAuth2 Bearer token authentication.
 */
export class PleoClient extends BaseIntegrationClient {
  constructor(config: PleoClientOptions) {
    super({
      baseUrl: config.baseUrl ?? "https://external.pleo.io/v1",
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      retry: config.retries
        ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 }
        : undefined,
      rateLimit: { requestsPerMinute: 120 },
    });
  }

  /** Update the access token after a refresh. */
  updateAccessToken(accessToken: string): void {
    this.credentials.accessToken = accessToken;
  }

  // ── Expenses ───────────────────────────────────────────────────────────

  /** List expenses with optional filters. */
  async listExpenses(
    params?: PleoExpenseListParams,
  ): Promise<PleoListResponse<PleoExpense>> {
    const query: Record<string, string> = {};
    if (params?.offset) query.offset = String(params.offset);
    if (params?.limit) query.limit = String(params.limit);
    if (params?.status) query.status = params.status;
    if (params?.from) query.from = params.from;
    if (params?.to) query.to = params.to;
    if (params?.user_id) query.user_id = params.user_id;
    if (params?.team_id) query.team_id = params.team_id;

    const { data } = await this.get<PleoListResponse<PleoExpense>>(
      "/expenses",
      query,
    );
    return data;
  }

  /** Get a specific expense. */
  async getExpense(expenseId: string): Promise<PleoExpense> {
    const { data } = await this.get<PleoExpense>(`/expenses/${expenseId}`);
    return data;
  }

  /** Approve an expense. */
  async approveExpense(expenseId: string): Promise<PleoExpense> {
    const { data } = await this.post<PleoExpense>(
      `/expenses/${expenseId}/approve`,
    );
    return data;
  }

  /** Reject an expense. */
  async rejectExpense(
    expenseId: string,
    reason?: string,
  ): Promise<PleoExpense> {
    const { data } = await this.post<PleoExpense>(
      `/expenses/${expenseId}/reject`,
      reason ? { reason } : undefined,
    );
    return data;
  }

  // ── Cards ──────────────────────────────────────────────────────────────

  /** List cards. */
  async listCards(
    params?: PleoCardListParams,
  ): Promise<PleoListResponse<PleoCard>> {
    const query: Record<string, string> = {};
    if (params?.offset) query.offset = String(params.offset);
    if (params?.limit) query.limit = String(params.limit);
    if (params?.status) query.status = params.status;
    if (params?.user_id) query.user_id = params.user_id;

    const { data } = await this.get<PleoListResponse<PleoCard>>(
      "/cards",
      query,
    );
    return data;
  }

  /** Freeze a card. */
  async freezeCard(cardId: string): Promise<PleoCard> {
    const { data } = await this.post<PleoCard>(`/cards/${cardId}/freeze`);
    return data;
  }

  /** Unfreeze a card. */
  async unfreezeCard(cardId: string): Promise<PleoCard> {
    const { data } = await this.post<PleoCard>(`/cards/${cardId}/unfreeze`);
    return data;
  }

  /** Cancel a card. */
  async cancelCard(cardId: string): Promise<PleoCard> {
    const { data } = await this.post<PleoCard>(`/cards/${cardId}/cancel`);
    return data;
  }

  // ── Reimbursements ─────────────────────────────────────────────────────

  /** List reimbursements. */
  async listReimbursements(
    params?: PleoListParams,
  ): Promise<PleoListResponse<PleoReimbursement>> {
    const query: Record<string, string> = {};
    if (params?.offset) query.offset = String(params.offset);
    if (params?.limit) query.limit = String(params.limit);

    const { data } = await this.get<PleoListResponse<PleoReimbursement>>(
      "/reimbursements",
      query,
    );
    return data;
  }

  /** Create a reimbursement request. */
  async createReimbursement(
    params: PleoCreateReimbursementParams,
  ): Promise<PleoReimbursement> {
    const { data } = await this.post<PleoReimbursement>(
      "/reimbursements",
      params,
    );
    return data;
  }

  /** Get a reimbursement by ID. */
  async getReimbursement(
    reimbursementId: string,
  ): Promise<PleoReimbursement> {
    const { data } = await this.get<PleoReimbursement>(
      `/reimbursements/${reimbursementId}`,
    );
    return data;
  }

  // ── Exports ────────────────────────────────────────────────────────────

  /** Start an export. */
  async createExport(params: PleoExportParams): Promise<PleoExportResponse> {
    const { data } = await this.post<PleoExportResponse>("/exports", params);
    return data;
  }

  /** Get export status. */
  async getExport(exportId: string): Promise<PleoExportResponse> {
    const { data } = await this.get<PleoExportResponse>(
      `/exports/${exportId}`,
    );
    return data;
  }

  // ── Users ──────────────────────────────────────────────────────────────

  /** List users. */
  async listUsers(
    params?: PleoListParams,
  ): Promise<PleoListResponse<PleoUser>> {
    const query: Record<string, string> = {};
    if (params?.offset) query.offset = String(params.offset);
    if (params?.limit) query.limit = String(params.limit);

    const { data } = await this.get<PleoListResponse<PleoUser>>(
      "/users",
      query,
    );
    return data;
  }

  // ── Teams ──────────────────────────────────────────────────────────────

  /** List teams. */
  async listTeams(
    params?: PleoListParams,
  ): Promise<PleoListResponse<PleoTeam>> {
    const query: Record<string, string> = {};
    if (params?.offset) query.offset = String(params.offset);
    if (params?.limit) query.limit = String(params.limit);

    const { data } = await this.get<PleoListResponse<PleoTeam>>(
      "/teams",
      query,
    );
    return data;
  }

  // ── Receipts ───────────────────────────────────────────────────────────

  /** Get a receipt by ID. */
  async getReceipt(receiptId: string): Promise<PleoReceipt> {
    const { data } = await this.get<PleoReceipt>(`/receipts/${receiptId}`);
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

import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  MossCard,
  MossCardListParams,
  MossCreateCardParams,
  MossInvoice,
  MossInvoiceListParams,
  MossTransaction,
  MossTransactionListParams,
  MossExportParams,
  MossExportResponse,
  MossMember,
  MossListResponse,
  MossListParams,
} from "./types.js";

export interface MossClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Moss API client for corporate credit cards, invoice management, and exports.
 *
 * Uses API key authentication via the Authorization: Bearer header.
 */
export class MossClient extends BaseIntegrationClient {
  constructor(config: MossClientOptions) {
    super({
      baseUrl: config.baseUrl ?? "https://api.getmoss.com/v1",
      authType: "api_key",
      credentials: { apiKey: config.apiKey },
      timeout: config.timeout ?? 30_000,
      retry: config.retries
        ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 }
        : undefined,
      rateLimit: { requestsPerMinute: 120 },
    });
  }

  // ── Cards ──────────────────────────────────────────────────────────────

  /** List corporate cards. */
  async listCards(
    params?: MossCardListParams,
  ): Promise<MossListResponse<MossCard>> {
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.per_page) query.per_page = String(params.per_page);
    if (params?.status) query.status = params.status;
    if (params?.holder_id) query.holder_id = params.holder_id;

    const { data } = await this.get<MossListResponse<MossCard>>(
      "/cards",
      query,
    );
    return data;
  }

  /** Get a card by ID. */
  async getCard(cardId: string): Promise<MossCard> {
    const { data } = await this.get<MossCard>(`/cards/${cardId}`);
    return data;
  }

  /** Create a virtual card. */
  async createCard(params: MossCreateCardParams): Promise<MossCard> {
    const { data } = await this.post<MossCard>("/cards", params);
    return data;
  }

  /** Freeze a card. */
  async freezeCard(cardId: string): Promise<MossCard> {
    const { data } = await this.post<MossCard>(`/cards/${cardId}/freeze`);
    return data;
  }

  /** Unfreeze a card. */
  async unfreezeCard(cardId: string): Promise<MossCard> {
    const { data } = await this.post<MossCard>(`/cards/${cardId}/unfreeze`);
    return data;
  }

  /** Cancel a card. */
  async cancelCard(cardId: string): Promise<MossCard> {
    const { data } = await this.post<MossCard>(`/cards/${cardId}/cancel`);
    return data;
  }

  // ── Invoices ───────────────────────────────────────────────────────────

  /** List invoices. */
  async listInvoices(
    params?: MossInvoiceListParams,
  ): Promise<MossListResponse<MossInvoice>> {
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.per_page) query.per_page = String(params.per_page);
    if (params?.status) query.status = params.status;
    if (params?.from_date) query.from_date = params.from_date;
    if (params?.to_date) query.to_date = params.to_date;
    if (params?.vendor_name) query.vendor_name = params.vendor_name;

    const { data } = await this.get<MossListResponse<MossInvoice>>(
      "/invoices",
      query,
    );
    return data;
  }

  /** Get an invoice by ID. */
  async getInvoice(invoiceId: string): Promise<MossInvoice> {
    const { data } = await this.get<MossInvoice>(`/invoices/${invoiceId}`);
    return data;
  }

  /** Approve an invoice. */
  async approveInvoice(invoiceId: string): Promise<MossInvoice> {
    const { data } = await this.post<MossInvoice>(
      `/invoices/${invoiceId}/approve`,
    );
    return data;
  }

  /** Reject an invoice. */
  async rejectInvoice(
    invoiceId: string,
    reason?: string,
  ): Promise<MossInvoice> {
    const { data } = await this.post<MossInvoice>(
      `/invoices/${invoiceId}/reject`,
      reason ? { reason } : undefined,
    );
    return data;
  }

  // ── Transactions ───────────────────────────────────────────────────────

  /** List transactions. */
  async listTransactions(
    params?: MossTransactionListParams,
  ): Promise<MossListResponse<MossTransaction>> {
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.per_page) query.per_page = String(params.per_page);
    if (params?.from_date) query.from_date = params.from_date;
    if (params?.to_date) query.to_date = params.to_date;
    if (params?.card_id) query.card_id = params.card_id;
    if (params?.status) query.status = params.status;

    const { data } = await this.get<MossListResponse<MossTransaction>>(
      "/transactions",
      query,
    );
    return data;
  }

  /** Get a transaction by ID. */
  async getTransaction(transactionId: string): Promise<MossTransaction> {
    const { data } = await this.get<MossTransaction>(
      `/transactions/${transactionId}`,
    );
    return data;
  }

  // ── Exports ────────────────────────────────────────────────────────────

  /** Start an export. */
  async createExport(params: MossExportParams): Promise<MossExportResponse> {
    const { data } = await this.post<MossExportResponse>("/exports", params);
    return data;
  }

  /** Get export status. */
  async getExport(exportId: string): Promise<MossExportResponse> {
    const { data } = await this.get<MossExportResponse>(
      `/exports/${exportId}`,
    );
    return data;
  }

  // ── Members ────────────────────────────────────────────────────────────

  /** List team members. */
  async listMembers(
    params?: MossListParams,
  ): Promise<MossListResponse<MossMember>> {
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.per_page) query.per_page = String(params.per_page);

    const { data } = await this.get<MossListResponse<MossMember>>(
      "/members",
      query,
    );
    return data;
  }

  // ── Connection Test ────────────────────────────────────────────────────

  /** Test the connection by listing members. */
  async testConnection(): Promise<boolean> {
    try {
      await this.listMembers({ per_page: 1 });
      return true;
    } catch {
      return false;
    }
  }
}

import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  VeryfiClientConfig,
  VeryfiDocument,
  VeryfiProcessDocumentParams,
  VeryfiProcessUrlParams,
  VeryfiDocumentListParams,
  VeryfiDocumentListResponse,
  VeryfiLineItem,
  VeryfiTag,
} from "./types.js";

export interface VeryfiClientOptions {
  clientId: string;
  clientSecret: string;
  username: string;
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Veryfi API client for real-time receipt/invoice OCR and line item extraction.
 *
 * Uses multi-header authentication: Client-Id, Authorization (apikey), and
 * additional username/client-secret headers.
 */
export class VeryfiClient extends BaseIntegrationClient {
  constructor(config: VeryfiClientOptions) {
    super({
      baseUrl: config.baseUrl ?? "https://api.veryfi.com/api/v8/partner",
      authType: "custom",
      credentials: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        username: config.username,
        apiKey: config.apiKey,
      },
      timeout: config.timeout ?? 120_000,
      retry: config.retries
        ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 }
        : undefined,
      rateLimit: { requestsPerMinute: 60 },
      defaultHeaders: {
        "Client-Id": config.clientId,
        Authorization: `apikey ${config.username}:${config.apiKey}`,
      },
    });
  }

  // ── Document Processing ────────────────────────────────────────────────

  /** Process a document from base64-encoded file data. */
  async processDocument(
    params: VeryfiProcessDocumentParams,
  ): Promise<VeryfiDocument> {
    const { data } = await this.post<VeryfiDocument>("/documents", params);
    return data;
  }

  /** Process a document from a URL. */
  async processDocumentUrl(
    params: VeryfiProcessUrlParams,
  ): Promise<VeryfiDocument> {
    const { data } = await this.post<VeryfiDocument>("/documents", params);
    return data;
  }

  // ── Document Retrieval ─────────────────────────────────────────────────

  /** List processed documents. */
  async listDocuments(
    params?: VeryfiDocumentListParams,
  ): Promise<VeryfiDocumentListResponse> {
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.page_size) query.page_size = String(params.page_size);
    if (params?.created_date__gte)
      query.created_date__gte = params.created_date__gte;
    if (params?.created_date__lte)
      query.created_date__lte = params.created_date__lte;
    if (params?.tag) query.tag = params.tag;
    if (params?.external_id) query.external_id = params.external_id;
    if (params?.q) query.q = params.q;

    const { data } = await this.get<VeryfiDocumentListResponse>(
      "/documents",
      query,
    );
    return data;
  }

  /** Get a specific document by ID. */
  async getDocument(documentId: number): Promise<VeryfiDocument> {
    const { data } = await this.get<VeryfiDocument>(
      `/documents/${documentId}`,
    );
    return data;
  }

  /** Update a document. */
  async updateDocument(
    documentId: number,
    updates: Partial<
      Pick<
        VeryfiDocument,
        | "vendor"
        | "date"
        | "due_date"
        | "total"
        | "subtotal"
        | "tax"
        | "tip"
        | "currency_code"
        | "invoice_number"
        | "category"
        | "notes"
        | "external_id"
        | "tags"
      >
    >,
  ): Promise<VeryfiDocument> {
    const { data } = await this.put<VeryfiDocument>(
      `/documents/${documentId}`,
      updates,
    );
    return data;
  }

  /** Delete a document. */
  async deleteDocument(documentId: number): Promise<void> {
    await this.delete(`/documents/${documentId}`);
  }

  // ── Line Items ─────────────────────────────────────────────────────────

  /** Get line items for a document. */
  async getLineItems(documentId: number): Promise<VeryfiLineItem[]> {
    const { data } = await this.get<VeryfiLineItem[]>(
      `/documents/${documentId}/line-items`,
    );
    return data;
  }

  /** Add a line item to a document. */
  async addLineItem(
    documentId: number,
    lineItem: Partial<VeryfiLineItem>,
  ): Promise<VeryfiLineItem> {
    const { data } = await this.post<VeryfiLineItem>(
      `/documents/${documentId}/line-items`,
      lineItem,
    );
    return data;
  }

  /** Update a line item. */
  async updateLineItem(
    documentId: number,
    lineItemId: number,
    updates: Partial<VeryfiLineItem>,
  ): Promise<VeryfiLineItem> {
    const { data } = await this.put<VeryfiLineItem>(
      `/documents/${documentId}/line-items/${lineItemId}`,
      updates,
    );
    return data;
  }

  /** Delete a line item. */
  async deleteLineItem(
    documentId: number,
    lineItemId: number,
  ): Promise<void> {
    await this.delete(`/documents/${documentId}/line-items/${lineItemId}`);
  }

  // ── Tags ───────────────────────────────────────────────────────────────

  /** List all tags. */
  async listTags(): Promise<VeryfiTag[]> {
    const { data } = await this.get<VeryfiTag[]>("/tags");
    return data;
  }

  // ── Connection Test ────────────────────────────────────────────────────

  /** Test the connection by listing documents. */
  async testConnection(): Promise<boolean> {
    try {
      await this.listDocuments({ page_size: 1 });
      return true;
    } catch {
      return false;
    }
  }
}

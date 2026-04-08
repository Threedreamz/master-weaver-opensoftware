import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  MindeeClientConfig,
  MindeePredictResponse,
  MindeeEnqueueResponse,
  MindeeJobStatusResponse,
  MindeeInvoicePrediction,
  MindeeReceiptPrediction,
  MindeeFinancialPrediction,
} from "./types.js";

export interface MindeeClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Mindee API client for invoice parsing, receipt extraction, and financial document AI.
 *
 * Uses API key authentication via the Authorization header.
 */
export class MindeeClient extends BaseIntegrationClient {
  constructor(config: MindeeClientOptions) {
    super({
      baseUrl: config.baseUrl ?? "https://api.mindee.net/v1",
      authType: "api_key",
      credentials: { apiKey: config.apiKey },
      timeout: config.timeout ?? 120_000,
      retry: config.retries
        ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 }
        : undefined,
      rateLimit: { requestsPerMinute: 120 },
    });
  }

  // ── Invoice Parsing ────────────────────────────────────────────────────

  /** Parse an invoice document (synchronous). */
  async parseInvoice(
    documentBase64: string,
    filename?: string,
  ): Promise<MindeePredictResponse<MindeeInvoicePrediction>> {
    const { data } = await this.post<
      MindeePredictResponse<MindeeInvoicePrediction>
    >("/products/mindee/invoices/v4/predict", {
      document: documentBase64,
      filename,
    });
    return data;
  }

  /** Enqueue an invoice for async parsing. */
  async enqueueInvoice(
    documentBase64: string,
    filename?: string,
  ): Promise<MindeeEnqueueResponse> {
    const { data } = await this.post<MindeeEnqueueResponse>(
      "/products/mindee/invoices/v4/predict_async",
      { document: documentBase64, filename },
    );
    return data;
  }

  /** Get the status of an async invoice job. */
  async getInvoiceJob(
    jobId: string,
  ): Promise<MindeeJobStatusResponse<MindeeInvoicePrediction>> {
    const { data } = await this.get<
      MindeeJobStatusResponse<MindeeInvoicePrediction>
    >(`/products/mindee/invoices/v4/documents/queue/${jobId}`);
    return data;
  }

  // ── Receipt Parsing ────────────────────────────────────────────────────

  /** Parse a receipt document (synchronous). */
  async parseReceipt(
    documentBase64: string,
    filename?: string,
  ): Promise<MindeePredictResponse<MindeeReceiptPrediction>> {
    const { data } = await this.post<
      MindeePredictResponse<MindeeReceiptPrediction>
    >("/products/mindee/expense_receipts/v5/predict", {
      document: documentBase64,
      filename,
    });
    return data;
  }

  /** Enqueue a receipt for async parsing. */
  async enqueueReceipt(
    documentBase64: string,
    filename?: string,
  ): Promise<MindeeEnqueueResponse> {
    const { data } = await this.post<MindeeEnqueueResponse>(
      "/products/mindee/expense_receipts/v5/predict_async",
      { document: documentBase64, filename },
    );
    return data;
  }

  /** Get the status of an async receipt job. */
  async getReceiptJob(
    jobId: string,
  ): Promise<MindeeJobStatusResponse<MindeeReceiptPrediction>> {
    const { data } = await this.get<
      MindeeJobStatusResponse<MindeeReceiptPrediction>
    >(`/products/mindee/expense_receipts/v5/documents/queue/${jobId}`);
    return data;
  }

  // ── Financial Document Parsing ─────────────────────────────────────────

  /** Parse a financial document (invoice or receipt, auto-detected). */
  async parseFinancialDocument(
    documentBase64: string,
    filename?: string,
  ): Promise<MindeePredictResponse<MindeeFinancialPrediction>> {
    const { data } = await this.post<
      MindeePredictResponse<MindeeFinancialPrediction>
    >("/products/mindee/financial_document/v1/predict", {
      document: documentBase64,
      filename,
    });
    return data;
  }

  // ── Connection Test ────────────────────────────────────────────────────

  /** Test the connection by making a minimal API call. */
  async testConnection(): Promise<boolean> {
    try {
      // A lightweight call to verify auth — parse a minimal document
      await this.get("/products/mindee/invoices/v4");
      return true;
    } catch {
      return false;
    }
  }
}

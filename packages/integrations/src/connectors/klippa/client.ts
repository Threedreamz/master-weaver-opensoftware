import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  KlippaClientConfig,
  KlippaParseRequest,
  KlippaParseResponse,
  KlippaClassifyRequest,
  KlippaClassifyResponse,
  KlippaCreditResponse,
} from "./types.js";

export interface KlippaClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Klippa OCR API client for receipt/invoice parsing and document classification.
 *
 * Uses API key authentication via the X-Auth-Key header.
 */
export class KlippaClient extends BaseIntegrationClient {
  constructor(config: KlippaClientOptions) {
    super({
      baseUrl: config.baseUrl ?? "https://custom-ocr.klippa.com/api/v1",
      authType: "api_key",
      credentials: { apiKey: config.apiKey, headerName: "X-Auth-Key" },
      timeout: config.timeout ?? 60_000,
      retry: config.retries
        ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 }
        : undefined,
      rateLimit: { requestsPerMinute: 60 },
    });
  }

  // ── Parse Document ─────────────────────────────────────────────────────

  /** Parse a receipt or invoice document via OCR. */
  async parseDocument(
    params: KlippaParseRequest,
  ): Promise<KlippaParseResponse> {
    const { data } = await this.post<KlippaParseResponse>(
      "/parseDocument",
      params,
    );
    return data;
  }

  /** Convenience: parse a document from base64 with a specific template. */
  async parseReceipt(
    documentBase64: string,
    options?: { template?: string; language?: string },
  ): Promise<KlippaParseResponse> {
    return this.parseDocument({
      document: documentBase64,
      template: options?.template ?? "financial_full",
      language: options?.language,
    });
  }

  // ── Classify Document ──────────────────────────────────────────────────

  /** Classify a document to determine its type. */
  async classifyDocument(
    params: KlippaClassifyRequest,
  ): Promise<KlippaClassifyResponse> {
    const { data } = await this.post<KlippaClassifyResponse>(
      "/classifyDocument",
      params,
    );
    return data;
  }

  // ── Credits ────────────────────────────────────────────────────────────

  /** Get remaining API credits. */
  async getCredits(): Promise<KlippaCreditResponse> {
    const { data } = await this.get<KlippaCreditResponse>("/credits");
    return data;
  }

  // ── Connection Test ────────────────────────────────────────────────────

  /** Test the connection by checking credit balance. */
  async testConnection(): Promise<boolean> {
    try {
      const credits = await this.getCredits();
      return credits.status === "success";
    } catch {
      return false;
    }
  }
}

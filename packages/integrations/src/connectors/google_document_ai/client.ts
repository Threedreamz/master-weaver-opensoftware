import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  DocumentAiClientConfig,
  ProcessRequest,
  ProcessResponse,
  BatchProcessRequest,
  BatchProcessOperation,
  RawDocumentInput,
  GcsDocumentInput,
  DocumentAiMimeType,
  Document,
  Entity,
} from "./types.js";

// ==================== Document AI Client ====================

export class DocumentAiClient {
  private client: BaseIntegrationClient;
  private processorPath: string;

  constructor(private config: DocumentAiClientConfig) {
    const endpoint = config.endpoint ?? `https://${config.location}-documentai.googleapis.com/v1`;

    this.processorPath = `projects/${config.projectId}/locations/${config.location}/processors/${config.processorId}`;

    this.client = new BaseIntegrationClient({
      baseUrl: endpoint,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 120_000,
      rateLimit: { requestsPerMinute: 30 },
    });
  }

  /**
   * Update the access token (e.g., after a refresh).
   */
  updateAccessToken(accessToken: string): void {
    this.config.accessToken = accessToken;
    // Recreate the client with new credentials
    const endpoint = this.config.endpoint ?? `https://${this.config.location}-documentai.googleapis.com/v1`;
    this.client = new BaseIntegrationClient({
      baseUrl: endpoint,
      authType: "oauth2",
      credentials: { accessToken },
      timeout: this.config.timeout ?? 120_000,
      rateLimit: { requestsPerMinute: 30 },
    });
  }

  // ==================== Process Document ====================

  /**
   * Process a single document synchronously.
   * For inline documents, pass base64-encoded content.
   * For GCS documents, pass a GCS URI.
   */
  async processDocument(request: ProcessRequest): Promise<ProcessResponse> {
    const path = `/${this.processorPath}:process`;
    const response = await this.client.post<ProcessResponse>(path, request);
    return response.data;
  }

  /**
   * Convenience: process a document from raw bytes.
   */
  async processRawDocument(
    content: string,
    mimeType: DocumentAiMimeType,
    options?: {
      skipHumanReview?: boolean;
      fieldMask?: string;
      enableNativePdfParsing?: boolean;
    },
  ): Promise<ProcessResponse> {
    const rawDocument: RawDocumentInput = { content, mimeType };

    const request: ProcessRequest = {
      rawDocument,
      skipHumanReview: options?.skipHumanReview,
      fieldMask: options?.fieldMask,
    };

    if (options?.enableNativePdfParsing) {
      request.processOptions = {
        ocrConfig: { enableNativePdfParsing: true },
      };
    }

    return this.processDocument(request);
  }

  /**
   * Convenience: process a document from Google Cloud Storage.
   */
  async processGcsDocument(
    gcsUri: string,
    mimeType: DocumentAiMimeType,
    options?: {
      skipHumanReview?: boolean;
      fieldMask?: string;
    },
  ): Promise<ProcessResponse> {
    const gcsDocument: GcsDocumentInput = { gcsUri, mimeType };

    return this.processDocument({
      gcsDocument,
      skipHumanReview: options?.skipHumanReview,
      fieldMask: options?.fieldMask,
    });
  }

  // ==================== Batch Process ====================

  /**
   * Start a batch processing operation (asynchronous, long-running).
   * Returns an operation that can be polled for status.
   */
  async batchProcess(request: BatchProcessRequest): Promise<BatchProcessOperation> {
    const path = `/${this.processorPath}:batchProcess`;
    const response = await this.client.post<BatchProcessOperation>(path, request);
    return response.data;
  }

  /**
   * Convenience: batch process documents from a GCS prefix.
   */
  async batchProcessFromPrefix(
    inputGcsPrefix: string,
    outputGcsUri: string,
    options?: {
      skipHumanReview?: boolean;
      pagesPerShard?: number;
    },
  ): Promise<BatchProcessOperation> {
    return this.batchProcess({
      inputDocuments: {
        gcsPrefix: { gcsUriPrefix: inputGcsPrefix },
      },
      documentOutputConfig: {
        gcsOutputConfig: {
          gcsUri: outputGcsUri,
          shardingConfig: options?.pagesPerShard
            ? { pagesPerShard: options.pagesPerShard }
            : undefined,
        },
      },
      skipHumanReview: options?.skipHumanReview,
    });
  }

  /**
   * Check the status of a long-running batch operation.
   */
  async getOperation(operationName: string): Promise<BatchProcessOperation> {
    const path = `/${operationName}`;
    const response = await this.client.get<BatchProcessOperation>(path);
    return response.data;
  }

  /**
   * Poll an operation until it completes or times out.
   */
  async waitForOperation(
    operationName: string,
    options?: { pollIntervalMs?: number; timeoutMs?: number },
  ): Promise<BatchProcessOperation> {
    const pollInterval = options?.pollIntervalMs ?? 5_000;
    const timeout = options?.timeoutMs ?? 600_000;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const op = await this.getOperation(operationName);
      if (op.done) return op;
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Operation ${operationName} timed out after ${timeout}ms`);
  }

  // ==================== Entity Extraction Helpers ====================

  /**
   * Extract entities from a processed document, grouped by type.
   */
  static extractEntitiesByType(document: Document): Map<string, Entity[]> {
    const grouped = new Map<string, Entity[]>();
    for (const entity of document.entities) {
      const existing = grouped.get(entity.type) ?? [];
      existing.push(entity);
      grouped.set(entity.type, existing);
    }
    return grouped;
  }

  /**
   * Extract all form field key-value pairs from a document.
   */
  static extractFormFields(document: Document): Array<{ key: string; value: string; confidence: number }> {
    const fields: Array<{ key: string; value: string; confidence: number }> = [];

    for (const page of document.pages) {
      for (const field of page.formFields) {
        const key = DocumentAiClient.resolveTextAnchor(document.text, field.fieldName.textAnchor);
        const value = DocumentAiClient.resolveTextAnchor(document.text, field.fieldValue.textAnchor);
        const confidence = Math.min(field.fieldName.confidence, field.fieldValue.confidence);
        fields.push({ key: key.trim(), value: value.trim(), confidence });
      }
    }

    return fields;
  }

  /**
   * Extract all table data from a document as arrays of rows.
   */
  static extractTables(document: Document): Array<{ page: number; headers: string[][]; rows: string[][] }> {
    const tables: Array<{ page: number; headers: string[][]; rows: string[][] }> = [];

    for (const page of document.pages) {
      for (const table of page.tables) {
        const headers = table.headerRows.map((row) =>
          row.cells.map((cell) =>
            DocumentAiClient.resolveTextAnchor(document.text, cell.layout.textAnchor).trim(),
          ),
        );
        const rows = table.bodyRows.map((row) =>
          row.cells.map((cell) =>
            DocumentAiClient.resolveTextAnchor(document.text, cell.layout.textAnchor).trim(),
          ),
        );
        tables.push({ page: page.pageNumber, headers, rows });
      }
    }

    return tables;
  }

  /**
   * Resolve a TextAnchor to its actual text content.
   */
  private static resolveTextAnchor(fullText: string, anchor: { textSegments: Array<{ startIndex: string; endIndex: string }> }): string {
    return anchor.textSegments
      .map((seg) => fullText.slice(Number(seg.startIndex), Number(seg.endIndex)))
      .join("");
  }
}

import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  RossumClientConfig,
  RossumQueue,
  RossumQueueListResponse,
  RossumAnnotation,
  RossumAnnotationListParams,
  RossumAnnotationListResponse,
  RossumDocument,
  RossumUploadParams,
  RossumContent,
  RossumSchema,
} from "./types.js";

export interface RossumClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Rossum AI API client for invoice processing, data extraction, and validation.
 *
 * Uses API key authentication via the Authorization: Bearer header.
 */
export class RossumClient extends BaseIntegrationClient {
  constructor(config: RossumClientOptions) {
    super({
      baseUrl: config.baseUrl ?? "https://elis.rossum.ai/api/v1",
      authType: "api_key",
      credentials: { apiKey: config.apiKey },
      timeout: config.timeout ?? 60_000,
      retry: config.retries
        ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 }
        : undefined,
      rateLimit: { requestsPerMinute: 120 },
    });
  }

  // ── Queues ─────────────────────────────────────────────────────────────

  /** List all queues. */
  async listQueues(params?: {
    page?: number;
    page_size?: number;
  }): Promise<RossumQueueListResponse> {
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.page_size) query.page_size = String(params.page_size);

    const { data } = await this.get<RossumQueueListResponse>(
      "/queues",
      query,
    );
    return data;
  }

  /** Get a queue by ID. */
  async getQueue(queueId: number): Promise<RossumQueue> {
    const { data } = await this.get<RossumQueue>(`/queues/${queueId}`);
    return data;
  }

  // ── Document Upload ────────────────────────────────────────────────────

  /** Upload a document to a queue for processing. */
  async uploadDocument(
    params: RossumUploadParams,
  ): Promise<RossumDocument> {
    const { data } = await this.post<RossumDocument>(
      `/queues/${params.queueId}/upload`,
      {
        content: params.content,
        filename: params.filename,
        metadata: params.metadata,
      },
    );
    return data;
  }

  /** Get a document by ID. */
  async getDocument(documentId: number): Promise<RossumDocument> {
    const { data } = await this.get<RossumDocument>(
      `/documents/${documentId}`,
    );
    return data;
  }

  // ── Annotations ────────────────────────────────────────────────────────

  /** List annotations with optional filters. */
  async listAnnotations(
    params?: RossumAnnotationListParams,
  ): Promise<RossumAnnotationListResponse> {
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.page_size) query.page_size = String(params.page_size);
    if (params?.status) {
      query.status = Array.isArray(params.status)
        ? params.status.join(",")
        : params.status;
    }
    if (params?.queue) query.queue = String(params.queue);
    if (params?.ordering) query.ordering = params.ordering;

    const { data } = await this.get<RossumAnnotationListResponse>(
      "/annotations",
      query,
    );
    return data;
  }

  /** Get a specific annotation. */
  async getAnnotation(annotationId: number): Promise<RossumAnnotation> {
    const { data } = await this.get<RossumAnnotation>(
      `/annotations/${annotationId}`,
    );
    return data;
  }

  /** Get extracted content/data for an annotation. */
  async getAnnotationContent(annotationId: number): Promise<RossumContent> {
    const { data } = await this.get<RossumContent>(
      `/annotations/${annotationId}/content`,
    );
    return data;
  }

  /** Confirm an annotation (mark as validated). */
  async confirmAnnotation(annotationId: number): Promise<RossumAnnotation> {
    const { data } = await this.post<RossumAnnotation>(
      `/annotations/${annotationId}/confirm`,
    );
    return data;
  }

  /** Reject an annotation. */
  async rejectAnnotation(annotationId: number): Promise<RossumAnnotation> {
    const { data } = await this.post<RossumAnnotation>(
      `/annotations/${annotationId}/reject`,
    );
    return data;
  }

  /** Delete an annotation. */
  async deleteAnnotation(annotationId: number): Promise<void> {
    await this.delete(`/annotations/${annotationId}`);
  }

  // ── Schemas ────────────────────────────────────────────────────────────

  /** Get a schema by ID. */
  async getSchema(schemaId: number): Promise<RossumSchema> {
    const { data } = await this.get<RossumSchema>(`/schemas/${schemaId}`);
    return data;
  }

  // ── Connection Test ────────────────────────────────────────────────────

  /** Test the connection by listing queues. */
  async testConnection(): Promise<boolean> {
    try {
      const queues = await this.listQueues({ page_size: 1 });
      return queues.pagination !== undefined;
    } catch {
      return false;
    }
  }
}

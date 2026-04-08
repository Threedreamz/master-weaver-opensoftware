import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  GoogleCloudVisionClientConfig,
  VisionImage,
  VisionFeature,
  VisionFeatureType,
  VisionAnnotateRequest,
  VisionBatchAnnotateRequest,
  VisionBatchAnnotateResponse,
  VisionAnnotateResponse,
  VisionEntityAnnotation,
  VisionTextAnnotation,
  VisionLabel,
  VisionSafeSearchAnnotation,
  VisionLocalizedObject,
} from "./types.js";

export interface GoogleCloudVisionClientOptions {
  accessToken: string;
  projectId?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Google Cloud Vision API client for OCR, document text detection, and label detection.
 *
 * Uses OAuth2 Bearer token authentication.
 */
export class GoogleCloudVisionClient {
  private client: BaseIntegrationClient;
  private config: GoogleCloudVisionClientOptions;

  constructor(config: GoogleCloudVisionClientOptions) {
    this.config = config;
    this.client = new BaseIntegrationClient({
      baseUrl: "https://vision.googleapis.com/v1",
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 60_000,
      rateLimit: { requestsPerMinute: 1800 },
    });
  }

  /** Update the access token (e.g., after a refresh). */
  updateAccessToken(accessToken: string): void {
    this.config.accessToken = accessToken;
    this.client = new BaseIntegrationClient({
      baseUrl: "https://vision.googleapis.com/v1",
      authType: "oauth2",
      credentials: { accessToken },
      timeout: this.config.timeout ?? 60_000,
      rateLimit: { requestsPerMinute: 1800 },
    });
  }

  // ── Core Annotate ──────────────────────────────────────────────────────

  /** Annotate images with specified features. */
  async annotate(
    requests: VisionAnnotateRequest[],
  ): Promise<VisionBatchAnnotateResponse> {
    const body: VisionBatchAnnotateRequest = { requests };
    const response =
      await this.client.post<VisionBatchAnnotateResponse>(
        "/images:annotate",
        body,
      );
    return response.data;
  }

  /** Annotate a single image with specified features. */
  async annotateImage(
    image: VisionImage,
    features: VisionFeature[],
    options?: {
      languageHints?: string[];
    },
  ): Promise<VisionAnnotateResponse> {
    const request: VisionAnnotateRequest = {
      image,
      features,
      imageContext: options?.languageHints
        ? { languageHints: options.languageHints }
        : undefined,
    };
    const result = await this.annotate([request]);
    return result.responses[0];
  }

  // ── OCR / Text Detection ───────────────────────────────────────────────

  /**
   * Detect text in an image (TEXT_DETECTION).
   * Best for photos with text, signs, handwriting.
   */
  async detectText(
    imageBase64: string,
    options?: { languageHints?: string[] },
  ): Promise<VisionEntityAnnotation[]> {
    const response = await this.annotateImage(
      { content: imageBase64 },
      [{ type: "TEXT_DETECTION" }],
      options,
    );
    return response.textAnnotations ?? [];
  }

  /**
   * Detect text from a GCS URI.
   */
  async detectTextFromGcs(
    gcsUri: string,
    options?: { languageHints?: string[] },
  ): Promise<VisionEntityAnnotation[]> {
    const response = await this.annotateImage(
      { source: { gcsImageUri: gcsUri } },
      [{ type: "TEXT_DETECTION" }],
      options,
    );
    return response.textAnnotations ?? [];
  }

  // ── Document Text Detection ────────────────────────────────────────────

  /**
   * Detect dense text / document OCR (DOCUMENT_TEXT_DETECTION).
   * Best for scanned documents, PDFs.
   */
  async detectDocumentText(
    imageBase64: string,
    options?: { languageHints?: string[] },
  ): Promise<VisionTextAnnotation | null> {
    const response = await this.annotateImage(
      { content: imageBase64 },
      [{ type: "DOCUMENT_TEXT_DETECTION" }],
      options,
    );
    return response.fullTextAnnotation ?? null;
  }

  /**
   * Detect document text from a GCS URI.
   */
  async detectDocumentTextFromGcs(
    gcsUri: string,
    options?: { languageHints?: string[] },
  ): Promise<VisionTextAnnotation | null> {
    const response = await this.annotateImage(
      { source: { gcsImageUri: gcsUri } },
      [{ type: "DOCUMENT_TEXT_DETECTION" }],
      options,
    );
    return response.fullTextAnnotation ?? null;
  }

  // ── Label Detection ────────────────────────────────────────────────────

  /** Detect labels/categories in an image. */
  async detectLabels(
    imageBase64: string,
    maxResults?: number,
  ): Promise<VisionLabel[]> {
    const response = await this.annotateImage(
      { content: imageBase64 },
      [{ type: "LABEL_DETECTION", maxResults: maxResults ?? 10 }],
    );
    return response.labelAnnotations ?? [];
  }

  /** Detect labels from a GCS URI. */
  async detectLabelsFromGcs(
    gcsUri: string,
    maxResults?: number,
  ): Promise<VisionLabel[]> {
    const response = await this.annotateImage(
      { source: { gcsImageUri: gcsUri } },
      [{ type: "LABEL_DETECTION", maxResults: maxResults ?? 10 }],
    );
    return response.labelAnnotations ?? [];
  }

  // ── Safe Search ────────────────────────────────────────────────────────

  /** Detect safe search properties of an image. */
  async detectSafeSearch(
    imageBase64: string,
  ): Promise<VisionSafeSearchAnnotation | null> {
    const response = await this.annotateImage(
      { content: imageBase64 },
      [{ type: "SAFE_SEARCH_DETECTION" }],
    );
    return response.safeSearchAnnotation ?? null;
  }

  // ── Object Localization ────────────────────────────────────────────────

  /** Detect and localize objects in an image. */
  async localizeObjects(
    imageBase64: string,
    maxResults?: number,
  ): Promise<VisionLocalizedObject[]> {
    const response = await this.annotateImage(
      { content: imageBase64 },
      [{ type: "OBJECT_LOCALIZATION", maxResults: maxResults ?? 10 }],
    );
    return response.localizedObjectAnnotations ?? [];
  }

  // ── Multi-Feature Detection ────────────────────────────────────────────

  /** Run multiple detection features on a single image. */
  async detectMultiple(
    imageBase64: string,
    featureTypes: VisionFeatureType[],
    options?: { maxResults?: number; languageHints?: string[] },
  ): Promise<VisionAnnotateResponse> {
    const features: VisionFeature[] = featureTypes.map((type) => ({
      type,
      maxResults: options?.maxResults ?? 10,
    }));
    return this.annotateImage(
      { content: imageBase64 },
      features,
      options,
    );
  }

  // ── Connection Test ────────────────────────────────────────────────────

  /** Test the connection by running a minimal annotation request. */
  async testConnection(): Promise<boolean> {
    try {
      // Minimal 1x1 white pixel PNG in base64
      const pixel =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
      await this.detectLabels(pixel, 1);
      return true;
    } catch {
      return false;
    }
  }
}

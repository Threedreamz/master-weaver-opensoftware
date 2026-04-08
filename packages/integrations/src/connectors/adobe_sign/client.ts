import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type {
  AdobeSignClientConfig,
  AdobeSignCreateAgreementRequest,
  AdobeSignCreateAgreementResponse,
  AdobeSignAgreementDetails,
  AdobeSignAgreementsListParams,
  AdobeSignAgreementsListResponse,
  AdobeSignAgreementDocumentsResponse,
  AdobeSignTransientDocumentResponse,
  AdobeSignSigningUrlSetInfo,
  AdobeSignLibraryDocumentsResponse,
  AdobeSignLibraryDocumentDetails,
  AdobeSignCreateWebhookRequest,
  AdobeSignCreateWebhookResponse,
  AdobeSignWebhooksListResponse,
  AdobeSignWebhookInfo,
  AdobeSignAgreementStatus,
} from "./types.js";

// ==================== Constants ====================

const ADOBE_SIGN_EU1_BASE = "https://api.eu1.adobesign.com/api/rest/v6";
const ADOBE_SIGN_OAUTH_BASE = "https://secure.eu1.adobesign.com";
const ADOBE_SIGN_TOKEN_BASE = "https://api.eu1.adobesign.com";

// ==================== Adobe Sign Client ====================

export class AdobeSignClient extends BaseIntegrationClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private refreshToken?: string;

  constructor(config: AdobeSignClientConfig) {
    const baseUrl = config.baseUrl ?? ADOBE_SIGN_EU1_BASE;

    super({
      baseUrl,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      rateLimit: { requestsPerMinute: 60 },
    });

    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.refreshToken = config.refreshToken;
  }

  // ==================== OAuth2 Helpers ====================

  /**
   * Generate the OAuth2 authorization URL.
   * @see https://secure.eu1.adobesign.com/public/static/oauthDoc.jsp
   */
  getAuthorizationUrl(redirectUri: string, state: string, scopes?: string[]): string {
    const defaultScopes = [
      "agreement_read",
      "agreement_write",
      "agreement_send",
      "library_read",
      "webhook_read",
      "webhook_write",
    ];
    const scopeList = scopes ?? defaultScopes;

    const url = new URL(`${ADOBE_SIGN_OAUTH_BASE}/public/oauth/v2`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", scopeList.join(" "));
    url.searchParams.set("state", state);
    return url.toString();
  }

  /**
   * Exchange an authorization code for OAuth2 tokens.
   * POST /oauth/v2/token
   */
  async exchangeAuthCode(
    code: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const response = await fetch(`${ADOBE_SIGN_TOKEN_BASE}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new IntegrationError("AUTH_ERROR", `Adobe Sign token exchange failed: ${body}`, response.status);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const accessToken = data.access_token as string;
    const refreshToken = data.refresh_token as string;
    const expiresIn = data.expires_in as number;

    this.credentials.accessToken = accessToken;
    this.refreshToken = refreshToken;

    return { accessToken, refreshToken, expiresIn };
  }

  /**
   * Refresh the OAuth2 access token.
   * POST /oauth/v2/refresh
   */
  async refreshAccessToken(): Promise<{ accessToken: string; expiresIn: number }> {
    if (!this.refreshToken) {
      throw new IntegrationError("AUTH_ERROR", "No refresh token available for Adobe Sign");
    }

    const response = await fetch(`${ADOBE_SIGN_TOKEN_BASE}/oauth/v2/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new IntegrationError("AUTH_ERROR", `Adobe Sign token refresh failed: ${body}`, response.status);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const accessToken = data.access_token as string;
    const expiresIn = data.expires_in as number;

    this.credentials.accessToken = accessToken;

    return { accessToken, expiresIn };
  }

  // ==================== Agreements ====================

  /**
   * Create a new agreement.
   * POST /agreements
   */
  async createAgreement(agreement: AdobeSignCreateAgreementRequest): Promise<AdobeSignCreateAgreementResponse> {
    const { data } = await this.post<AdobeSignCreateAgreementResponse>("/agreements", agreement);
    return data;
  }

  /**
   * Get agreement details by ID.
   * GET /agreements/{agreementId}
   */
  async getAgreement(agreementId: string): Promise<AdobeSignAgreementDetails> {
    const { data } = await this.get<AdobeSignAgreementDetails>(`/agreements/${agreementId}`);
    return data;
  }

  /**
   * List agreements with optional filters.
   * GET /agreements
   */
  async listAgreements(params?: AdobeSignAgreementsListParams): Promise<AdobeSignAgreementsListResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.status) queryParams.status = params.status;
    if (params?.externalId) queryParams.externalId = params.externalId;
    if (params?.externalGroup) queryParams.externalGroup = params.externalGroup;
    if (params?.showHiddenAgreements !== undefined) {
      queryParams.showHiddenAgreements = String(params.showHiddenAgreements);
    }

    const { data } = await this.get<AdobeSignAgreementsListResponse>("/agreements", queryParams);
    return data;
  }

  /**
   * Send a draft agreement (transition to IN_PROCESS).
   * PUT /agreements/{agreementId}/state
   */
  async sendAgreement(agreementId: string): Promise<void> {
    await this.put(`/agreements/${agreementId}/state`, {
      state: "IN_PROCESS",
    });
  }

  /**
   * Cancel an agreement.
   * PUT /agreements/{agreementId}/state
   */
  async cancelAgreement(agreementId: string, comment?: string): Promise<void> {
    const body: Record<string, unknown> = { state: "CANCELLED" };
    if (comment) {
      body.agreementCancellationInfo = {
        comment,
        notifyOthers: true,
      };
    }
    await this.put(`/agreements/${agreementId}/state`, body);
  }

  /**
   * Get the current status of an agreement.
   * GET /agreements/{agreementId}
   */
  async getAgreementStatus(agreementId: string): Promise<{ id: string; status: AdobeSignAgreementStatus }> {
    const agreement = await this.getAgreement(agreementId);
    return { id: agreement.id, status: agreement.status };
  }

  // ==================== Documents ====================

  /**
   * Upload a transient document for use in agreements.
   * POST /transientDocuments
   *
   * Note: This endpoint requires multipart/form-data.
   */
  async uploadTransientDocument(
    fileName: string,
    fileData: Buffer | Uint8Array,
    mimeType: string
  ): Promise<AdobeSignTransientDocumentResponse> {
    const formData = new FormData();
    const blob = new Blob([fileData as unknown as BlobPart], { type: mimeType });
    formData.append("File", blob, fileName);
    formData.append("File-Name", fileName);
    formData.append("Mime-Type", mimeType);

    const response = await this.request<AdobeSignTransientDocumentResponse>({
      method: "POST",
      path: "/transientDocuments",
      body: formData,
      headers: {
        // Let the browser/runtime set the Content-Type with boundary
        "Content-Type": "",
      },
    });

    return response.data;
  }

  /**
   * List documents in an agreement.
   * GET /agreements/{agreementId}/documents
   */
  async listDocuments(agreementId: string): Promise<AdobeSignAgreementDocumentsResponse> {
    const { data } = await this.get<AdobeSignAgreementDocumentsResponse>(
      `/agreements/${agreementId}/documents`
    );
    return data;
  }

  /**
   * Download a specific document from an agreement.
   * GET /agreements/{agreementId}/documents/{documentId}
   */
  async downloadDocument(agreementId: string, documentId: string): Promise<ArrayBuffer> {
    const response = await this.request<ArrayBuffer>({
      method: "GET",
      path: `/agreements/${agreementId}/documents/${documentId}`,
      headers: { Accept: "application/pdf" },
    });
    return response.data;
  }

  /**
   * Download the combined document for an agreement.
   * GET /agreements/{agreementId}/combinedDocument
   */
  async downloadCombinedDocument(agreementId: string): Promise<ArrayBuffer> {
    const response = await this.request<ArrayBuffer>({
      method: "GET",
      path: `/agreements/${agreementId}/combinedDocument`,
      headers: { Accept: "application/pdf" },
    });
    return response.data;
  }

  /**
   * Get the audit trail for an agreement.
   * GET /agreements/{agreementId}/auditTrail
   */
  async getAuditTrail(agreementId: string): Promise<ArrayBuffer> {
    const response = await this.request<ArrayBuffer>({
      method: "GET",
      path: `/agreements/${agreementId}/auditTrail`,
      headers: { Accept: "application/pdf" },
    });
    return response.data;
  }

  // ==================== Signing URLs ====================

  /**
   * Get signing URLs for an agreement's participants.
   * GET /agreements/{agreementId}/signingUrls
   */
  async getSigningUrls(agreementId: string): Promise<AdobeSignSigningUrlSetInfo> {
    const { data } = await this.get<AdobeSignSigningUrlSetInfo>(
      `/agreements/${agreementId}/signingUrls`
    );
    return data;
  }

  // ==================== Templates (Library Documents) ====================

  /**
   * List library documents (templates).
   * GET /libraryDocuments
   */
  async listTemplates(params?: {
    cursor?: string;
    pageSize?: number;
  }): Promise<AdobeSignLibraryDocumentsResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);

    const { data } = await this.get<AdobeSignLibraryDocumentsResponse>("/libraryDocuments", queryParams);
    return data;
  }

  /**
   * Get a library document (template) by ID.
   * GET /libraryDocuments/{libraryDocumentId}
   */
  async getTemplate(libraryDocumentId: string): Promise<AdobeSignLibraryDocumentDetails> {
    const { data } = await this.get<AdobeSignLibraryDocumentDetails>(
      `/libraryDocuments/${libraryDocumentId}`
    );
    return data;
  }

  /**
   * Create an agreement from a library document (template).
   */
  async createAgreementFromTemplate(
    libraryDocumentId: string,
    name: string,
    participantSetsInfo: AdobeSignCreateAgreementRequest["participantSetsInfo"],
    options?: {
      message?: string;
      state?: "IN_PROCESS" | "DRAFT" | "AUTHORING";
      signatureType?: "ESIGN" | "WRITTEN";
      ccs?: AdobeSignCreateAgreementRequest["ccs"];
      expirationTime?: string;
    }
  ): Promise<AdobeSignCreateAgreementResponse> {
    return this.createAgreement({
      name,
      participantSetsInfo,
      fileInfos: [{ libraryDocumentId }],
      signatureType: options?.signatureType ?? "ESIGN",
      state: options?.state ?? "IN_PROCESS",
      message: options?.message,
      ccs: options?.ccs,
      expirationTime: options?.expirationTime,
    });
  }

  // ==================== Webhooks ====================

  /**
   * Create a webhook subscription.
   * POST /webhooks
   */
  async createWebhook(webhook: AdobeSignCreateWebhookRequest): Promise<AdobeSignCreateWebhookResponse> {
    const { data } = await this.post<AdobeSignCreateWebhookResponse>("/webhooks", webhook);
    return data;
  }

  /**
   * List all webhooks.
   * GET /webhooks
   */
  async listWebhooks(params?: {
    cursor?: string;
    pageSize?: number;
  }): Promise<AdobeSignWebhooksListResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);

    const { data } = await this.get<AdobeSignWebhooksListResponse>("/webhooks", queryParams);
    return data;
  }

  /**
   * Get a webhook by ID.
   * GET /webhooks/{webhookId}
   */
  async getWebhook(webhookId: string): Promise<AdobeSignWebhookInfo> {
    const { data } = await this.get<AdobeSignWebhookInfo>(`/webhooks/${webhookId}`);
    return data;
  }

  /**
   * Update a webhook's state (activate/deactivate).
   * PUT /webhooks/{webhookId}/state
   */
  async updateWebhookState(webhookId: string, state: "ACTIVE" | "INACTIVE"): Promise<void> {
    await this.put(`/webhooks/${webhookId}/state`, { state });
  }

  /**
   * Delete a webhook.
   * DELETE /webhooks/{webhookId}
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.delete(`/webhooks/${webhookId}`);
  }

  // ==================== Connection Test ====================

  /**
   * Test the connection by fetching base URIs.
   * GET /baseUris
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.get("/baseUris");
      return true;
    } catch {
      return false;
    }
  }
}

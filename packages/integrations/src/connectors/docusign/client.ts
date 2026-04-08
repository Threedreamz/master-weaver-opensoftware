import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type {
  DocuSignClientConfig,
  DocuSignCreateEnvelopeRequest,
  DocuSignCreateEnvelopeResponse,
  DocuSignEnvelope,
  DocuSignEnvelopesListParams,
  DocuSignEnvelopesListResponse,
  DocuSignDocumentsResponse,
  DocuSignRecipients,
  DocuSignRecipientViewRequest,
  DocuSignRecipientViewResponse,
  DocuSignTemplate,
  DocuSignTemplatesResponse,
  DocuSignConnectConfig,
  DocuSignConnectConfigResponse,
  DocuSignConnectListResponse,
} from "./types.js";

// ==================== Constants ====================

const DOCUSIGN_PRODUCTION_BASE = "https://eu.docusign.net/restapi/v2.1";
const DOCUSIGN_DEMO_BASE = "https://demo.docusign.net/restapi/v2.1";
const DOCUSIGN_OAUTH_BASE = "https://account.docusign.com";
const DOCUSIGN_OAUTH_DEMO_BASE = "https://account-d.docusign.com";

// ==================== DocuSign Client ====================

export class DocuSignClient extends BaseIntegrationClient {
  private readonly accountId: string;
  private readonly integrationKey: string;
  private readonly secretKey: string;
  private readonly oauthBase: string;
  private refreshToken?: string;

  constructor(config: DocuSignClientConfig) {
    const isSandbox = config.useSandbox ?? false;
    const baseUrl = config.baseUrl ?? (isSandbox ? DOCUSIGN_DEMO_BASE : DOCUSIGN_PRODUCTION_BASE);

    super({
      baseUrl,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      rateLimit: { requestsPerMinute: 60 },
      defaultHeaders: {
        "X-DocuSign-SDK": "opensoftware-integrations",
      },
    });

    this.accountId = config.accountId;
    this.integrationKey = config.integrationKey;
    this.secretKey = config.secretKey;
    this.refreshToken = config.refreshToken;
    this.oauthBase = isSandbox ? DOCUSIGN_OAUTH_DEMO_BASE : DOCUSIGN_OAUTH_BASE;
  }

  // ==================== OAuth2 Helpers ====================

  /**
   * Generate the OAuth2 authorization URL for the Auth Code grant flow.
   */
  getAuthorizationUrl(redirectUri: string, state: string): string {
    const url = new URL(`${this.oauthBase}/oauth/auth`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "signature impersonation");
    url.searchParams.set("client_id", this.integrationKey);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  }

  /**
   * Exchange an authorization code for OAuth2 tokens.
   */
  async exchangeAuthCode(
    code: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const basicAuth = btoa(`${this.integrationKey}:${this.secretKey}`);

    const response = await fetch(`${this.oauthBase}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new IntegrationError("AUTH_ERROR", `DocuSign token exchange failed: ${body}`, response.status);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const accessToken = data.access_token as string;
    const refreshToken = data.refresh_token as string;
    const expiresIn = data.expires_in as number;

    // Update internal credentials
    this.credentials.accessToken = accessToken;
    this.refreshToken = refreshToken;

    return { accessToken, refreshToken, expiresIn };
  }

  /**
   * Refresh the OAuth2 access token using the refresh token.
   */
  async refreshAccessToken(): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    if (!this.refreshToken) {
      throw new IntegrationError("AUTH_ERROR", "No refresh token available for DocuSign");
    }

    const basicAuth = btoa(`${this.integrationKey}:${this.secretKey}`);

    const response = await fetch(`${this.oauthBase}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new IntegrationError("AUTH_ERROR", `DocuSign token refresh failed: ${body}`, response.status);
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
   * Obtain a JWT-based access token for server-to-server integrations.
   */
  async getJwtAccessToken(rsaPrivateKey: string, userId: string): Promise<{ accessToken: string; expiresIn: number }> {
    // Build JWT assertion header + payload
    const header = btoa(JSON.stringify({ typ: "JWT", alg: "RS256" }));
    const now = Math.floor(Date.now() / 1000);
    const payload = btoa(
      JSON.stringify({
        iss: this.integrationKey,
        sub: userId,
        aud: this.oauthBase.replace("https://", ""),
        iat: now,
        exp: now + 3600,
        scope: "signature impersonation",
      })
    );

    // Sign with Web Crypto API (Node 20+)
    const encoder = new TextEncoder();
    const signingInput = encoder.encode(`${header}.${payload}`);

    const keyData = rsaPrivateKey
      .replace(/-----BEGIN RSA PRIVATE KEY-----/, "")
      .replace(/-----END RSA PRIVATE KEY-----/, "")
      .replace(/\s/g, "");

    const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, signingInput);
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const assertion = `${header}.${payload}.${signatureBase64}`;

    const response = await fetch(`${this.oauthBase}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new IntegrationError("AUTH_ERROR", `DocuSign JWT auth failed: ${body}`, response.status);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const accessToken = data.access_token as string;
    const expiresIn = data.expires_in as number;

    this.credentials.accessToken = accessToken;

    return { accessToken, expiresIn };
  }

  // ==================== Envelopes ====================

  /**
   * Create a new envelope (draft or sent).
   * POST /accounts/{accountId}/envelopes
   */
  async createEnvelope(envelope: DocuSignCreateEnvelopeRequest): Promise<DocuSignCreateEnvelopeResponse> {
    const { data } = await this.post<DocuSignCreateEnvelopeResponse>(
      `/accounts/${this.accountId}/envelopes`,
      envelope
    );
    return data;
  }

  /**
   * Get envelope details by ID.
   * GET /accounts/{accountId}/envelopes/{envelopeId}
   */
  async getEnvelope(envelopeId: string): Promise<DocuSignEnvelope> {
    const { data } = await this.get<DocuSignEnvelope>(
      `/accounts/${this.accountId}/envelopes/${envelopeId}`
    );
    return data;
  }

  /**
   * List envelopes with optional filters.
   * GET /accounts/{accountId}/envelopes
   */
  async listEnvelopes(params: DocuSignEnvelopesListParams): Promise<DocuSignEnvelopesListResponse> {
    const queryParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        queryParams[key === "fromDate" ? "from_date" : key === "toDate" ? "to_date" : key] = String(value);
      }
    }

    const { data } = await this.get<DocuSignEnvelopesListResponse>(
      `/accounts/${this.accountId}/envelopes`,
      queryParams
    );
    return data;
  }

  /**
   * Send a draft envelope.
   * PUT /accounts/{accountId}/envelopes/{envelopeId}
   */
  async sendEnvelope(envelopeId: string): Promise<DocuSignEnvelope> {
    const { data } = await this.put<DocuSignEnvelope>(
      `/accounts/${this.accountId}/envelopes/${envelopeId}`,
      { status: "sent" }
    );
    return data;
  }

  /**
   * Void an envelope.
   * PUT /accounts/{accountId}/envelopes/{envelopeId}
   */
  async voidEnvelope(envelopeId: string, voidedReason: string): Promise<DocuSignEnvelope> {
    const { data } = await this.put<DocuSignEnvelope>(
      `/accounts/${this.accountId}/envelopes/${envelopeId}`,
      { status: "voided", voidedReason }
    );
    return data;
  }

  /**
   * Get envelope status (lightweight).
   * GET /accounts/{accountId}/envelopes/{envelopeId}
   */
  async getEnvelopeStatus(envelopeId: string): Promise<{ envelopeId: string; status: string }> {
    const envelope = await this.getEnvelope(envelopeId);
    return { envelopeId: envelope.envelopeId, status: envelope.status };
  }

  // ==================== Documents ====================

  /**
   * List documents in an envelope.
   * GET /accounts/{accountId}/envelopes/{envelopeId}/documents
   */
  async listDocuments(envelopeId: string): Promise<DocuSignDocumentsResponse> {
    const { data } = await this.get<DocuSignDocumentsResponse>(
      `/accounts/${this.accountId}/envelopes/${envelopeId}/documents`
    );
    return data;
  }

  /**
   * Download a document from an envelope as base64.
   * GET /accounts/{accountId}/envelopes/{envelopeId}/documents/{documentId}
   */
  async downloadDocument(envelopeId: string, documentId: string): Promise<ArrayBuffer> {
    const url = `/accounts/${this.accountId}/envelopes/${envelopeId}/documents/${documentId}`;
    const response = await this.request<ArrayBuffer>({
      method: "GET",
      path: url,
      headers: { Accept: "application/pdf" },
    });
    return response.data;
  }

  /**
   * Get the combined (merged) document for an envelope.
   * GET /accounts/{accountId}/envelopes/{envelopeId}/documents/combined
   */
  async downloadCombinedDocument(envelopeId: string): Promise<ArrayBuffer> {
    const url = `/accounts/${this.accountId}/envelopes/${envelopeId}/documents/combined`;
    const response = await this.request<ArrayBuffer>({
      method: "GET",
      path: url,
      headers: { Accept: "application/pdf" },
    });
    return response.data;
  }

  // ==================== Recipients ====================

  /**
   * List recipients for an envelope.
   * GET /accounts/{accountId}/envelopes/{envelopeId}/recipients
   */
  async listRecipients(envelopeId: string): Promise<DocuSignRecipients> {
    const { data } = await this.get<DocuSignRecipients>(
      `/accounts/${this.accountId}/envelopes/${envelopeId}/recipients`
    );
    return data;
  }

  /**
   * Add recipients to an existing envelope.
   * POST /accounts/{accountId}/envelopes/{envelopeId}/recipients
   */
  async addRecipients(envelopeId: string, recipients: Partial<DocuSignRecipients>): Promise<DocuSignRecipients> {
    const { data } = await this.post<DocuSignRecipients>(
      `/accounts/${this.accountId}/envelopes/${envelopeId}/recipients`,
      recipients
    );
    return data;
  }

  /**
   * Update recipients on an envelope.
   * PUT /accounts/{accountId}/envelopes/{envelopeId}/recipients
   */
  async updateRecipients(envelopeId: string, recipients: Partial<DocuSignRecipients>): Promise<DocuSignRecipients> {
    const { data } = await this.put<DocuSignRecipients>(
      `/accounts/${this.accountId}/envelopes/${envelopeId}/recipients`,
      recipients
    );
    return data;
  }

  /**
   * Remove a recipient from an envelope.
   * DELETE /accounts/{accountId}/envelopes/{envelopeId}/recipients/{recipientId}
   */
  async deleteRecipient(envelopeId: string, recipientId: string): Promise<void> {
    await this.delete(
      `/accounts/${this.accountId}/envelopes/${envelopeId}/recipients/${recipientId}`
    );
  }

  // ==================== Signing URLs ====================

  /**
   * Create an embedded signing URL (recipient view).
   * POST /accounts/{accountId}/envelopes/{envelopeId}/views/recipient
   */
  async createSigningUrl(
    envelopeId: string,
    viewRequest: DocuSignRecipientViewRequest
  ): Promise<DocuSignRecipientViewResponse> {
    const { data } = await this.post<DocuSignRecipientViewResponse>(
      `/accounts/${this.accountId}/envelopes/${envelopeId}/views/recipient`,
      viewRequest
    );
    return data;
  }

  /**
   * Create an embedded sender view URL (for editing before sending).
   * POST /accounts/{accountId}/envelopes/{envelopeId}/views/sender
   */
  async createSenderView(
    envelopeId: string,
    returnUrl: string
  ): Promise<DocuSignRecipientViewResponse> {
    const { data } = await this.post<DocuSignRecipientViewResponse>(
      `/accounts/${this.accountId}/envelopes/${envelopeId}/views/sender`,
      { returnUrl }
    );
    return data;
  }

  /**
   * Create a console view URL for the DocuSign console.
   * POST /accounts/{accountId}/views/console
   */
  async createConsoleView(returnUrl: string, envelopeId?: string): Promise<DocuSignRecipientViewResponse> {
    const body: Record<string, string> = { returnUrl };
    if (envelopeId) body.envelopeId = envelopeId;

    const { data } = await this.post<DocuSignRecipientViewResponse>(
      `/accounts/${this.accountId}/views/console`,
      body
    );
    return data;
  }

  // ==================== Templates ====================

  /**
   * List account templates.
   * GET /accounts/{accountId}/templates
   */
  async listTemplates(params?: {
    count?: string;
    startPosition?: string;
    searchText?: string;
    folder?: string;
    order?: "asc" | "desc";
    orderBy?: "name" | "modified";
  }): Promise<DocuSignTemplatesResponse> {
    const queryParams: Record<string, string> = {};
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) queryParams[key] = value;
      }
    }

    const { data } = await this.get<DocuSignTemplatesResponse>(
      `/accounts/${this.accountId}/templates`,
      queryParams
    );
    return data;
  }

  /**
   * Get a template by ID.
   * GET /accounts/{accountId}/templates/{templateId}
   */
  async getTemplate(templateId: string): Promise<DocuSignTemplate> {
    const { data } = await this.get<DocuSignTemplate>(
      `/accounts/${this.accountId}/templates/${templateId}`
    );
    return data;
  }

  /**
   * Create an envelope from a template.
   * POST /accounts/{accountId}/envelopes
   */
  async createEnvelopeFromTemplate(
    templateId: string,
    templateRoles: Array<{
      roleName: string;
      name: string;
      email: string;
      clientUserId?: string;
    }>,
    options?: {
      emailSubject?: string;
      emailBlurb?: string;
      status?: "created" | "sent";
    }
  ): Promise<DocuSignCreateEnvelopeResponse> {
    return this.createEnvelope({
      templateId,
      templateRoles,
      emailSubject: options?.emailSubject ?? "",
      status: options?.status ?? "sent",
      emailBlurb: options?.emailBlurb,
      recipients: { signers: [] },
    });
  }

  // ==================== Connect (Webhooks) ====================

  /**
   * Create a DocuSign Connect webhook configuration.
   * POST /accounts/{accountId}/connect
   */
  async createConnectConfig(config: DocuSignConnectConfig): Promise<DocuSignConnectConfigResponse> {
    const { data } = await this.post<DocuSignConnectConfigResponse>(
      `/accounts/${this.accountId}/connect`,
      config
    );
    return data;
  }

  /**
   * List all Connect configurations.
   * GET /accounts/{accountId}/connect
   */
  async listConnectConfigs(): Promise<DocuSignConnectListResponse> {
    const { data } = await this.get<DocuSignConnectListResponse>(
      `/accounts/${this.accountId}/connect`
    );
    return data;
  }

  /**
   * Delete a Connect configuration.
   * DELETE /accounts/{accountId}/connect/{connectId}
   */
  async deleteConnectConfig(connectId: string): Promise<void> {
    await this.delete(`/accounts/${this.accountId}/connect/${connectId}`);
  }

  // ==================== Connection Test ====================

  /**
   * Test the connection by fetching user info.
   * GET /oauth/userinfo
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.get(`/accounts/${this.accountId}`);
      return true;
    } catch {
      return false;
    }
  }
}

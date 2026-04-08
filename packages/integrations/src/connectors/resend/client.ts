import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  ResendClientConfig,
  ResendSendEmailRequest,
  ResendSendEmailResponse,
  ResendBatchSendResponse,
  ResendEmail,
  ResendDomain,
  ResendCreateDomainRequest,
  ResendCreateDomainResponse,
  ResendListDomainsResponse,
  ResendVerifyDomainResponse,
  ResendApiKey,
  ResendCreateApiKeyRequest,
  ResendCreateApiKeyResponse,
  ResendListApiKeysResponse,
  ResendAudience,
  ResendCreateAudienceRequest,
  ResendListAudiencesResponse,
  ResendContact,
  ResendCreateContactRequest,
  ResendCreateContactResponse,
  ResendListContactsResponse,
} from "./types.js";

/**
 * Resend API client.
 *
 * Supports: sending email, domains, API keys, audiences, contacts.
 * Auth: Bearer token (API key).
 * Rate limit: 100 RPM default.
 */
export class ResendClient extends BaseIntegrationClient {
  constructor(config: ResendClientConfig) {
    super({
      baseUrl: "https://api.resend.com",
      authType: "api_key",
      credentials: { apiKey: config.apiKey },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 100 },
    });
  }

  // ==================== Send Email ====================

  /** Send a single email. */
  async sendEmail(
    params: ResendSendEmailRequest
  ): Promise<ApiResponse<ResendSendEmailResponse>> {
    return this.post<ResendSendEmailResponse>("/emails", params);
  }

  /** Send a batch of emails (up to 100). */
  async sendBatchEmail(
    emails: ResendSendEmailRequest[]
  ): Promise<ApiResponse<ResendBatchSendResponse>> {
    return this.post<ResendBatchSendResponse>("/emails/batch", emails);
  }

  /** Retrieve a sent email by ID. */
  async getEmail(emailId: string): Promise<ApiResponse<ResendEmail>> {
    return this.get<ResendEmail>(`/emails/${emailId}`);
  }

  /** Cancel a scheduled email. */
  async cancelEmail(
    emailId: string
  ): Promise<ApiResponse<{ id: string; object: string }>> {
    return this.post<{ id: string; object: string }>(
      `/emails/${emailId}/cancel`
    );
  }

  // ==================== Domains ====================

  /** List all domains. */
  async listDomains(): Promise<ApiResponse<ResendListDomainsResponse>> {
    return this.get<ResendListDomainsResponse>("/domains");
  }

  /** Get a single domain by ID. */
  async getDomain(domainId: string): Promise<ApiResponse<ResendDomain>> {
    return this.get<ResendDomain>(`/domains/${domainId}`);
  }

  /** Add a new domain. */
  async createDomain(
    data: ResendCreateDomainRequest
  ): Promise<ApiResponse<ResendCreateDomainResponse>> {
    return this.post<ResendCreateDomainResponse>("/domains", data);
  }

  /** Verify a domain (trigger DNS check). */
  async verifyDomain(
    domainId: string
  ): Promise<ApiResponse<ResendVerifyDomainResponse>> {
    return this.post<ResendVerifyDomainResponse>(
      `/domains/${domainId}/verify`
    );
  }

  /** Delete a domain. */
  async deleteDomain(
    domainId: string
  ): Promise<ApiResponse<{ object: string; id: string; deleted: boolean }>> {
    return this.delete<{ object: string; id: string; deleted: boolean }>(
      `/domains/${domainId}`
    );
  }

  // ==================== API Keys ====================

  /** List all API keys. */
  async listApiKeys(): Promise<ApiResponse<ResendListApiKeysResponse>> {
    return this.get<ResendListApiKeysResponse>("/api-keys");
  }

  /** Create a new API key. */
  async createApiKey(
    data: ResendCreateApiKeyRequest
  ): Promise<ApiResponse<ResendCreateApiKeyResponse>> {
    return this.post<ResendCreateApiKeyResponse>("/api-keys", data);
  }

  /** Delete an API key. */
  async deleteApiKey(apiKeyId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api-keys/${apiKeyId}`);
  }

  // ==================== Audiences ====================

  /** List all audiences. */
  async listAudiences(): Promise<ApiResponse<ResendListAudiencesResponse>> {
    return this.get<ResendListAudiencesResponse>("/audiences");
  }

  /** Get a single audience by ID. */
  async getAudience(audienceId: string): Promise<ApiResponse<ResendAudience>> {
    return this.get<ResendAudience>(`/audiences/${audienceId}`);
  }

  /** Create a new audience. */
  async createAudience(
    data: ResendCreateAudienceRequest
  ): Promise<ApiResponse<ResendAudience>> {
    return this.post<ResendAudience>("/audiences", data);
  }

  /** Delete an audience. */
  async deleteAudience(
    audienceId: string
  ): Promise<ApiResponse<{ object: string; id: string; deleted: boolean }>> {
    return this.delete<{ object: string; id: string; deleted: boolean }>(
      `/audiences/${audienceId}`
    );
  }

  // ==================== Contacts ====================

  /** List contacts in an audience. */
  async listContacts(
    audienceId: string
  ): Promise<ApiResponse<ResendListContactsResponse>> {
    return this.get<ResendListContactsResponse>(
      `/audiences/${audienceId}/contacts`
    );
  }

  /** Get a single contact by ID. */
  async getContact(
    audienceId: string,
    contactId: string
  ): Promise<ApiResponse<ResendContact>> {
    return this.get<ResendContact>(
      `/audiences/${audienceId}/contacts/${contactId}`
    );
  }

  /** Create a new contact in an audience. */
  async createContact(
    data: ResendCreateContactRequest
  ): Promise<ApiResponse<ResendCreateContactResponse>> {
    return this.post<ResendCreateContactResponse>(
      `/audiences/${data.audience_id}/contacts`,
      data
    );
  }

  /** Update a contact. */
  async updateContact(
    audienceId: string,
    contactId: string,
    data: Partial<Omit<ResendCreateContactRequest, "audience_id">>
  ): Promise<ApiResponse<{ id: string; object: string }>> {
    return this.patch<{ id: string; object: string }>(
      `/audiences/${audienceId}/contacts/${contactId}`,
      data
    );
  }

  /** Delete a contact. */
  async deleteContact(
    audienceId: string,
    contactId: string
  ): Promise<ApiResponse<{ object: string; id: string; deleted: boolean }>> {
    return this.delete<{ object: string; id: string; deleted: boolean }>(
      `/audiences/${audienceId}/contacts/${contactId}`
    );
  }

  // ==================== Connection Test ====================

  /** Verify credentials by listing domains. */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.listDomains();
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import { OAuthManager } from "../../core/oauth-manager.js";
import type { OAuthTokens } from "../../core/oauth-manager.js";
import type {
  HubSpotClientConfig,
  HubSpotContact,
  HubSpotCreateContactInput,
  HubSpotUpdateContactInput,
  HubSpotCompany,
  HubSpotCreateCompanyInput,
  HubSpotUpdateCompanyInput,
  HubSpotDeal,
  HubSpotCreateDealInput,
  HubSpotUpdateDealInput,
  HubSpotEmail,
  HubSpotCreateEmailInput,
  HubSpotList,
  HubSpotListsResponse,
  HubSpotListMembersResponse,
  HubSpotCreateListInput,
  HubSpotPaginatedResponse,
  HubSpotBatchResponse,
  HubSpotSearchRequest,
  HubSpotPaginationParams,
  HubSpotWebhookEvent,
} from "./types.js";

/**
 * HubSpot CRM API v3 client.
 *
 * Uses OAuth2 Bearer token authentication.
 * Supports automatic token refresh when clientId and clientSecret are provided.
 *
 * @see https://developers.hubspot.com/docs/api/overview
 */
export class HubSpotClient extends BaseIntegrationClient {
  private oauthManager?: OAuthManager;
  private tokens: OAuthTokens;

  constructor(private config: HubSpotClientConfig) {
    super({
      baseUrl: "https://api.hubapi.com",
      authType: "oauth2",
      credentials: {
        accessToken: config.accessToken,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 100, burstSize: 30 },
    });

    this.tokens = {
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
    };

    if (config.clientId && config.clientSecret) {
      this.oauthManager = new OAuthManager({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authorizationUrl: "https://app.hubspot.com/oauth/authorize",
        tokenUrl: "https://api.hubapi.com/oauth/v1/token",
        scopes: [
          "crm.objects.contacts.read",
          "crm.objects.contacts.write",
          "crm.objects.companies.read",
          "crm.objects.companies.write",
          "crm.objects.deals.read",
          "crm.objects.deals.write",
        ],
        redirectUri: "", // Set at authorization time
      });
    }
  }

  /**
   * Ensure the access token is still valid; refresh if needed.
   */
  async ensureValidToken(): Promise<void> {
    if (!this.oauthManager) return;
    if (!this.oauthManager.isTokenExpired(this.tokens)) return;

    if (!this.tokens.refreshToken) {
      throw new IntegrationError(
        "AUTH_ERROR",
        "HubSpot access token expired and no refresh token available"
      );
    }

    this.tokens = await this.oauthManager.refreshAccessToken(this.tokens.refreshToken);
    this.credentials.accessToken = this.tokens.accessToken;
  }

  /** Get the current tokens (e.g., to persist after refresh). */
  getTokens(): OAuthTokens {
    return { ...this.tokens };
  }

  // ==================== Contacts ====================

  /** Get all contacts (paginated). */
  async getContacts(
    params?: HubSpotPaginationParams
  ): Promise<HubSpotPaginatedResponse<HubSpotContact>> {
    await this.ensureValidToken();
    const queryParams = this.buildCrmParams(params);
    const response = await this.get<HubSpotPaginatedResponse<HubSpotContact>>(
      "/crm/v3/objects/contacts",
      queryParams
    );
    return response.data;
  }

  /** Get a single contact by ID. */
  async getContact(
    contactId: string,
    properties?: string[]
  ): Promise<HubSpotContact> {
    await this.ensureValidToken();
    const queryParams: Record<string, string> = {};
    if (properties?.length) queryParams.properties = properties.join(",");
    const response = await this.get<HubSpotContact>(
      `/crm/v3/objects/contacts/${contactId}`,
      queryParams
    );
    return response.data;
  }

  /** Get a contact by email address. */
  async getContactByEmail(
    email: string,
    properties?: string[]
  ): Promise<HubSpotContact | null> {
    await this.ensureValidToken();
    const queryParams: Record<string, string> = {
      idProperty: "email",
    };
    if (properties?.length) queryParams.properties = properties.join(",");
    try {
      const response = await this.get<HubSpotContact>(
        `/crm/v3/objects/contacts/${email}`,
        queryParams
      );
      return response.data;
    } catch (error) {
      if (error instanceof IntegrationError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /** Create a new contact. */
  async createContact(input: HubSpotCreateContactInput): Promise<HubSpotContact> {
    await this.ensureValidToken();
    const response = await this.post<HubSpotContact>(
      "/crm/v3/objects/contacts",
      input
    );
    return response.data;
  }

  /** Update an existing contact. */
  async updateContact(
    contactId: string,
    input: HubSpotUpdateContactInput
  ): Promise<HubSpotContact> {
    await this.ensureValidToken();
    const response = await this.patch<HubSpotContact>(
      `/crm/v3/objects/contacts/${contactId}`,
      input
    );
    return response.data;
  }

  /** Archive (soft-delete) a contact. */
  async archiveContact(contactId: string): Promise<void> {
    await this.ensureValidToken();
    await this.delete(`/crm/v3/objects/contacts/${contactId}`);
  }

  /** Search contacts using filters. */
  async searchContacts(
    searchRequest: HubSpotSearchRequest
  ): Promise<HubSpotPaginatedResponse<HubSpotContact>> {
    await this.ensureValidToken();
    const response = await this.post<HubSpotPaginatedResponse<HubSpotContact>>(
      "/crm/v3/objects/contacts/search",
      searchRequest
    );
    return response.data;
  }

  /** Batch create contacts. */
  async batchCreateContacts(
    inputs: HubSpotCreateContactInput[]
  ): Promise<HubSpotBatchResponse<HubSpotContact>> {
    await this.ensureValidToken();
    const response = await this.post<HubSpotBatchResponse<HubSpotContact>>(
      "/crm/v3/objects/contacts/batch/create",
      { inputs }
    );
    return response.data;
  }

  // ==================== Companies ====================

  /** Get all companies (paginated). */
  async getCompanies(
    params?: HubSpotPaginationParams
  ): Promise<HubSpotPaginatedResponse<HubSpotCompany>> {
    await this.ensureValidToken();
    const queryParams = this.buildCrmParams(params);
    const response = await this.get<HubSpotPaginatedResponse<HubSpotCompany>>(
      "/crm/v3/objects/companies",
      queryParams
    );
    return response.data;
  }

  /** Get a single company by ID. */
  async getCompany(
    companyId: string,
    properties?: string[]
  ): Promise<HubSpotCompany> {
    await this.ensureValidToken();
    const queryParams: Record<string, string> = {};
    if (properties?.length) queryParams.properties = properties.join(",");
    const response = await this.get<HubSpotCompany>(
      `/crm/v3/objects/companies/${companyId}`,
      queryParams
    );
    return response.data;
  }

  /** Create a new company. */
  async createCompany(input: HubSpotCreateCompanyInput): Promise<HubSpotCompany> {
    await this.ensureValidToken();
    const response = await this.post<HubSpotCompany>(
      "/crm/v3/objects/companies",
      input
    );
    return response.data;
  }

  /** Update an existing company. */
  async updateCompany(
    companyId: string,
    input: HubSpotUpdateCompanyInput
  ): Promise<HubSpotCompany> {
    await this.ensureValidToken();
    const response = await this.patch<HubSpotCompany>(
      `/crm/v3/objects/companies/${companyId}`,
      input
    );
    return response.data;
  }

  /** Archive (soft-delete) a company. */
  async archiveCompany(companyId: string): Promise<void> {
    await this.ensureValidToken();
    await this.delete(`/crm/v3/objects/companies/${companyId}`);
  }

  /** Search companies using filters. */
  async searchCompanies(
    searchRequest: HubSpotSearchRequest
  ): Promise<HubSpotPaginatedResponse<HubSpotCompany>> {
    await this.ensureValidToken();
    const response = await this.post<HubSpotPaginatedResponse<HubSpotCompany>>(
      "/crm/v3/objects/companies/search",
      searchRequest
    );
    return response.data;
  }

  // ==================== Deals ====================

  /** Get all deals (paginated). */
  async getDeals(
    params?: HubSpotPaginationParams
  ): Promise<HubSpotPaginatedResponse<HubSpotDeal>> {
    await this.ensureValidToken();
    const queryParams = this.buildCrmParams(params);
    const response = await this.get<HubSpotPaginatedResponse<HubSpotDeal>>(
      "/crm/v3/objects/deals",
      queryParams
    );
    return response.data;
  }

  /** Get a single deal by ID. */
  async getDeal(
    dealId: string,
    properties?: string[]
  ): Promise<HubSpotDeal> {
    await this.ensureValidToken();
    const queryParams: Record<string, string> = {};
    if (properties?.length) queryParams.properties = properties.join(",");
    const response = await this.get<HubSpotDeal>(
      `/crm/v3/objects/deals/${dealId}`,
      queryParams
    );
    return response.data;
  }

  /** Create a new deal. */
  async createDeal(input: HubSpotCreateDealInput): Promise<HubSpotDeal> {
    await this.ensureValidToken();
    const response = await this.post<HubSpotDeal>(
      "/crm/v3/objects/deals",
      input
    );
    return response.data;
  }

  /** Update an existing deal. */
  async updateDeal(
    dealId: string,
    input: HubSpotUpdateDealInput
  ): Promise<HubSpotDeal> {
    await this.ensureValidToken();
    const response = await this.patch<HubSpotDeal>(
      `/crm/v3/objects/deals/${dealId}`,
      input
    );
    return response.data;
  }

  /** Archive (soft-delete) a deal. */
  async archiveDeal(dealId: string): Promise<void> {
    await this.ensureValidToken();
    await this.delete(`/crm/v3/objects/deals/${dealId}`);
  }

  /** Search deals using filters. */
  async searchDeals(
    searchRequest: HubSpotSearchRequest
  ): Promise<HubSpotPaginatedResponse<HubSpotDeal>> {
    await this.ensureValidToken();
    const response = await this.post<HubSpotPaginatedResponse<HubSpotDeal>>(
      "/crm/v3/objects/deals/search",
      searchRequest
    );
    return response.data;
  }

  // ==================== Emails (Engagements) ====================

  /** Get all email engagements (paginated). */
  async getEmails(
    params?: HubSpotPaginationParams
  ): Promise<HubSpotPaginatedResponse<HubSpotEmail>> {
    await this.ensureValidToken();
    const queryParams = this.buildCrmParams(params);
    const response = await this.get<HubSpotPaginatedResponse<HubSpotEmail>>(
      "/crm/v3/objects/emails",
      queryParams
    );
    return response.data;
  }

  /** Get a single email engagement by ID. */
  async getEmail(
    emailId: string,
    properties?: string[]
  ): Promise<HubSpotEmail> {
    await this.ensureValidToken();
    const queryParams: Record<string, string> = {};
    if (properties?.length) queryParams.properties = properties.join(",");
    const response = await this.get<HubSpotEmail>(
      `/crm/v3/objects/emails/${emailId}`,
      queryParams
    );
    return response.data;
  }

  /** Create a new email engagement. */
  async createEmail(input: HubSpotCreateEmailInput): Promise<HubSpotEmail> {
    await this.ensureValidToken();
    const response = await this.post<HubSpotEmail>(
      "/crm/v3/objects/emails",
      input
    );
    return response.data;
  }

  // ==================== Lists (Legacy v1 API) ====================

  /** Get all contact lists. */
  async getLists(params?: { offset?: number; count?: number }): Promise<HubSpotListsResponse> {
    await this.ensureValidToken();
    const queryParams: Record<string, string> = {};
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.count !== undefined) queryParams.count = String(params.count);
    const response = await this.get<HubSpotListsResponse>(
      "/contacts/v1/lists",
      queryParams
    );
    return response.data;
  }

  /** Get a single contact list by ID. */
  async getList(listId: number): Promise<HubSpotList> {
    await this.ensureValidToken();
    const response = await this.get<HubSpotList>(`/contacts/v1/lists/${listId}`);
    return response.data;
  }

  /** Create a new contact list. */
  async createList(input: HubSpotCreateListInput): Promise<HubSpotList> {
    await this.ensureValidToken();
    const response = await this.post<HubSpotList>("/contacts/v1/lists", input);
    return response.data;
  }

  /** Delete a contact list. */
  async deleteList(listId: number): Promise<void> {
    await this.ensureValidToken();
    await this.delete(`/contacts/v1/lists/${listId}`);
  }

  /** Get contacts in a list. */
  async getListMembers(
    listId: number,
    params?: { vidOffset?: number; count?: number; properties?: string[] }
  ): Promise<HubSpotListMembersResponse> {
    await this.ensureValidToken();
    const queryParams: Record<string, string> = {};
    if (params?.vidOffset !== undefined) queryParams.vidOffset = String(params.vidOffset);
    if (params?.count !== undefined) queryParams.count = String(params.count);
    if (params?.properties?.length) {
      for (const prop of params.properties) {
        queryParams[`property`] = prop; // HubSpot uses repeated params
      }
    }
    const response = await this.get<HubSpotListMembersResponse>(
      `/contacts/v1/lists/${listId}/contacts/all`,
      queryParams
    );
    return response.data;
  }

  /** Add contacts to a static list. */
  async addContactsToList(
    listId: number,
    contactIds: number[]
  ): Promise<{ updated: number[]; discarded: number[] }> {
    await this.ensureValidToken();
    const response = await this.post<{ updated: number[]; discarded: number[] }>(
      `/contacts/v1/lists/${listId}/add`,
      { vids: contactIds }
    );
    return response.data;
  }

  /** Remove contacts from a static list. */
  async removeContactsFromList(
    listId: number,
    contactIds: number[]
  ): Promise<{ updated: number[]; discarded: number[] }> {
    await this.ensureValidToken();
    const response = await this.post<{ updated: number[]; discarded: number[] }>(
      `/contacts/v1/lists/${listId}/remove`,
      { vids: contactIds }
    );
    return response.data;
  }

  // ==================== Associations (v4) ====================

  /** Create an association between two CRM objects. */
  async createAssociation(
    fromObjectType: string,
    fromObjectId: string,
    toObjectType: string,
    toObjectId: string,
    associationTypeId: number
  ): Promise<void> {
    await this.ensureValidToken();
    await this.put(
      `/crm/v4/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}`,
      [
        {
          associationCategory: "HUBSPOT_DEFINED",
          associationTypeId,
        },
      ]
    );
  }

  /** Remove an association between two CRM objects. */
  async removeAssociation(
    fromObjectType: string,
    fromObjectId: string,
    toObjectType: string,
    toObjectId: string
  ): Promise<void> {
    await this.ensureValidToken();
    await this.delete(
      `/crm/v4/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}`
    );
  }

  // ==================== Connection Test ====================

  /** Test the connection by fetching account info. */
  async testConnection(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      await this.get("/account-info/v3/details");
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Helpers ====================

  private buildCrmParams(params?: HubSpotPaginationParams): Record<string, string> {
    const result: Record<string, string> = {};
    if (params?.limit !== undefined) result.limit = String(params.limit);
    if (params?.after) result.after = params.after;
    if (params?.properties?.length) result.properties = params.properties.join(",");
    if (params?.associations?.length) result.associations = params.associations.join(",");
    return result;
  }
}

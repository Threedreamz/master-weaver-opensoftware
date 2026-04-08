import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  OrgamaxCustomer,
  OrgamaxInvoice,
  OrgamaxOffer,
  OrgamaxArticle,
  OrgamaxListParams,
  OrgamaxListResponse,
  OrgamaxSingleResponse,
  OrgamaxClientConfig,
} from "./types.js";

const ORGAMAX_BASE_URL = "https://api.orgamax.de/v1";

/**
 * orgaMAX API client.
 *
 * German business software for invoicing and order management with
 * customers, invoices, offers, and articles.
 *
 * Uses API key authentication via Authorization header.
 */
export class OrgamaxClient extends BaseIntegrationClient {
  constructor(config: OrgamaxClientConfig) {
    super({
      baseUrl: ORGAMAX_BASE_URL,
      authType: "api_key",
      credentials: { apiKey: config.apiKey },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
      defaultHeaders: {
        Accept: "application/json",
      },
    });
  }

  private buildListParams(params?: OrgamaxListParams): Record<string, string> {
    const result: Record<string, string> = {};
    if (params?.page != null) result.page = String(params.page);
    if (params?.pageSize != null) result.pageSize = String(params.pageSize);
    if (params?.sortBy) result.sortBy = params.sortBy;
    if (params?.sortOrder) result.sortOrder = params.sortOrder;
    if (params?.search) result.search = params.search;
    if (params?.status) result.status = params.status;
    if (params?.fromDate) result.fromDate = params.fromDate;
    if (params?.toDate) result.toDate = params.toDate;
    return result;
  }

  // ==================== Customers ====================

  /** List customers. */
  async listCustomers(
    params?: OrgamaxListParams
  ): Promise<ApiResponse<OrgamaxListResponse<OrgamaxCustomer>>> {
    return this.get<OrgamaxListResponse<OrgamaxCustomer>>(
      "/customers",
      this.buildListParams(params)
    );
  }

  /** Get a customer by ID. */
  async getCustomer(
    customerId: number
  ): Promise<ApiResponse<OrgamaxSingleResponse<OrgamaxCustomer>>> {
    return this.get<OrgamaxSingleResponse<OrgamaxCustomer>>(
      `/customers/${customerId}`
    );
  }

  /** Create a customer. */
  async createCustomer(
    customer: OrgamaxCustomer
  ): Promise<ApiResponse<OrgamaxSingleResponse<OrgamaxCustomer>>> {
    return this.post<OrgamaxSingleResponse<OrgamaxCustomer>>(
      "/customers",
      customer
    );
  }

  /** Update a customer. */
  async updateCustomer(
    customerId: number,
    customer: Partial<OrgamaxCustomer>
  ): Promise<ApiResponse<OrgamaxSingleResponse<OrgamaxCustomer>>> {
    return this.put<OrgamaxSingleResponse<OrgamaxCustomer>>(
      `/customers/${customerId}`,
      customer
    );
  }

  /** Delete a customer. */
  async deleteCustomer(customerId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/customers/${customerId}`);
  }

  // ==================== Invoices ====================

  /** List invoices. */
  async listInvoices(
    params?: OrgamaxListParams
  ): Promise<ApiResponse<OrgamaxListResponse<OrgamaxInvoice>>> {
    return this.get<OrgamaxListResponse<OrgamaxInvoice>>(
      "/invoices",
      this.buildListParams(params)
    );
  }

  /** Get an invoice by ID. */
  async getInvoice(
    invoiceId: number
  ): Promise<ApiResponse<OrgamaxSingleResponse<OrgamaxInvoice>>> {
    return this.get<OrgamaxSingleResponse<OrgamaxInvoice>>(
      `/invoices/${invoiceId}`
    );
  }

  /** Create an invoice. */
  async createInvoice(
    invoice: OrgamaxInvoice
  ): Promise<ApiResponse<OrgamaxSingleResponse<OrgamaxInvoice>>> {
    return this.post<OrgamaxSingleResponse<OrgamaxInvoice>>(
      "/invoices",
      invoice
    );
  }

  /** Update an invoice. */
  async updateInvoice(
    invoiceId: number,
    invoice: Partial<OrgamaxInvoice>
  ): Promise<ApiResponse<OrgamaxSingleResponse<OrgamaxInvoice>>> {
    return this.put<OrgamaxSingleResponse<OrgamaxInvoice>>(
      `/invoices/${invoiceId}`,
      invoice
    );
  }

  /** Delete an invoice. */
  async deleteInvoice(invoiceId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/invoices/${invoiceId}`);
  }

  /** Finalize an invoice. */
  async finalizeInvoice(
    invoiceId: number
  ): Promise<ApiResponse<OrgamaxSingleResponse<OrgamaxInvoice>>> {
    return this.post<OrgamaxSingleResponse<OrgamaxInvoice>>(
      `/invoices/${invoiceId}/finalize`
    );
  }

  /** Send an invoice by email. */
  async sendInvoice(
    invoiceId: number,
    email: string,
    subject?: string,
    message?: string
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/invoices/${invoiceId}/send`, {
      email,
      subject,
      message,
    });
  }

  /** Cancel an invoice. */
  async cancelInvoice(
    invoiceId: number
  ): Promise<ApiResponse<OrgamaxSingleResponse<OrgamaxInvoice>>> {
    return this.post<OrgamaxSingleResponse<OrgamaxInvoice>>(
      `/invoices/${invoiceId}/cancel`
    );
  }

  /** Download invoice PDF. */
  async getInvoicePdf(
    invoiceId: number
  ): Promise<ApiResponse<{ url: string; fileName: string }>> {
    return this.get<{ url: string; fileName: string }>(
      `/invoices/${invoiceId}/pdf`
    );
  }

  // ==================== Offers ====================

  /** List offers. */
  async listOffers(
    params?: OrgamaxListParams
  ): Promise<ApiResponse<OrgamaxListResponse<OrgamaxOffer>>> {
    return this.get<OrgamaxListResponse<OrgamaxOffer>>(
      "/offers",
      this.buildListParams(params)
    );
  }

  /** Get an offer by ID. */
  async getOffer(
    offerId: number
  ): Promise<ApiResponse<OrgamaxSingleResponse<OrgamaxOffer>>> {
    return this.get<OrgamaxSingleResponse<OrgamaxOffer>>(
      `/offers/${offerId}`
    );
  }

  /** Create an offer. */
  async createOffer(
    offer: OrgamaxOffer
  ): Promise<ApiResponse<OrgamaxSingleResponse<OrgamaxOffer>>> {
    return this.post<OrgamaxSingleResponse<OrgamaxOffer>>(
      "/offers",
      offer
    );
  }

  /** Update an offer. */
  async updateOffer(
    offerId: number,
    offer: Partial<OrgamaxOffer>
  ): Promise<ApiResponse<OrgamaxSingleResponse<OrgamaxOffer>>> {
    return this.put<OrgamaxSingleResponse<OrgamaxOffer>>(
      `/offers/${offerId}`,
      offer
    );
  }

  /** Delete an offer. */
  async deleteOffer(offerId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/offers/${offerId}`);
  }

  /** Convert an offer to an invoice. */
  async convertOfferToInvoice(
    offerId: number
  ): Promise<ApiResponse<OrgamaxSingleResponse<OrgamaxInvoice>>> {
    return this.post<OrgamaxSingleResponse<OrgamaxInvoice>>(
      `/offers/${offerId}/convert-to-invoice`
    );
  }

  /** Send an offer by email. */
  async sendOffer(
    offerId: number,
    email: string,
    subject?: string,
    message?: string
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/offers/${offerId}/send`, {
      email,
      subject,
      message,
    });
  }

  // ==================== Articles ====================

  /** List articles. */
  async listArticles(
    params?: OrgamaxListParams
  ): Promise<ApiResponse<OrgamaxListResponse<OrgamaxArticle>>> {
    return this.get<OrgamaxListResponse<OrgamaxArticle>>(
      "/articles",
      this.buildListParams(params)
    );
  }

  /** Get an article by ID. */
  async getArticle(
    articleId: number
  ): Promise<ApiResponse<OrgamaxSingleResponse<OrgamaxArticle>>> {
    return this.get<OrgamaxSingleResponse<OrgamaxArticle>>(
      `/articles/${articleId}`
    );
  }

  /** Create an article. */
  async createArticle(
    article: OrgamaxArticle
  ): Promise<ApiResponse<OrgamaxSingleResponse<OrgamaxArticle>>> {
    return this.post<OrgamaxSingleResponse<OrgamaxArticle>>(
      "/articles",
      article
    );
  }

  /** Update an article. */
  async updateArticle(
    articleId: number,
    article: Partial<OrgamaxArticle>
  ): Promise<ApiResponse<OrgamaxSingleResponse<OrgamaxArticle>>> {
    return this.put<OrgamaxSingleResponse<OrgamaxArticle>>(
      `/articles/${articleId}`,
      article
    );
  }

  /** Delete an article. */
  async deleteArticle(articleId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/articles/${articleId}`);
  }
}

import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  QontoClientConfig,
  QontoOrganization,
  QontoOrganizationResponse,
  QontoTransaction,
  QontoTransactionsResponse,
  QontoTransactionsParams,
  QontoAttachment,
  QontoAttachmentResponse,
  QontoLabel,
  QontoLabelsResponse,
  QontoMember,
  QontoMembersResponse,
  QontoMembersParams,
  QontoPaginationMeta,
} from "./types.js";

/**
 * Qonto API v2 client.
 *
 * Supports: organization info, transactions, attachments, labels, members.
 * Auth: API key via Authorization header (organization-slug:secret-key).
 * Rate limit: 100 RPM.
 */
export class QontoClient extends BaseIntegrationClient {
  private organizationSlug: string;

  constructor(config: QontoClientConfig) {
    super({
      baseUrl: "https://thirdparty.qonto.com/v2",
      authType: "api_key",
      credentials: {
        apiKey: `${config.organizationSlug}:${config.secretKey}`,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 100 },
    });

    this.organizationSlug = config.organizationSlug;
  }

  // ==================== Organization ====================

  /** Get the organization details including bank accounts. */
  async getOrganization(): Promise<ApiResponse<QontoOrganizationResponse>> {
    return this.get<QontoOrganizationResponse>(
      `/organizations/${this.organizationSlug}`
    );
  }

  // ==================== Transactions ====================

  /**
   * List transactions for a bank account with optional filters.
   * Supports pagination, date range, status, and operation type filters.
   */
  async listTransactions(
    params: QontoTransactionsParams
  ): Promise<ApiResponse<QontoTransactionsResponse>> {
    const queryParams: Record<string, string> = {
      slug: params.slug,
    };
    if (params.status?.length) queryParams["status[]"] = params.status.join(",");
    if (params.updated_at_from) queryParams.updated_at_from = params.updated_at_from;
    if (params.updated_at_to) queryParams.updated_at_to = params.updated_at_to;
    if (params.settled_at_from) queryParams.settled_at_from = params.settled_at_from;
    if (params.settled_at_to) queryParams.settled_at_to = params.settled_at_to;
    if (params.side) queryParams.side = params.side;
    if (params.operation_type?.length) queryParams["operation_type[]"] = params.operation_type.join(",");
    if (params.current_page != null) queryParams.current_page = String(params.current_page);
    if (params.per_page != null) queryParams.per_page = String(params.per_page);
    if (params.sort_by) queryParams.sort_by = params.sort_by;

    return this.get<QontoTransactionsResponse>("/transactions", queryParams);
  }

  /**
   * Fetch all transactions across all pages for a bank account.
   */
  async getAllTransactions(
    slug: string,
    settledAtFrom?: string,
    settledAtTo?: string
  ): Promise<QontoTransaction[]> {
    const allTransactions: QontoTransaction[] = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.listTransactions({
        slug,
        settled_at_from: settledAtFrom,
        settled_at_to: settledAtTo,
        current_page: currentPage,
        per_page: 100,
      });

      allTransactions.push(...response.data.transactions);

      const meta = response.data.meta;
      hasMore = meta.next_page !== null;
      currentPage++;
    }

    return allTransactions;
  }

  // ==================== Attachments ====================

  /** Get an attachment by ID. */
  async getAttachment(attachmentId: string): Promise<ApiResponse<QontoAttachmentResponse>> {
    return this.get<QontoAttachmentResponse>(`/attachments/${attachmentId}`);
  }

  // ==================== Labels ====================

  /** List all labels for the organization. */
  async listLabels(): Promise<ApiResponse<QontoLabelsResponse>> {
    return this.get<QontoLabelsResponse>("/labels");
  }

  // ==================== Members ====================

  /** List all members of the organization. */
  async listMembers(
    params?: QontoMembersParams
  ): Promise<ApiResponse<QontoMembersResponse>> {
    const queryParams: Record<string, string> = {};
    if (params?.current_page != null) queryParams.current_page = String(params.current_page);
    if (params?.per_page != null) queryParams.per_page = String(params.per_page);

    return this.get<QontoMembersResponse>("/memberships", queryParams);
  }

  /**
   * Fetch all members across all pages.
   */
  async getAllMembers(): Promise<QontoMember[]> {
    const allMembers: QontoMember[] = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.listMembers({
        current_page: currentPage,
        per_page: 100,
      });

      allMembers.push(...response.data.members);

      const meta = response.data.meta;
      hasMore = meta.next_page !== null;
      currentPage++;
    }

    return allMembers;
  }

  // ==================== Connection Test ====================

  /** Verify credentials by fetching organization info. */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.getOrganization();
      return response.status === 200 && !!response.data.organization?.slug;
    } catch {
      return false;
    }
  }
}

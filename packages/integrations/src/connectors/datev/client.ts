import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  DatevClient,
  DatevClientConfig,
  DatevAccountingEntry,
  DatevAccountingEntriesBatch,
  DatevDocument,
  DatevDocumentUpload,
  DatevAccount,
  DatevCostCenter,
  DatevAddresseeMasterData,
  DatevPaginationParams,
  DatevListResponse,
} from "./types.js";

const DATEV_BASE_URL = "https://accounting-procession.api.datev.de";
const DATEV_SANDBOX_URL = "https://sandbox-api.datev.de";

/**
 * DATEV Connect Online API client.
 *
 * Supports German accounting workflows: master data, Buchungssaetze,
 * documents, and addressee (debtor/creditor) management.
 *
 * Requires OAuth2 authentication via DATEV Identity Provider.
 */
export class DatevConnectClient extends BaseIntegrationClient {
  private consultantNumber: number;
  private clientNumber: number;

  constructor(config: DatevClientConfig) {
    const baseUrl =
      config.environment === "sandbox" ? DATEV_SANDBOX_URL : DATEV_BASE_URL;

    super({
      baseUrl,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
      defaultHeaders: {
        "X-DATEV-Client-Id": "opensoftware",
      },
    });

    this.consultantNumber = config.consultantNumber;
    this.clientNumber = config.clientNumber;
  }

  // ==================== Clients (Mandanten) ====================

  /** List all accessible DATEV clients (Mandanten). */
  async listClients(): Promise<ApiResponse<DatevListResponse<DatevClient>>> {
    return this.get<DatevListResponse<DatevClient>>("/platform/v2/clients");
  }

  /** Get details for a specific client. */
  async getClient(clientId: string): Promise<ApiResponse<DatevClient>> {
    return this.get<DatevClient>(`/platform/v2/clients/${clientId}`);
  }

  // ==================== Accounting Entries (Buchungssaetze) ====================

  /** List accounting entries for the current client with optional filters. */
  async listAccountingEntries(
    fiscalYear: number,
    pagination?: DatevPaginationParams
  ): Promise<ApiResponse<DatevListResponse<DatevAccountingEntry>>> {
    const params: Record<string, string> = {};
    if (pagination?.skip != null) params["$skip"] = String(pagination.skip);
    if (pagination?.top != null) params["$top"] = String(pagination.top);
    if (pagination?.filter) params["$filter"] = pagination.filter;
    if (pagination?.orderby) params["$orderby"] = pagination.orderby;

    return this.get<DatevListResponse<DatevAccountingEntry>>(
      `/datev/api/accounting/v1/clients/${this.consultantNumber}-${this.clientNumber}/fiscal-years/${fiscalYear}/accounting-entries`,
      params
    );
  }

  /** Upload a batch of accounting entries. */
  async uploadAccountingEntries(
    batch: DatevAccountingEntriesBatch
  ): Promise<ApiResponse<{ importId: string }>> {
    return this.post<{ importId: string }>(
      `/datev/api/accounting/v1/clients/${this.consultantNumber}-${this.clientNumber}/accounting-entries`,
      batch
    );
  }

  /** Get the status of an accounting entry import. */
  async getImportStatus(
    importId: string
  ): Promise<ApiResponse<{ status: string; errors?: string[] }>> {
    return this.get<{ status: string; errors?: string[] }>(
      `/datev/api/accounting/v1/clients/${this.consultantNumber}-${this.clientNumber}/imports/${importId}`
    );
  }

  // ==================== Documents ====================

  /** List documents for the current client. */
  async listDocuments(
    pagination?: DatevPaginationParams
  ): Promise<ApiResponse<DatevListResponse<DatevDocument>>> {
    const params: Record<string, string> = {};
    if (pagination?.skip != null) params["$skip"] = String(pagination.skip);
    if (pagination?.top != null) params["$top"] = String(pagination.top);
    if (pagination?.filter) params["$filter"] = pagination.filter;

    return this.get<DatevListResponse<DatevDocument>>(
      `/datev/api/document-management/v1/clients/${this.consultantNumber}-${this.clientNumber}/documents`,
      params
    );
  }

  /** Get a single document by ID. */
  async getDocument(documentId: string): Promise<ApiResponse<DatevDocument>> {
    return this.get<DatevDocument>(
      `/datev/api/document-management/v1/clients/${this.consultantNumber}-${this.clientNumber}/documents/${documentId}`
    );
  }

  /** Upload a document. */
  async uploadDocument(
    upload: DatevDocumentUpload
  ): Promise<ApiResponse<DatevDocument>> {
    return this.post<DatevDocument>(
      `/datev/api/document-management/v1/clients/${this.consultantNumber}-${this.clientNumber}/documents`,
      upload
    );
  }

  /** Delete a document by ID. */
  async deleteDocument(documentId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(
      `/datev/api/document-management/v1/clients/${this.consultantNumber}-${this.clientNumber}/documents/${documentId}`
    );
  }

  // ==================== Master Data ====================

  /** List accounts (Kontenrahmen) for the current client. */
  async listAccounts(
    fiscalYear: number,
    pagination?: DatevPaginationParams
  ): Promise<ApiResponse<DatevListResponse<DatevAccount>>> {
    const params: Record<string, string> = {};
    if (pagination?.skip != null) params["$skip"] = String(pagination.skip);
    if (pagination?.top != null) params["$top"] = String(pagination.top);

    return this.get<DatevListResponse<DatevAccount>>(
      `/datev/api/master-data/v1/clients/${this.consultantNumber}-${this.clientNumber}/fiscal-years/${fiscalYear}/accounts`,
      params
    );
  }

  /** List cost centers (Kostenstellen). */
  async listCostCenters(
    fiscalYear: number
  ): Promise<ApiResponse<DatevListResponse<DatevCostCenter>>> {
    return this.get<DatevListResponse<DatevCostCenter>>(
      `/datev/api/master-data/v1/clients/${this.consultantNumber}-${this.clientNumber}/fiscal-years/${fiscalYear}/cost-centers`
    );
  }

  // ==================== Addressee Master Data ====================

  /** List addressees (debtors and creditors). */
  async listAddressees(
    pagination?: DatevPaginationParams
  ): Promise<ApiResponse<DatevListResponse<DatevAddresseeMasterData>>> {
    const params: Record<string, string> = {};
    if (pagination?.skip != null) params["$skip"] = String(pagination.skip);
    if (pagination?.top != null) params["$top"] = String(pagination.top);
    if (pagination?.filter) params["$filter"] = pagination.filter;

    return this.get<DatevListResponse<DatevAddresseeMasterData>>(
      `/datev/api/master-data/v1/clients/${this.consultantNumber}-${this.clientNumber}/addressees`,
      params
    );
  }

  /** Get a single addressee by ID. */
  async getAddressee(
    addresseeId: string
  ): Promise<ApiResponse<DatevAddresseeMasterData>> {
    return this.get<DatevAddresseeMasterData>(
      `/datev/api/master-data/v1/clients/${this.consultantNumber}-${this.clientNumber}/addressees/${addresseeId}`
    );
  }

  /** Create a new addressee (debtor or creditor). */
  async createAddressee(
    data: DatevAddresseeMasterData
  ): Promise<ApiResponse<DatevAddresseeMasterData>> {
    return this.post<DatevAddresseeMasterData>(
      `/datev/api/master-data/v1/clients/${this.consultantNumber}-${this.clientNumber}/addressees`,
      data
    );
  }

  /** Update an existing addressee. */
  async updateAddressee(
    addresseeId: string,
    data: Partial<DatevAddresseeMasterData>
  ): Promise<ApiResponse<DatevAddresseeMasterData>> {
    return this.put<DatevAddresseeMasterData>(
      `/datev/api/master-data/v1/clients/${this.consultantNumber}-${this.clientNumber}/addressees/${addresseeId}`,
      data
    );
  }
}

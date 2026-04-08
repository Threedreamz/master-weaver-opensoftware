import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  GdprRegisterClientConfig,
  GdprProcessingActivity,
  GdprCreateProcessingParams,
  GdprListProcessingParams,
  GdprListResponse,
  GdprDpia,
  GdprCreateDpiaParams,
  GdprDpiaRisk,
  GdprMitigationMeasure,
} from "./types.js";

const GDPR_REGISTER_BASE_URL = "https://api.gdpr-register.eu/v1";

/**
 * GDPR Register API client for managing processing activities and DPIAs.
 *
 * Provides CRUD operations for Records of Processing Activities (Art. 30 GDPR)
 * and Data Protection Impact Assessments (Art. 35 GDPR).
 *
 * API key authentication required.
 */
export class GdprRegisterClient extends BaseIntegrationClient {
  private organizationId?: string;

  constructor(config: GdprRegisterClientConfig) {
    super({
      baseUrl: config.baseUrl ?? GDPR_REGISTER_BASE_URL,
      authType: "api_key",
      credentials: {
        apiKey: config.apiKey,
        headerName: "X-API-Key",
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
    });

    this.organizationId = config.organizationId;
  }

  // ==================== Processing Activities (Art. 30) ====================

  /**
   * List all processing activities with optional filters.
   */
  async listProcessingActivities(
    params: GdprListProcessingParams = {}
  ): Promise<ApiResponse<GdprListResponse<GdprProcessingActivity>>> {
    const queryParams: Record<string, string> = {};

    if (this.organizationId) {
      queryParams.organizationId = this.organizationId;
    }
    if (params.status) {
      queryParams.status = params.status;
    }
    if (params.department) {
      queryParams.department = params.department;
    }
    if (params.legalBasis) {
      queryParams.legalBasis = params.legalBasis;
    }
    if (params.search) {
      queryParams.search = params.search;
    }
    if (params.page != null) {
      queryParams.page = String(params.page);
    }
    if (params.pageSize != null) {
      queryParams.pageSize = String(params.pageSize);
    }

    return this.get<GdprListResponse<GdprProcessingActivity>>(
      "/processing-activities",
      queryParams
    );
  }

  /**
   * Get a single processing activity by ID.
   */
  async getProcessingActivity(
    activityId: string
  ): Promise<ApiResponse<GdprProcessingActivity>> {
    return this.get<GdprProcessingActivity>(
      `/processing-activities/${activityId}`
    );
  }

  /**
   * Create a new processing activity record.
   */
  async createProcessingActivity(
    params: GdprCreateProcessingParams
  ): Promise<ApiResponse<GdprProcessingActivity>> {
    const body = {
      ...params,
      organizationId: this.organizationId,
      specialCategoryData: params.specialCategoryData ?? false,
      thirdCountryTransfer: params.thirdCountryTransfer ?? false,
      recipients: params.recipients ?? [],
      securityMeasures: params.securityMeasures ?? [],
      processors: params.processors ?? [],
    };

    return this.post<GdprProcessingActivity>("/processing-activities", body);
  }

  /**
   * Update an existing processing activity.
   */
  async updateProcessingActivity(
    activityId: string,
    params: Partial<GdprCreateProcessingParams>
  ): Promise<ApiResponse<GdprProcessingActivity>> {
    return this.put<GdprProcessingActivity>(
      `/processing-activities/${activityId}`,
      params
    );
  }

  /**
   * Archive a processing activity (soft delete).
   */
  async archiveProcessingActivity(
    activityId: string
  ): Promise<ApiResponse<GdprProcessingActivity>> {
    return this.patch<GdprProcessingActivity>(
      `/processing-activities/${activityId}`,
      { status: "archived" }
    );
  }

  /**
   * Delete a processing activity permanently.
   */
  async deleteProcessingActivity(
    activityId: string
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(`/processing-activities/${activityId}`);
  }

  // ==================== DPIAs (Art. 35) ====================

  /**
   * List all Data Protection Impact Assessments.
   */
  async listDpias(
    params: { status?: string; page?: number; pageSize?: number } = {}
  ): Promise<ApiResponse<GdprListResponse<GdprDpia>>> {
    const queryParams: Record<string, string> = {};

    if (this.organizationId) {
      queryParams.organizationId = this.organizationId;
    }
    if (params.status) {
      queryParams.status = params.status;
    }
    if (params.page != null) {
      queryParams.page = String(params.page);
    }
    if (params.pageSize != null) {
      queryParams.pageSize = String(params.pageSize);
    }

    return this.get<GdprListResponse<GdprDpia>>("/dpias", queryParams);
  }

  /**
   * Get a single DPIA by ID.
   */
  async getDpia(dpiaId: string): Promise<ApiResponse<GdprDpia>> {
    return this.get<GdprDpia>(`/dpias/${dpiaId}`);
  }

  /**
   * Create a new DPIA.
   */
  async createDpia(
    params: GdprCreateDpiaParams
  ): Promise<ApiResponse<GdprDpia>> {
    const body = {
      ...params,
      organizationId: this.organizationId,
      risks: params.risks ?? [],
      mitigationMeasures: params.mitigationMeasures ?? [],
    };

    return this.post<GdprDpia>("/dpias", body);
  }

  /**
   * Update an existing DPIA.
   */
  async updateDpia(
    dpiaId: string,
    params: Partial<GdprCreateDpiaParams>
  ): Promise<ApiResponse<GdprDpia>> {
    return this.put<GdprDpia>(`/dpias/${dpiaId}`, params);
  }

  /**
   * Add a risk to an existing DPIA.
   */
  async addDpiaRisk(
    dpiaId: string,
    risk: GdprDpiaRisk
  ): Promise<ApiResponse<GdprDpia>> {
    return this.post<GdprDpia>(`/dpias/${dpiaId}/risks`, risk);
  }

  /**
   * Add a mitigation measure to an existing DPIA.
   */
  async addDpiaMitigationMeasure(
    dpiaId: string,
    measure: GdprMitigationMeasure
  ): Promise<ApiResponse<GdprDpia>> {
    return this.post<GdprDpia>(`/dpias/${dpiaId}/mitigation-measures`, measure);
  }

  /**
   * Submit a DPIA for approval.
   */
  async submitDpiaForApproval(
    dpiaId: string
  ): Promise<ApiResponse<GdprDpia>> {
    return this.post<GdprDpia>(`/dpias/${dpiaId}/submit`, {});
  }

  /**
   * Approve a completed DPIA.
   */
  async approveDpia(
    dpiaId: string,
    approvedBy: string
  ): Promise<ApiResponse<GdprDpia>> {
    return this.post<GdprDpia>(`/dpias/${dpiaId}/approve`, { approvedBy });
  }

  /**
   * Delete a DPIA.
   */
  async deleteDpia(dpiaId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/dpias/${dpiaId}`);
  }

  // ==================== Utilities ====================

  /**
   * Test connectivity and API key validity.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.get("/health");
      return true;
    } catch {
      return false;
    }
  }
}

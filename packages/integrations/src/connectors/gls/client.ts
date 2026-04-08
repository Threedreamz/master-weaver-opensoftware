import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  GlsClientConfig,
  GlsShipmentRequest,
  GlsShipmentResponse,
  GlsTrackingResponse,
  GlsLabelFormat,
  GlsLabelSize,
  GlsParcelShop,
  GlsParcelShopSearchRequest,
} from "./types.js";

const GLS_PRODUCTION_URL = "https://api.gls-group.eu/public/v1";
const GLS_SANDBOX_URL = "https://api-sandbox.gls-group.eu/public/v1";

const GLS_TRACKING_URL = "https://api.gls-group.eu/public/v1/tracking";

/**
 * GLS Shipping API client.
 *
 * Supports:
 * - Shipment creation with label generation
 * - Parcel tracking
 * - Label retrieval and reprinting
 * - ParcelShop location search
 *
 * Authentication: Basic auth (username + password) with Contact ID
 * sent as a header or request parameter.
 */
export class GlsClient extends BaseIntegrationClient {
  private readonly contactId: string;

  constructor(config: GlsClientConfig) {
    const baseUrl = config.sandbox ? GLS_SANDBOX_URL : GLS_PRODUCTION_URL;

    super({
      baseUrl,
      authType: "basic_auth",
      credentials: {
        username: config.username,
        password: config.password,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 120 },
      defaultHeaders: {
        "X-GLS-Contact-ID": config.contactId,
      },
    });

    this.contactId = config.contactId;
  }

  // ==================== Shipment Creation ====================

  /**
   * Create a shipment and generate labels.
   * Each parcel receives its own tracking number and label.
   */
  async createShipment(
    shipment: GlsShipmentRequest,
    options?: { labelFormat?: GlsLabelFormat; labelSize?: GlsLabelSize }
  ): Promise<ApiResponse<GlsShipmentResponse>> {
    const params: Record<string, string> = {};
    if (options?.labelFormat) params.labelFormat = options.labelFormat;
    if (options?.labelSize) params.labelSize = options.labelSize;

    return this.request<GlsShipmentResponse>({
      method: "POST",
      path: "/shipments",
      body: {
        ...shipment,
        contactId: this.contactId,
      },
      params: Object.keys(params).length > 0 ? params : undefined,
    });
  }

  /**
   * Create multiple shipments in a batch (max 100).
   */
  async createShipmentBatch(
    shipments: GlsShipmentRequest[],
    options?: { labelFormat?: GlsLabelFormat; labelSize?: GlsLabelSize }
  ): Promise<ApiResponse<GlsShipmentResponse[]>> {
    const params: Record<string, string> = {};
    if (options?.labelFormat) params.labelFormat = options.labelFormat;
    if (options?.labelSize) params.labelSize = options.labelSize;

    return this.request<GlsShipmentResponse[]>({
      method: "POST",
      path: "/shipments/batch",
      body: {
        shipments: shipments.map((s) => ({
          ...s,
          contactId: this.contactId,
        })),
      },
      params: Object.keys(params).length > 0 ? params : undefined,
    });
  }

  // ==================== Label Retrieval ====================

  /**
   * Retrieve or reprint the label for a parcel.
   */
  async getLabel(
    parcelNumber: string,
    options?: { format?: GlsLabelFormat; size?: GlsLabelSize }
  ): Promise<ApiResponse<{ data: string; format: GlsLabelFormat }>> {
    const params: Record<string, string> = {};
    if (options?.format) params.labelFormat = options.format;
    if (options?.size) params.labelSize = options.size;

    return this.get<{ data: string; format: GlsLabelFormat }>(
      `/shipments/labels/${parcelNumber}`,
      Object.keys(params).length > 0 ? params : undefined
    );
  }

  // ==================== Shipment Management ====================

  /**
   * Cancel a shipment that has not yet been collected.
   */
  async cancelShipment(shipmentId: string): Promise<ApiResponse<{ status: string }>> {
    return this.delete<{ status: string }>(`/shipments/${shipmentId}`);
  }

  /**
   * Get details for an existing shipment.
   */
  async getShipment(shipmentId: string): Promise<ApiResponse<GlsShipmentResponse>> {
    return this.get<GlsShipmentResponse>(`/shipments/${shipmentId}`);
  }

  /**
   * Close out / finalize shipments for end-of-day manifest.
   */
  async endOfDay(): Promise<ApiResponse<{ manifestId: string; parcelCount: number }>> {
    return this.post<{ manifestId: string; parcelCount: number }>(
      "/shipments/endofday",
      { contactId: this.contactId }
    );
  }

  // ==================== Tracking ====================

  /**
   * Track a parcel by its GLS parcel number.
   */
  async trackParcel(parcelNumber: string): Promise<ApiResponse<GlsTrackingResponse>> {
    return this.get<GlsTrackingResponse>(
      `/tracking/parcels/${parcelNumber}`
    );
  }

  /**
   * Track multiple parcels at once.
   */
  async trackParcels(parcelNumbers: string[]): Promise<ApiResponse<GlsTrackingResponse[]>> {
    return this.get<GlsTrackingResponse[]>(
      "/tracking/parcels",
      { parcelNumber: parcelNumbers.join(",") }
    );
  }

  /**
   * Track a parcel by customer reference.
   */
  async trackByReference(reference: string): Promise<ApiResponse<GlsTrackingResponse[]>> {
    return this.get<GlsTrackingResponse[]>(
      "/tracking/references",
      { reference, contactId: this.contactId }
    );
  }

  // ==================== ParcelShop Search ====================

  /**
   * Find GLS ParcelShop locations near a given address or coordinates.
   */
  async findParcelShops(
    searchRequest: GlsParcelShopSearchRequest
  ): Promise<ApiResponse<GlsParcelShop[]>> {
    const params: Record<string, string> = {
      country: searchRequest.country,
    };
    if (searchRequest.zipCode) params.zipCode = searchRequest.zipCode;
    if (searchRequest.city) params.city = searchRequest.city;
    if (searchRequest.latitude != null) params.latitude = String(searchRequest.latitude);
    if (searchRequest.longitude != null) params.longitude = String(searchRequest.longitude);
    if (searchRequest.limit != null) params.limit = String(searchRequest.limit);
    if (searchRequest.maxDistance != null) params.maxDistance = String(searchRequest.maxDistance);

    return this.get<GlsParcelShop[]>("/parcelshops", params);
  }

  /**
   * Get details for a specific ParcelShop.
   */
  async getParcelShop(parcelShopId: string): Promise<ApiResponse<GlsParcelShop>> {
    return this.get<GlsParcelShop>(`/parcelshops/${parcelShopId}`);
  }
}

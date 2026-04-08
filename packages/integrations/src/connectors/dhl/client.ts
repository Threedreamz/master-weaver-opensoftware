import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  DhlClientConfig,
  DhlShipmentRequest,
  DhlShipmentResponse,
  DhlTrackingResponse,
  DhlLabelFormat,
  DhlLabelSize,
  DhlManifestRequest,
  DhlManifestResponse,
} from "./types.js";

const DHL_PRODUCTION_URL = "https://api-eu.dhl.com";
const DHL_SANDBOX_URL = "https://api-sandbox.dhl.com";

/**
 * DHL Geschaeftskundenversand (Business Shipping) API client.
 *
 * Supports:
 * - Shipment creation with label generation (Parcel DE API v2)
 * - Tracking (DHL Shipment Tracking API v1)
 * - Label retrieval and reprinting
 * - Manifest / close-out (Tagesabschluss)
 *
 * Authentication: API key in `dhl-api-key` header + Basic auth for
 * Geschaeftskundenversand endpoints using account credentials.
 */
export class DhlClient extends BaseIntegrationClient {
  private readonly accountNumber: string;
  private readonly apiKey: string;

  constructor(config: DhlClientConfig) {
    const baseUrl = config.sandbox ? DHL_SANDBOX_URL : DHL_PRODUCTION_URL;

    super({
      baseUrl,
      authType: "basic_auth",
      credentials: {
        username: config.apiKey,
        password: config.apiSecret,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 250 },
      defaultHeaders: {
        "dhl-api-key": config.apiKey,
      },
    });

    this.accountNumber = config.accountNumber;
    this.apiKey = config.apiKey;
  }

  // ==================== Shipment Creation ====================

  /**
   * Create one or more shipments and generate labels.
   *
   * Uses the DHL Parcel DE Shipping API v2 (Geschaeftskundenversand).
   * Each shipment in the request will produce a tracking number and label.
   */
  async createShipment(
    shipment: DhlShipmentRequest,
    options?: { labelFormat?: DhlLabelFormat; labelSize?: DhlLabelSize }
  ): Promise<ApiResponse<DhlShipmentResponse>> {
    const params: Record<string, string> = {};
    if (options?.labelFormat) params.labelFormat = options.labelFormat;
    if (options?.labelSize) params.labelSize = options.labelSize;

    return this.request<DhlShipmentResponse>({
      method: "POST",
      path: "/parcel/de/shipping/v2/orders",
      body: { shipments: [shipment] },
      params: Object.keys(params).length > 0 ? params : undefined,
    });
  }

  /**
   * Create multiple shipments in a single request (batch).
   * Maximum 30 shipments per call.
   */
  async createShipmentBatch(
    shipments: DhlShipmentRequest[],
    options?: { labelFormat?: DhlLabelFormat; labelSize?: DhlLabelSize }
  ): Promise<ApiResponse<DhlShipmentResponse>> {
    const params: Record<string, string> = {};
    if (options?.labelFormat) params.labelFormat = options.labelFormat;
    if (options?.labelSize) params.labelSize = options.labelSize;

    return this.request<DhlShipmentResponse>({
      method: "POST",
      path: "/parcel/de/shipping/v2/orders",
      body: { shipments },
      params: Object.keys(params).length > 0 ? params : undefined,
    });
  }

  // ==================== Label Retrieval ====================

  /**
   * Retrieve the label for an existing shipment by tracking number.
   * Returns the label as base64-encoded data.
   */
  async getLabel(
    shipmentNo: string,
    options?: { labelFormat?: DhlLabelFormat; labelSize?: DhlLabelSize }
  ): Promise<ApiResponse<{ label: { b64: string; fileFormat: DhlLabelFormat } }>> {
    const params: Record<string, string> = {};
    if (options?.labelFormat) params.labelFormat = options.labelFormat;
    if (options?.labelSize) params.labelSize = options.labelSize;

    return this.get(`/parcel/de/shipping/v2/orders/${shipmentNo}/label`, params);
  }

  // ==================== Shipment Deletion ====================

  /**
   * Cancel / delete a shipment that has not yet been manifested.
   */
  async deleteShipment(shipmentNo: string): Promise<ApiResponse<{ status: { title: string; statusCode: number } }>> {
    return this.delete(`/parcel/de/shipping/v2/orders/${shipmentNo}`);
  }

  // ==================== Tracking ====================

  /**
   * Track a shipment by tracking number.
   * Uses the DHL Shipment Tracking API v1.
   */
  async trackShipment(trackingNumber: string): Promise<ApiResponse<DhlTrackingResponse>> {
    return this.request<DhlTrackingResponse>({
      method: "GET",
      path: "/track/shipments",
      params: { trackingNumber },
      headers: {
        // Tracking API uses only the API key, not Basic auth
        Authorization: "",
        "dhl-api-key": this.apiKey,
      },
    });
  }

  /**
   * Track multiple shipments at once (comma-separated, max 20).
   */
  async trackShipments(trackingNumbers: string[]): Promise<ApiResponse<DhlTrackingResponse>> {
    return this.request<DhlTrackingResponse>({
      method: "GET",
      path: "/track/shipments",
      params: { trackingNumber: trackingNumbers.join(",") },
      headers: {
        Authorization: "",
        "dhl-api-key": this.apiKey,
      },
    });
  }

  // ==================== Manifest (Tagesabschluss) ====================

  /**
   * Manifest (close out) shipments for end-of-day processing.
   * After manifesting, shipments cannot be deleted.
   */
  async manifestShipments(
    request: DhlManifestRequest
  ): Promise<ApiResponse<DhlManifestResponse>> {
    return this.post<DhlManifestResponse>(
      "/parcel/de/shipping/v2/manifests",
      request
    );
  }

  // ==================== Validation ====================

  /**
   * Validate a shipment request without creating it.
   * Returns validation errors/warnings if any.
   */
  async validateShipment(
    shipment: DhlShipmentRequest
  ): Promise<ApiResponse<DhlShipmentResponse>> {
    return this.request<DhlShipmentResponse>({
      method: "POST",
      path: "/parcel/de/shipping/v2/orders",
      body: { shipments: [shipment] },
      params: { validate: "true" },
    });
  }
}

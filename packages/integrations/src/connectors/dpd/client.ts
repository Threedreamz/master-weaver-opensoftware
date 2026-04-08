import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  DpdClientConfig,
  DpdShipmentRequest,
  DpdShipmentResponse,
  DpdTrackingResponse,
  DpdLabelFormat,
  DpdLabelSize,
  DpdPickupRequest,
  DpdPickupResponse,
  DpdAuthToken,
} from "./types.js";

const DPD_PRODUCTION_URL = "https://public-ws.dpd.com/services";
const DPD_SANDBOX_URL = "https://public-ws-stage.dpd.com/services";

const DPD_TRACKING_URL = "https://tracking.dpd.de/rest/v1";

/**
 * DPD Shipping API client.
 *
 * Supports:
 * - Shipment creation with label generation
 * - Parcel tracking
 * - Pickup scheduling
 * - Label retrieval and reprinting
 *
 * Authentication: DELIS-ID (customer login) + password.
 * The client obtains a session token via the LoginService
 * and uses it for subsequent requests.
 */
export class DpdClient extends BaseIntegrationClient {
  private readonly delisId: string;
  private readonly password: string;
  private authToken: DpdAuthToken | null = null;

  constructor(config: DpdClientConfig) {
    const baseUrl = config.sandbox ? DPD_SANDBOX_URL : DPD_PRODUCTION_URL;

    super({
      baseUrl,
      authType: "custom",
      credentials: {
        username: config.delisId,
        password: config.password,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 120 },
    });

    this.delisId = config.delisId;
    this.password = config.password;
  }

  // ==================== Authentication ====================

  /**
   * Authenticate with DPD LoginService to obtain a session token.
   * Called automatically before requests if no valid token exists.
   */
  async authenticate(): Promise<DpdAuthToken> {
    const response = await this.post<{
      token: string;
      depot: string;
    }>("/LoginService/V2_0/", {
      delisId: this.delisId,
      password: this.password,
      messageLanguage: "de_DE",
    });

    this.authToken = {
      token: response.data.token,
      delisId: this.delisId,
      // DPD tokens are session-based; set a 4-hour TTL as safety margin
      expiresAt: Date.now() + 4 * 60 * 60 * 1000,
    };

    return this.authToken;
  }

  /**
   * Ensure we have a valid auth token, refreshing if needed.
   */
  private async ensureAuthenticated(): Promise<string> {
    if (
      this.authToken &&
      this.authToken.expiresAt &&
      Date.now() < this.authToken.expiresAt
    ) {
      return this.authToken.token;
    }
    const token = await this.authenticate();
    return token.token;
  }

  // ==================== Shipment Creation ====================

  /**
   * Create a shipment order and generate labels.
   * Each parcel in the request receives its own tracking number and label.
   */
  async createShipment(
    shipment: DpdShipmentRequest,
    options?: { labelFormat?: DpdLabelFormat; labelSize?: DpdLabelSize }
  ): Promise<ApiResponse<DpdShipmentResponse>> {
    const token = await this.ensureAuthenticated();

    return this.request<DpdShipmentResponse>({
      method: "POST",
      path: "/ShipmentService/V4_4/",
      body: {
        token,
        language: "de_DE",
        shipment: {
          ...shipment,
          delisId: this.delisId,
        },
        labelFormat: options?.labelFormat ?? "PDF",
        labelSize: options?.labelSize ?? "PDF_A6",
      },
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  /**
   * Create multiple shipments in a batch (max 500 parcels).
   */
  async createShipmentBatch(
    shipments: DpdShipmentRequest[],
    options?: { labelFormat?: DpdLabelFormat; labelSize?: DpdLabelSize }
  ): Promise<ApiResponse<DpdShipmentResponse[]>> {
    const token = await this.ensureAuthenticated();

    return this.request<DpdShipmentResponse[]>({
      method: "POST",
      path: "/ShipmentService/V4_4/",
      body: {
        token,
        language: "de_DE",
        shipments: shipments.map((s) => ({
          ...s,
          delisId: this.delisId,
        })),
        labelFormat: options?.labelFormat ?? "PDF",
        labelSize: options?.labelSize ?? "PDF_A6",
      },
    });
  }

  // ==================== Label Retrieval ====================

  /**
   * Retrieve the label for an existing parcel.
   */
  async getLabel(
    parcelNo: string,
    options?: { format?: DpdLabelFormat; size?: DpdLabelSize }
  ): Promise<ApiResponse<{ data: string; format: DpdLabelFormat }>> {
    const token = await this.ensureAuthenticated();

    return this.request<{ data: string; format: DpdLabelFormat }>({
      method: "POST",
      path: "/ShipmentService/V4_4/getLabel",
      body: {
        token,
        parcelNo,
        labelFormat: options?.format ?? "PDF",
        labelSize: options?.size ?? "PDF_A6",
      },
    });
  }

  // ==================== Tracking ====================

  /**
   * Track a parcel by its DPD parcel number.
   * Uses the DPD tracking REST API.
   */
  async trackParcel(parcelNo: string): Promise<ApiResponse<DpdTrackingResponse>> {
    return this.request<DpdTrackingResponse>({
      method: "GET",
      path: `${DPD_TRACKING_URL}/parcels/${parcelNo}`,
      headers: {
        // DPD tracking API uses DELIS-ID basic auth
        Authorization: `Basic ${btoa(`${this.delisId}:${this.password}`)}`,
      },
    });
  }

  /**
   * Track multiple parcels at once (max 30).
   */
  async trackParcels(parcelNumbers: string[]): Promise<ApiResponse<DpdTrackingResponse[]>> {
    return this.request<DpdTrackingResponse[]>({
      method: "GET",
      path: `${DPD_TRACKING_URL}/parcels`,
      params: { parcelNo: parcelNumbers.join(",") },
      headers: {
        Authorization: `Basic ${btoa(`${this.delisId}:${this.password}`)}`,
      },
    });
  }

  // ==================== Pickup Scheduling ====================

  /**
   * Schedule a pickup at the specified address.
   */
  async schedulePickup(
    pickup: DpdPickupRequest
  ): Promise<ApiResponse<DpdPickupResponse>> {
    const token = await this.ensureAuthenticated();

    return this.request<DpdPickupResponse>({
      method: "POST",
      path: "/PickupService/V1_0/",
      body: {
        token,
        pickup: {
          ...pickup,
          delisId: this.delisId,
        },
      },
    });
  }

  /**
   * Cancel a previously scheduled pickup.
   */
  async cancelPickup(confirmationNumber: string): Promise<ApiResponse<{ status: string }>> {
    const token = await this.ensureAuthenticated();

    return this.request<{ status: string }>({
      method: "POST",
      path: "/PickupService/V1_0/cancel",
      body: {
        token,
        confirmationNumber,
      },
    });
  }

  // ==================== Shipment Deletion ====================

  /**
   * Cancel a shipment that has not yet been picked up.
   */
  async deleteShipment(shipmentId: string): Promise<ApiResponse<{ status: string }>> {
    const token = await this.ensureAuthenticated();

    return this.request<{ status: string }>({
      method: "POST",
      path: "/ShipmentService/V4_4/deleteShipment",
      body: {
        token,
        shipmentId,
      },
    });
  }
}

import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  FedExClientConfig,
  FedExShipmentRequest,
  FedExShipmentResponse,
  FedExRateRequest,
  FedExRateResponse,
  FedExTrackingRequest,
  FedExTrackingResponse,
  FedExPickupRequest,
  FedExPickupResponse,
  FedExCancelPickupRequest,
} from "./types.js";

const FEDEX_PRODUCTION_URL = "https://apis.fedex.com";
const FEDEX_SANDBOX_URL = "https://apis-sandbox.fedex.com";

/**
 * FedEx RESTful API client.
 *
 * Supports:
 * - Shipment creation with label generation (Ship API v1)
 * - Rate quotes (Rate API v1)
 * - Package tracking (Track API v1)
 * - Pickup scheduling (Pickup API v1)
 *
 * Authentication: OAuth2 client credentials flow.
 */
export class FedExClient extends BaseIntegrationClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly accountNumber: string;
  private readonly isSandbox: boolean;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(config: FedExClientConfig) {
    const baseUrl = config.sandbox ? FEDEX_SANDBOX_URL : FEDEX_PRODUCTION_URL;

    super({
      baseUrl,
      authType: "oauth2",
      credentials: { accessToken: "" },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 200 },
      defaultHeaders: {
        "x-locale": "en_US",
      },
    });

    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.accountNumber = config.accountNumber;
    this.isSandbox = config.sandbox ?? false;
  }

  // ==================== OAuth2 Token Management ====================

  /**
   * Obtain an OAuth2 access token using client credentials grant.
   */
  private async authenticate(): Promise<string> {
    const tokenUrl = this.isSandbox
      ? `${FEDEX_SANDBOX_URL}/oauth/token`
      : `${FEDEX_PRODUCTION_URL}/oauth/token`;

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "Unknown error");
      throw new IntegrationError(
        "AUTH_ERROR",
        `FedEx OAuth token request failed: ${error}`,
        response.status
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      token_type: string;
      scope: string;
    };

    this.accessToken = data.access_token;
    // Refresh 5 minutes before actual expiry
    this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
    this.credentials.accessToken = data.access_token;

    return data.access_token;
  }

  /**
   * Ensure a valid access token exists, refreshing if expired.
   */
  private async ensureAuthenticated(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return;
    await this.authenticate();
  }

  // ==================== Shipping ====================

  /**
   * Create a shipment and generate labels.
   * Uses FedEx Ship API v1.
   */
  async createShipment(
    shipmentRequest: FedExShipmentRequest
  ): Promise<ApiResponse<FedExShipmentResponse>> {
    await this.ensureAuthenticated();

    return this.post<FedExShipmentResponse>("/ship/v1/shipments", {
      labelResponseOptions: "LABEL",
      requestedShipment: shipmentRequest,
      accountNumber: shipmentRequest.accountNumber,
    });
  }

  /**
   * Validate a shipment without creating it.
   */
  async validateShipment(
    shipmentRequest: FedExShipmentRequest
  ): Promise<ApiResponse<FedExShipmentResponse>> {
    await this.ensureAuthenticated();

    return this.post<FedExShipmentResponse>("/ship/v1/shipments/validate", {
      labelResponseOptions: "LABEL",
      requestedShipment: shipmentRequest,
      accountNumber: shipmentRequest.accountNumber,
    });
  }

  /**
   * Cancel a shipment that has not been tendered.
   */
  async cancelShipment(
    trackingNumber: string,
    shipDatestamp: string
  ): Promise<ApiResponse<{ cancelledShipment: boolean }>> {
    await this.ensureAuthenticated();

    return this.put<{ cancelledShipment: boolean }>("/ship/v1/shipments/cancel", {
      accountNumber: { value: this.accountNumber },
      trackingNumber,
      senderCountryCode: "US",
      deletionControl: "DELETE_ALL_PACKAGES",
    });
  }

  // ==================== Label Retrieval ====================

  /**
   * Reprint a label for an existing shipment.
   */
  async reprintLabel(
    trackingNumber: string,
    imageType: "PDF" | "PNG" | "ZPLII" = "PDF",
    labelStockType: string = "PAPER_4X6"
  ): Promise<ApiResponse<{ encodedLabel: string }>> {
    await this.ensureAuthenticated();

    return this.post<{ encodedLabel: string }>("/ship/v1/shipments/tag", {
      accountNumber: { value: this.accountNumber },
      trackingNumber,
      labelSpecification: {
        imageType,
        labelStockType,
      },
    });
  }

  // ==================== Rating ====================

  /**
   * Get shipping rates for a shipment.
   * Omit serviceType in the request to get rates for all available services.
   */
  async getRates(
    rateRequest: FedExRateRequest
  ): Promise<ApiResponse<FedExRateResponse>> {
    await this.ensureAuthenticated();

    return this.post<FedExRateResponse>("/rate/v1/rates/quotes", rateRequest);
  }

  /**
   * Get transit times for a shipment.
   */
  async getTransitTimes(
    rateRequest: FedExRateRequest
  ): Promise<ApiResponse<FedExRateResponse>> {
    await this.ensureAuthenticated();

    return this.post<FedExRateResponse>("/availability/v1/transittimes", rateRequest);
  }

  // ==================== Tracking ====================

  /**
   * Track one or more packages by tracking number.
   * Uses FedEx Track API v1.
   */
  async trackPackage(trackingNumber: string): Promise<ApiResponse<FedExTrackingResponse>> {
    await this.ensureAuthenticated();

    const trackingRequest: FedExTrackingRequest = {
      trackingInfo: [
        { trackingNumberInfo: { trackingNumber } },
      ],
      includeDetailedScans: true,
    };

    return this.post<FedExTrackingResponse>("/track/v1/trackingnumbers", trackingRequest);
  }

  /**
   * Track multiple packages at once (max 30).
   */
  async trackPackages(trackingNumbers: string[]): Promise<ApiResponse<FedExTrackingResponse>> {
    await this.ensureAuthenticated();

    const trackingRequest: FedExTrackingRequest = {
      trackingInfo: trackingNumbers.map((tn) => ({
        trackingNumberInfo: { trackingNumber: tn },
      })),
      includeDetailedScans: true,
    };

    return this.post<FedExTrackingResponse>("/track/v1/trackingnumbers", trackingRequest);
  }

  /**
   * Get proof of delivery for a delivered package.
   */
  async getProofOfDelivery(trackingNumber: string): Promise<ApiResponse<unknown>> {
    await this.ensureAuthenticated();

    return this.post("/track/v1/notifications", {
      trackingNumberInfo: { trackingNumber },
      senderContactName: "opensoftware",
      senderEMailAddress: "",
    });
  }

  // ==================== Pickup ====================

  /**
   * Schedule a pickup at the specified location.
   */
  async schedulePickup(
    pickupRequest: FedExPickupRequest
  ): Promise<ApiResponse<FedExPickupResponse>> {
    await this.ensureAuthenticated();

    return this.post<FedExPickupResponse>("/pickup/v1/pickups", pickupRequest);
  }

  /**
   * Cancel a previously scheduled pickup.
   */
  async cancelPickup(
    cancelRequest: FedExCancelPickupRequest
  ): Promise<ApiResponse<{ cancelConfirmationMessage: string }>> {
    await this.ensureAuthenticated();

    return this.put<{ cancelConfirmationMessage: string }>(
      "/pickup/v1/pickups/cancel",
      cancelRequest
    );
  }

  /**
   * Check pickup availability for a location.
   */
  async checkPickupAvailability(
    address: { postalCode: string; countryCode: string; stateOrProvinceCode?: string },
    pickupDate: string,
    carrierCode: "FDXE" | "FDXG" = "FDXE"
  ): Promise<ApiResponse<{ options: unknown[] }>> {
    await this.ensureAuthenticated();

    return this.post("/pickup/v1/pickups/availabilities", {
      pickupAddress: address,
      pickupRequestType: ["FUTURE_DAY"],
      dispatchDate: pickupDate,
      carriers: [carrierCode],
      accountNumber: { value: this.accountNumber },
    });
  }
}

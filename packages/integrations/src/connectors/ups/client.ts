import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  UpsClientConfig,
  UpsShipmentRequest,
  UpsShipmentResponse,
  UpsRateRequest,
  UpsRateResponse,
  UpsTrackingResponse,
  UpsAddressValidationRequest,
  UpsAddressValidationResponse,
} from "./types.js";

const UPS_PRODUCTION_URL = "https://onlinetools.ups.com";
const UPS_SANDBOX_URL = "https://wwwcie.ups.com";
const UPS_TOKEN_URL = "https://onlinetools.ups.com/security/v1/oauth/token";
const UPS_SANDBOX_TOKEN_URL = "https://wwwcie.ups.com/security/v1/oauth/token";

/**
 * UPS RESTful API client.
 *
 * Supports:
 * - Shipment creation with label generation (Shipping API)
 * - Rate estimation (Rating API)
 * - Package tracking (Tracking API)
 * - Address validation (Address Validation API)
 *
 * Authentication: OAuth2 client credentials flow.
 * Token is obtained from UPS security endpoint and cached.
 */
export class UpsClient extends BaseIntegrationClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly accountNumber: string;
  private readonly tokenUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(config: UpsClientConfig) {
    const baseUrl = config.sandbox ? UPS_SANDBOX_URL : UPS_PRODUCTION_URL;

    super({
      baseUrl,
      authType: "oauth2",
      credentials: { accessToken: "" },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 150 },
      defaultHeaders: {
        transId: crypto.randomUUID(),
        transactionSrc: "opensoftware",
      },
    });

    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.accountNumber = config.accountNumber;
    this.tokenUrl = config.sandbox ? UPS_SANDBOX_TOKEN_URL : UPS_TOKEN_URL;
  }

  // ==================== OAuth2 Token Management ====================

  /**
   * Obtain an OAuth2 access token using client credentials grant.
   */
  private async authenticate(): Promise<string> {
    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "Unknown error");
      throw new IntegrationError(
        "AUTH_ERROR",
        `UPS OAuth token request failed: ${error}`,
        response.status
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      token_type: string;
    };

    this.accessToken = data.access_token;
    // Refresh 5 minutes before actual expiry
    this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
    // Update the base client credentials so auth headers are set correctly
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
   * Uses UPS Shipping API v2403.
   */
  async createShipment(
    shipmentRequest: UpsShipmentRequest
  ): Promise<ApiResponse<UpsShipmentResponse>> {
    await this.ensureAuthenticated();

    return this.post<UpsShipmentResponse>("/api/shipments/v2403/ship", {
      ShipmentRequest: {
        Request: {
          SubVersion: "2403",
          RequestOption: "nonvalidate",
          TransactionReference: { CustomerContext: "opensoftware" },
        },
        Shipment: shipmentRequest,
      },
    });
  }

  /**
   * Create a shipment with address validation (validates before shipping).
   */
  async createShipmentValidated(
    shipmentRequest: UpsShipmentRequest
  ): Promise<ApiResponse<UpsShipmentResponse>> {
    await this.ensureAuthenticated();

    return this.post<UpsShipmentResponse>("/api/shipments/v2403/ship", {
      ShipmentRequest: {
        Request: {
          SubVersion: "2403",
          RequestOption: "validate",
          TransactionReference: { CustomerContext: "opensoftware" },
        },
        Shipment: shipmentRequest,
      },
    });
  }

  /**
   * Void / cancel a shipment that has not been picked up.
   */
  async voidShipment(
    shipmentIdentificationNumber: string
  ): Promise<ApiResponse<{ status: string }>> {
    await this.ensureAuthenticated();

    return this.delete(`/api/shipments/v2403/void/cancel/${shipmentIdentificationNumber}`);
  }

  // ==================== Rating ====================

  /**
   * Get shipping rates for a shipment.
   * Use requestOption "Shop" to get rates for all available services,
   * or "Rate" to get the rate for a specific service.
   */
  async getRates(
    rateRequest: UpsRateRequest
  ): Promise<ApiResponse<UpsRateResponse>> {
    await this.ensureAuthenticated();

    const version = "2403";
    const requestOption = rateRequest.requestOption;

    return this.post<UpsRateResponse>(`/api/rating/v2403/${requestOption}`, {
      RateRequest: {
        Request: {
          SubVersion: version,
          TransactionReference: { CustomerContext: "opensoftware" },
        },
        PickupType: { Code: "01" }, // Daily pickup
        Shipment: {
          Shipper: rateRequest.shipper,
          ShipTo: rateRequest.shipTo,
          ShipFrom: rateRequest.shipFrom ?? rateRequest.shipper,
          Service: rateRequest.service,
          Package: rateRequest.packages,
        },
      },
    });
  }

  /**
   * Get time-in-transit estimates.
   */
  async getTimeInTransit(
    originPostalCode: string,
    originCountryCode: string,
    destinationPostalCode: string,
    destinationCountryCode: string,
    weight: string,
    shipDate: string
  ): Promise<ApiResponse<unknown>> {
    await this.ensureAuthenticated();

    return this.post("/api/shipments/v1/transittimes", {
      originCountryCode,
      originPostalCode,
      destinationCountryCode,
      destinationPostalCode,
      weight,
      weightUnitOfMeasure: "KGS",
      shipDate,
    });
  }

  // ==================== Tracking ====================

  /**
   * Track a package by tracking number.
   * Uses UPS Tracking API v1.
   */
  async trackPackage(trackingNumber: string): Promise<ApiResponse<UpsTrackingResponse>> {
    await this.ensureAuthenticated();

    return this.get<UpsTrackingResponse>(
      `/api/track/v1/details/${trackingNumber}`,
      { locale: "en_US", returnSignature: "false" }
    );
  }

  /**
   * Track a package with full activity history and proof of delivery.
   */
  async trackPackageDetailed(trackingNumber: string): Promise<ApiResponse<UpsTrackingResponse>> {
    await this.ensureAuthenticated();

    return this.get<UpsTrackingResponse>(
      `/api/track/v1/details/${trackingNumber}`,
      { locale: "en_US", returnSignature: "true", returnMilestones: "true" }
    );
  }

  // ==================== Address Validation ====================

  /**
   * Validate and classify a US address.
   * Returns candidate addresses ranked by confidence.
   */
  async validateAddress(
    request: UpsAddressValidationRequest
  ): Promise<ApiResponse<UpsAddressValidationResponse>> {
    await this.ensureAuthenticated();

    return this.post<UpsAddressValidationResponse>(
      "/api/addressvalidation/v2/",
      {
        XAVRequest: {
          Request: {
            RequestOption: "1", // Address validation only
            TransactionReference: { CustomerContext: "opensoftware" },
          },
          ...request,
        },
      }
    );
  }

  /**
   * Validate and classify address, returning candidates with street-level detail.
   */
  async validateAddressWithClassification(
    request: UpsAddressValidationRequest
  ): Promise<ApiResponse<UpsAddressValidationResponse>> {
    await this.ensureAuthenticated();

    return this.post<UpsAddressValidationResponse>(
      "/api/addressvalidation/v2/",
      {
        XAVRequest: {
          Request: {
            RequestOption: "3", // Address validation + classification
            TransactionReference: { CustomerContext: "opensoftware" },
          },
          ...request,
        },
      }
    );
  }

  // ==================== Label Recovery ====================

  /**
   * Recover (reprint) a label for an existing shipment.
   */
  async recoverLabel(
    trackingNumber: string,
    labelFormat: "PDF" | "ZPL" | "GIF" = "PDF"
  ): Promise<ApiResponse<{ labelImage: string; labelFormat: string }>> {
    await this.ensureAuthenticated();

    return this.post("/api/labels/v2403/recovery", {
      LabelRecoveryRequest: {
        Request: {
          SubVersion: "2403",
          TransactionReference: { CustomerContext: "opensoftware" },
        },
        TrackingNumber: trackingNumber,
        LabelSpecification: {
          LabelImageFormat: { Code: labelFormat },
        },
      },
    });
  }
}

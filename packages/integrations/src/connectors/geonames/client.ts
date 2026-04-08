// ==================== GeoNames Client ====================
// Postal code search and geocoding via the GeoNames REST API.
// Auth: free username parameter (register at geonames.org).
// Docs: https://www.geonames.org/export/web-services.html

import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type {
  GeoNamesConfig,
  GeoNamesPostalCode,
  GeoNamesPostalCodeSearchRequest,
  GeoNamesPostalCodeSearchResponse,
  GeoNamesNearbyPostalCode,
  GeoNamesNearbyPostalCodesResponse,
  GeoNamesApiError,
} from "./types.js";

// ==================== GeoNames Client ====================

/**
 * GeoNamesClient queries the GeoNames REST API for postal code
 * lookups, reverse geocoding, and nearby postal code searches.
 *
 * Requires a free GeoNames username (register at geonames.org).
 * The username is passed as a query parameter on every request.
 *
 * Usage:
 * ```ts
 * const client = new GeoNamesClient({ username: "my_geonames_user" });
 * const codes = await client.searchPostalCodes({ country: "DE", postalcode: "10115" });
 * const nearby = await client.getNearbyPostalCodes(52.52, 13.405, 10);
 * ```
 */
export class GeoNamesClient extends BaseIntegrationClient {
  private readonly username: string;

  constructor(config: GeoNamesConfig) {
    super({
      baseUrl: "http://api.geonames.org",
      authType: "none",
      credentials: {},
      rateLimit: { requestsPerMinute: 60, burstSize: 10 },
      timeout: 30_000,
      defaultHeaders: {
        Accept: "application/json",
      },
    });

    if (!config.username || config.username.trim().length === 0) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        "GeoNames username is required. Register a free account at https://www.geonames.org/login"
      );
    }

    this.username = config.username.trim();
  }

  // ==================== Public API ====================

  /**
   * Search postal codes by code, place name, or country.
   *
   * @param request - Search parameters (at least `country` is required)
   * @returns Array of matching postal code entries
   */
  async searchPostalCodes(
    request: GeoNamesPostalCodeSearchRequest
  ): Promise<GeoNamesPostalCode[]> {
    const country = request.country.toUpperCase().trim();

    if (!/^[A-Z]{2}$/.test(country)) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        `Invalid country code: "${request.country}". Expected a 2-letter ISO 3166 code (e.g., DE, FR, US).`
      );
    }

    const params: Record<string, string> = {
      country,
      username: this.username,
      maxRows: String(request.maxRows ?? 20),
    };

    if (request.postalcode) {
      params.postalcode = request.postalcode.trim();
    }
    if (request.placename) {
      params.placename = request.placename.trim();
    }

    const response = await this.get<GeoNamesPostalCodeSearchResponse | GeoNamesApiError>(
      `/postalCodeSearchJSON`,
      params
    );

    this.assertNoApiError(response.data);

    const data = response.data as GeoNamesPostalCodeSearchResponse;
    return (data.postalCodes ?? []).map(this.normalizePostalCode);
  }

  /**
   * Get all postal codes for a country.
   *
   * @param countryCode - ISO 3166 alpha-2 country code
   * @param maxRows - Maximum number of results (default: 1000, GeoNames max: 20000)
   * @returns Array of postal code entries for the country
   */
  async getPostalCodesByCountry(
    countryCode: string,
    maxRows: number = 1000
  ): Promise<GeoNamesPostalCode[]> {
    return this.searchPostalCodes({
      country: countryCode,
      maxRows: Math.min(maxRows, 20_000),
    });
  }

  /**
   * Find postal codes near a geographic coordinate.
   *
   * @param lat - Latitude (decimal degrees)
   * @param lng - Longitude (decimal degrees)
   * @param radiusKm - Search radius in kilometers (max: 300)
   * @returns Array of nearby postal codes with distance
   */
  async getNearbyPostalCodes(
    lat: number,
    lng: number,
    radiusKm: number = 10
  ): Promise<GeoNamesNearbyPostalCode[]> {
    if (lat < -90 || lat > 90) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        `Invalid latitude: ${lat}. Must be between -90 and 90.`
      );
    }
    if (lng < -180 || lng > 180) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        `Invalid longitude: ${lng}. Must be between -180 and 180.`
      );
    }

    const params: Record<string, string> = {
      lat: String(lat),
      lng: String(lng),
      radius: String(Math.min(radiusKm, 300)),
      username: this.username,
      maxRows: "20",
    };

    const response = await this.get<GeoNamesNearbyPostalCodesResponse | GeoNamesApiError>(
      `/findNearbyPostalCodesJSON`,
      params
    );

    this.assertNoApiError(response.data);

    const data = response.data as GeoNamesNearbyPostalCodesResponse;
    return (data.postalCodes ?? []).map((pc) => ({
      ...this.normalizePostalCode(pc),
      distance: typeof pc.distance === "number" ? pc.distance : parseFloat(String(pc.distance)) || 0,
    }));
  }

  /**
   * Test that the GeoNames API is reachable with the configured username.
   *
   * Performs a minimal postal code search for a well-known location.
   */
  async testConnection(): Promise<boolean> {
    try {
      const results = await this.searchPostalCodes({
        country: "DE",
        postalcode: "10115",
        maxRows: 1,
      });
      return results.length > 0;
    } catch (error) {
      if (error instanceof IntegrationError && error.code === "VALIDATION_ERROR") {
        // Validation errors mean the API responded — it's reachable
        return true;
      }
      return false;
    }
  }

  // ==================== Private Helpers ====================

  /**
   * Check if the API returned an error object instead of data.
   * GeoNames returns errors as `{ status: { message, value } }`.
   */
  private assertNoApiError(data: unknown): void {
    if (
      data &&
      typeof data === "object" &&
      "status" in data &&
      (data as GeoNamesApiError).status?.message
    ) {
      const apiError = data as GeoNamesApiError;
      const code = apiError.status.value;

      // GeoNames error codes:
      // 10 = Authorization Exception (invalid username)
      // 18 = daily limit exceeded
      // 19 = hourly limit exceeded
      // 20 = weekly limit exceeded
      if (code === 10) {
        throw new IntegrationError(
          "AUTH_ERROR",
          `GeoNames authentication failed: ${apiError.status.message}. Check your username.`
        );
      }
      if (code === 18 || code === 19 || code === 20) {
        throw new IntegrationError(
          "RATE_LIMITED",
          `GeoNames rate limit exceeded: ${apiError.status.message}`
        );
      }

      throw new IntegrationError(
        "SERVER_ERROR",
        `GeoNames API error (code ${code}): ${apiError.status.message}`,
        200,
        data
      );
    }
  }

  /**
   * Normalize a raw postal code object from the API response.
   * Ensures numeric fields are actual numbers and optional fields
   * are properly handled.
   */
  private normalizePostalCode(pc: GeoNamesPostalCode): GeoNamesPostalCode {
    return {
      postalCode: pc.postalCode ?? "",
      placeName: pc.placeName ?? "",
      countryCode: pc.countryCode ?? "",
      adminName1: pc.adminName1 ?? "",
      adminCode1: pc.adminCode1 ?? "",
      adminName2: pc.adminName2 || undefined,
      adminCode2: pc.adminCode2 || undefined,
      adminName3: pc.adminName3 || undefined,
      latitude: typeof pc.latitude === "number" ? pc.latitude : parseFloat(String(pc.latitude)) || 0,
      longitude: typeof pc.longitude === "number" ? pc.longitude : parseFloat(String(pc.longitude)) || 0,
    };
  }
}

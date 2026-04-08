// ==================== VIES VAT Validation Client ====================
// EU VAT number validation via the VIES REST API.
// Free public API — no authentication required.
// Docs: https://ec.europa.eu/taxation_customs/vies/rest-api

import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type {
  ViesCountryCode,
  ViesValidationRequest,
  ViesValidationResponse,
  ViesApiResponse,
} from "./types.js";

// ==================== Validation Patterns ====================

/** VAT number format patterns per EU country (without country prefix) */
const VAT_FORMAT_PATTERNS: Record<ViesCountryCode, RegExp> = {
  AT: /^U\d{8}$/,                   // ATU12345678
  BE: /^[01]\d{9}$/,                // BE0123456789
  BG: /^\d{9,10}$/,                 // BG123456789 or BG1234567890
  CY: /^\d{8}[A-Z]$/,              // CY12345678A
  CZ: /^\d{8,10}$/,                 // CZ12345678 or CZ1234567890
  DE: /^\d{9}$/,                    // DE123456789
  DK: /^\d{8}$/,                    // DK12345678
  EE: /^\d{9}$/,                    // EE123456789
  EL: /^\d{9}$/,                    // EL123456789 (Greece)
  ES: /^[A-Z0-9]\d{7}[A-Z0-9]$/,  // ESX1234567X
  FI: /^\d{8}$/,                    // FI12345678
  FR: /^[A-Z0-9]{2}\d{9}$/,        // FRXX123456789
  HR: /^\d{11}$/,                   // HR12345678901
  HU: /^\d{8}$/,                    // HU12345678
  IE: /^\d{7}[A-Z]{1,2}$|^\d[A-Z+*]\d{5}[A-Z]$/, // IE1234567A or IE1A23456B
  IT: /^\d{11}$/,                   // IT12345678901
  LT: /^\d{9}$|^\d{12}$/,          // LT123456789 or LT123456789012
  LU: /^\d{8}$/,                    // LU12345678
  LV: /^\d{11}$/,                   // LV12345678901
  MT: /^\d{8}$/,                    // MT12345678
  NL: /^\d{9}B\d{2}$/,             // NL123456789B01
  PL: /^\d{10}$/,                   // PL1234567890
  PT: /^\d{9}$/,                    // PT123456789
  RO: /^\d{2,10}$/,                 // RO12 to RO1234567890
  SE: /^\d{12}$/,                   // SE123456789012
  SI: /^\d{8}$/,                    // SI12345678
  SK: /^\d{10}$/,                   // SK1234567890
  XI: /^\d{9}$|^\d{12}$|^GD\d{3}$|^HA\d{3}$/, // Northern Ireland
};

/** All valid VIES country codes */
const VALID_COUNTRY_CODES = new Set<string>(Object.keys(VAT_FORMAT_PATTERNS));

// ==================== VIES VAT Client ====================

/**
 * ViesVatClient validates EU VAT numbers via the VIES REST API.
 *
 * This is a free public API with no authentication.
 * Rate limits apply (enforced by the base client token bucket).
 *
 * Usage:
 * ```ts
 * const client = new ViesVatClient();
 * const result = await client.validateVatNumber("DE", "123456789");
 * ```
 */
export class ViesVatClient extends BaseIntegrationClient {
  constructor() {
    super({
      baseUrl: "https://ec.europa.eu/taxation_customs/vies/rest-api",
      authType: "none",
      credentials: {},
      rateLimit: { requestsPerMinute: 60, burstSize: 10 },
      timeout: 30_000,
      defaultHeaders: {
        Accept: "application/json",
      },
    });
  }

  // ==================== Public API ====================

  /**
   * Validate a VAT number via VIES.
   *
   * @param countryCode - 2-letter EU country code (e.g., "DE", "FR", "NL")
   * @param vatNumber - VAT number without country prefix
   * @returns Validation result including business name and address if available
   */
  async validateVatNumber(
    countryCode: string,
    vatNumber: string
  ): Promise<ViesValidationResponse> {
    const normalizedCountry = countryCode.toUpperCase().trim();
    const normalizedVat = vatNumber.replace(/[\s.\-]/g, "").toUpperCase();

    this.assertValidCountryCode(normalizedCountry);
    this.assertValidVatFormat(normalizedCountry as ViesCountryCode, normalizedVat);

    const response = await this.get<ViesApiResponse>(
      `/check-vat-number`,
      {
        countryCode: normalizedCountry,
        vatNumber: normalizedVat,
      }
    );

    return this.mapApiResponse(normalizedCountry, normalizedVat, response.data);
  }

  /**
   * Validate a full VAT ID string (e.g., "DE123456789").
   * Automatically splits into country code and VAT number.
   */
  async validateVatId(vatId: string): Promise<ViesValidationResponse> {
    const normalized = vatId.replace(/[\s.\-]/g, "").toUpperCase();

    if (normalized.length < 4) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        `VAT ID too short: "${vatId}". Expected format: CC followed by number (e.g., DE123456789).`
      );
    }

    const countryCode = normalized.slice(0, 2);
    const vatNumber = normalized.slice(2);

    return this.validateVatNumber(countryCode, vatNumber);
  }

  /**
   * Validate a VAT number with requester information.
   * This creates a qualified request that includes a request identifier for audit trail.
   */
  async validateVatNumberQualified(
    request: ViesValidationRequest
  ): Promise<ViesValidationResponse> {
    const normalizedCountry = request.countryCode.toUpperCase().trim();
    const normalizedVat = request.vatNumber.replace(/[\s.\-]/g, "").toUpperCase();

    this.assertValidCountryCode(normalizedCountry);
    this.assertValidVatFormat(normalizedCountry as ViesCountryCode, normalizedVat);

    const params: Record<string, string> = {
      countryCode: normalizedCountry,
      vatNumber: normalizedVat,
    };

    if (request.requesterCountryCode && request.requesterVatNumber) {
      const reqCountry = request.requesterCountryCode.toUpperCase().trim();
      const reqVat = request.requesterVatNumber.replace(/[\s.\-]/g, "").toUpperCase();
      this.assertValidCountryCode(reqCountry);

      params.requesterCountryCode = reqCountry;
      params.requesterVatNumber = reqVat;
    }

    const response = await this.get<ViesApiResponse>(
      `/check-vat-number`,
      params
    );

    return this.mapApiResponse(normalizedCountry, normalizedVat, response.data);
  }

  /**
   * Batch validate multiple VAT numbers.
   * Processes sequentially to respect VIES rate limits.
   *
   * @param vatIds - Array of full VAT IDs (e.g., ["DE123456789", "FR12345678901"])
   * @returns Map of VAT ID to validation result
   */
  async validateBatch(
    vatIds: string[]
  ): Promise<Map<string, ViesValidationResponse | IntegrationError>> {
    const results = new Map<string, ViesValidationResponse | IntegrationError>();

    for (const vatId of vatIds) {
      try {
        const result = await this.validateVatId(vatId);
        results.set(vatId, result);
      } catch (error) {
        if (error instanceof IntegrationError) {
          results.set(vatId, error);
        } else {
          results.set(
            vatId,
            new IntegrationError(
              "UNKNOWN",
              error instanceof Error ? error.message : "Unknown validation error"
            )
          );
        }
      }
    }

    return results;
  }

  /**
   * Check if a country code is a valid VIES member state.
   */
  isValidCountryCode(countryCode: string): boolean {
    return VALID_COUNTRY_CODES.has(countryCode.toUpperCase().trim());
  }

  /**
   * Validate the format of a VAT number for a given country (offline check).
   * Does not call the VIES API — only checks the local regex pattern.
   */
  isValidVatFormat(countryCode: string, vatNumber: string): boolean {
    const normalized = countryCode.toUpperCase().trim();
    if (!VALID_COUNTRY_CODES.has(normalized)) return false;

    const pattern = VAT_FORMAT_PATTERNS[normalized as ViesCountryCode];
    if (!pattern) return false;

    return pattern.test(vatNumber.replace(/[\s.\-]/g, "").toUpperCase());
  }

  /**
   * Test the connection by validating a known German VAT number format.
   * Uses the VIES API to confirm reachability.
   */
  async testConnection(): Promise<boolean> {
    try {
      // Use a simple check to verify the API is reachable
      await this.get<ViesApiResponse>(`/check-vat-number`, {
        countryCode: "DE",
        vatNumber: "000000000",
      });
      // Even if the VAT number is invalid, a successful HTTP response means the API is up
      return true;
    } catch (error) {
      if (error instanceof IntegrationError && error.code === "VALIDATION_ERROR") {
        // A validation error from VIES means the API is reachable
        return true;
      }
      return false;
    }
  }

  // ==================== Private Helpers ====================

  private assertValidCountryCode(countryCode: string): asserts countryCode is ViesCountryCode {
    if (!VALID_COUNTRY_CODES.has(countryCode)) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        `Invalid country code: "${countryCode}". Must be an EU member state code (e.g., DE, FR, NL, AT).`
      );
    }
  }

  private assertValidVatFormat(countryCode: ViesCountryCode, vatNumber: string): void {
    const pattern = VAT_FORMAT_PATTERNS[countryCode];
    if (!pattern) return; // Should not happen given assertValidCountryCode

    if (!pattern.test(vatNumber)) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        `Invalid VAT number format for ${countryCode}: "${vatNumber}". ` +
        `Expected pattern: ${pattern.source}`
      );
    }
  }

  private mapApiResponse(
    countryCode: string,
    vatNumber: string,
    api: ViesApiResponse
  ): ViesValidationResponse {
    if (api.userError && api.userError !== "VALID" && api.userError !== "") {
      throw new IntegrationError(
        "SERVER_ERROR",
        `VIES service error: ${api.userError}`,
        200,
        api
      );
    }

    return {
      valid: api.isValid,
      countryCode,
      vatNumber,
      requestDate: api.requestDate,
      name: api.name || undefined,
      address: api.address || undefined,
      requestIdentifier: api.requestIdentifier || undefined,
    };
  }
}

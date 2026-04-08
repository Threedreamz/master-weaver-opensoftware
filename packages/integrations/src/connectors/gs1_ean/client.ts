// ==================== GS1 EAN / GTIN API Client ====================

import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  Gs1EanClientConfig,
  GtinValidationResult,
  GtinFormat,
  Gs1Product,
  Gs1ProductLookupParams,
  Gs1ProductLookupResponse,
  Gs1BatchLookupParams,
  Gs1BatchLookupResponse,
  Gs1Company,
} from "./types.js";

const GS1_CLOUD_URL = "https://cloud.gs1.org/api/v1";

export class Gs1EanClient extends BaseIntegrationClient {
  constructor(config: Gs1EanClientConfig) {
    super({
      baseUrl: config.baseUrl ?? GS1_CLOUD_URL,
      authType: "api_key",
      credentials: {
        headerName: "Authorization",
        apiKey: `Bearer ${config.apiKey}`,
      },
      timeout: config.timeout ?? 15_000,
      rateLimit: { requestsPerMinute: 120 },
    });
  }

  // ==================== GTIN Validation (Local) ====================

  /**
   * Validate a GTIN locally (no API call).
   *
   * Checks format, length, and check digit correctness for
   * GTIN-8, GTIN-12 (UPC-A), GTIN-13 (EAN-13), and GTIN-14.
   */
  validateGtin(gtin: string): GtinValidationResult {
    // Strip whitespace and leading zeros for format detection
    const cleaned = gtin.replace(/\s+/g, "").replace(/^0+/, "") || "0";
    const padded = gtin.replace(/\s+/g, "");

    // Must be all digits
    if (!/^\d+$/.test(padded)) {
      return {
        gtin: padded,
        valid: false,
        format: "UNKNOWN",
        errorMessage: "GTIN must contain only digits",
      };
    }

    // Determine format by length
    let format: GtinFormat;
    let normalized: string;

    switch (padded.length) {
      case 8:
        format = "GTIN-8";
        normalized = padded.padStart(14, "0");
        break;
      case 12:
        format = "GTIN-12";
        normalized = padded.padStart(14, "0");
        break;
      case 13:
        format = "GTIN-13";
        normalized = padded.padStart(14, "0");
        break;
      case 14:
        format = "GTIN-14";
        normalized = padded;
        break;
      default:
        return {
          gtin: padded,
          valid: false,
          format: "UNKNOWN",
          errorMessage: `Invalid GTIN length: ${padded.length}. Expected 8, 12, 13, or 14 digits`,
        };
    }

    // Calculate check digit
    const digits = normalized.split("").map(Number);
    const checkDigit = digits[digits.length - 1];
    const calculatedCheckDigit = this.calculateCheckDigit(digits.slice(0, -1));

    if (checkDigit !== calculatedCheckDigit) {
      return {
        gtin: padded,
        valid: false,
        format,
        normalizedGtin: normalized,
        checkDigit,
        calculatedCheckDigit,
        errorMessage: `Invalid check digit: expected ${calculatedCheckDigit}, got ${checkDigit}`,
      };
    }

    // Extract company prefix and item reference (approximate — actual split depends on GS1 prefix assignment)
    const companyPrefix = this.extractCompanyPrefix(normalized);

    return {
      gtin: padded,
      valid: true,
      format,
      normalizedGtin: normalized,
      companyPrefix,
      checkDigit,
      calculatedCheckDigit,
    };
  }

  /**
   * Validate multiple GTINs locally.
   */
  validateGtins(gtins: string[]): GtinValidationResult[] {
    return gtins.map((gtin) => this.validateGtin(gtin));
  }

  // ==================== Product Lookup (API) ====================

  /**
   * Look up product data by GTIN.
   */
  async lookupProduct(params: Gs1ProductLookupParams): Promise<Gs1ProductLookupResponse> {
    const validation = this.validateGtin(params.gtin);
    if (!validation.valid) {
      return {
        found: false,
        message: `Invalid GTIN: ${validation.errorMessage}`,
      };
    }

    const queryParams: Record<string, string> = {};
    if (params.targetMarket) queryParams.targetMarket = params.targetMarket;
    if (params.language) queryParams.language = params.language;

    try {
      const response = await this.get<Gs1Product>(
        `/products/${validation.normalizedGtin ?? params.gtin}`,
        queryParams
      );
      return { found: true, product: response.data };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lookup failed";
      // 404 means not found (not an error)
      if (message.includes("404")) {
        return { found: false, message: "Product not found in GS1 database" };
      }
      throw error;
    }
  }

  /**
   * Look up multiple products by GTIN in a single batch request.
   */
  async batchLookup(params: Gs1BatchLookupParams): Promise<Gs1BatchLookupResponse> {
    // Validate all GTINs first
    const validations = params.gtins.map((gtin) => this.validateGtin(gtin));
    const invalidGtins = validations.filter((v) => !v.valid);

    if (invalidGtins.length > 0) {
      throw new Error(
        `Invalid GTINs in batch: ${invalidGtins.map((v) => `${v.gtin} (${v.errorMessage})`).join(", ")}`
      );
    }

    const body: Record<string, unknown> = {
      gtins: params.gtins,
    };
    if (params.targetMarket) body.targetMarket = params.targetMarket;
    if (params.language) body.language = params.language;

    const response = await this.post<Gs1BatchLookupResponse>("/products/batch", body);
    return response.data;
  }

  /**
   * Look up a company by GS1 Company Prefix or GLN.
   */
  async lookupCompany(identifier: string): Promise<Gs1Company | null> {
    try {
      const response = await this.get<Gs1Company>(`/companies/${identifier}`);
      return response.data;
    } catch {
      return null;
    }
  }

  // ==================== Connection Test ====================

  async testConnection(): Promise<boolean> {
    try {
      // Try a simple product lookup to verify the API key
      await this.get("/products/00000000000000");
      return true;
    } catch (error) {
      // A 404 means the API key is valid but the product doesn't exist
      if (error instanceof Error && error.message.includes("404")) {
        return true;
      }
      return false;
    }
  }

  // ==================== Private Helpers ====================

  /**
   * Calculate the GS1 check digit for a GTIN.
   *
   * Uses the standard modulo-10 algorithm:
   * 1. From right to left, alternate multiply by 3 and 1
   * 2. Sum all results
   * 3. Check digit = (10 - (sum % 10)) % 10
   */
  private calculateCheckDigit(digits: number[]): number {
    let sum = 0;
    for (let i = digits.length - 1; i >= 0; i--) {
      const position = digits.length - i;
      const multiplier = position % 2 === 1 ? 3 : 1;
      sum += digits[i] * multiplier;
    }
    return (10 - (sum % 10)) % 10;
  }

  /**
   * Extract an approximate GS1 Company Prefix from a normalized GTIN-14.
   *
   * The actual prefix length varies by GS1 assignment (7-12 digits within
   * the GTIN). This uses a heuristic based on the GS1 prefix ranges.
   */
  private extractCompanyPrefix(normalizedGtin: string): string {
    // For GTIN-14, skip the indicator digit; for shorter GTINs padded to 14, skip padding
    // Default to extracting digits 2-9 as an approximation
    return normalizedGtin.substring(1, 9);
  }
}

// ==================== VIES VAT Validation Types ====================
// EU VAT Information Exchange System (VIES) REST API.
// Free public API — no authentication required.
// Base URL: https://ec.europa.eu/taxation_customs/vies/rest-api

/** EU member state country codes that participate in VIES */
export type ViesCountryCode =
  | "AT" | "BE" | "BG" | "CY" | "CZ"
  | "DE" | "DK" | "EE" | "EL" | "ES"
  | "FI" | "FR" | "HR" | "HU" | "IE"
  | "IT" | "LT" | "LU" | "LV" | "MT"
  | "NL" | "PL" | "PT" | "RO" | "SE"
  | "SI" | "SK"
  | "XI"; // Northern Ireland (post-Brexit)

/** Request to validate a VAT number via VIES */
export interface ViesValidationRequest {
  /** 2-letter EU country code */
  countryCode: ViesCountryCode;
  /** VAT number without country prefix */
  vatNumber: string;
  /** Optional: requester's country code (for qualified request) */
  requesterCountryCode?: ViesCountryCode;
  /** Optional: requester's VAT number (for qualified request) */
  requesterVatNumber?: string;
}

/** Response from the VIES validation API */
export interface ViesValidationResponse {
  /** Whether the VAT number is valid */
  valid: boolean;
  /** Country code */
  countryCode: string;
  /** VAT number (without country prefix) */
  vatNumber: string;
  /** Date of the request (YYYY-MM-DD) */
  requestDate: string;
  /** Registered name of the business (if available) */
  name?: string;
  /** Registered address of the business (if available) */
  address?: string;
  /** Request identifier from VIES */
  requestIdentifier?: string;
}

/** Raw API response shape from the VIES REST API */
export interface ViesApiResponse {
  isValid: boolean;
  requestDate: string;
  userError: string;
  name: string;
  address: string;
  requestIdentifier: string;
  vatNumber: string;
  viesApproximate?: {
    name?: string;
    street?: string;
    postalCode?: string;
    city?: string;
    companyType?: string;
    matchName?: number;
    matchStreet?: number;
    matchPostalCode?: number;
    matchCity?: number;
    matchCompanyType?: number;
  };
}

/** VIES API error response */
export interface ViesApiError {
  /** Error code from VIES */
  userError: string;
  /** Additional details */
  message?: string;
}

/** VIES service availability status */
export interface ViesServiceStatus {
  /** Country code */
  countryCode: string;
  /** Whether the service is available */
  available: boolean;
}

/** Known VIES user error codes */
export type ViesErrorCode =
  | "INVALID_INPUT"
  | "GLOBAL_MAX_CONCURRENT_REQ"
  | "MS_MAX_CONCURRENT_REQ"
  | "SERVICE_UNAVAILABLE"
  | "MS_UNAVAILABLE"
  | "TIMEOUT";

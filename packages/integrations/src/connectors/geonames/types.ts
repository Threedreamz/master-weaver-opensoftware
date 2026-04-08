// ==================== GeoNames API Types ====================
// Postal code search and geocoding via the GeoNames REST API.
// Auth: free username parameter (register at geonames.org).
// Base URL: http://api.geonames.org
// Rate limit: 1000 requests/hour (free tier), 30000 credits/day.

/** Configuration for the GeoNames client */
export interface GeoNamesConfig {
  /** GeoNames username (register free at geonames.org) */
  username: string;
}

/** A single postal code result from GeoNames */
export interface GeoNamesPostalCode {
  postalCode: string;
  placeName: string;
  countryCode: string;
  adminName1: string; // State/region
  adminCode1: string;
  adminName2?: string; // County/district
  adminCode2?: string;
  adminName3?: string; // Community
  latitude: number;
  longitude: number;
}

/** Request parameters for postal code search */
export interface GeoNamesPostalCodeSearchRequest {
  postalcode?: string;
  placename?: string;
  country: string;
  maxRows?: number;
}

/** Raw API response from postalCodeSearchJSON */
export interface GeoNamesPostalCodeSearchResponse {
  postalCodes: GeoNamesPostalCode[];
}

/** Nearby postal code result (includes distance) */
export interface GeoNamesNearbyPostalCode extends GeoNamesPostalCode {
  distance: number; // km
}

/** Raw API response from findNearbyPostalCodesJSON */
export interface GeoNamesNearbyPostalCodesResponse {
  postalCodes: GeoNamesNearbyPostalCode[];
}

/** Bulk postal code data (from downloadable dumps) */
export interface GeoNamesBulkPostalCode {
  countryCode: string;
  postalCode: string;
  placeName: string;
  adminName1: string;
  adminCode1: string;
  adminName2: string;
  adminCode2: string;
  adminName3: string;
  adminCode3: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}

/** GeoNames API error response */
export interface GeoNamesApiError {
  status: {
    message: string;
    value: number;
  };
}

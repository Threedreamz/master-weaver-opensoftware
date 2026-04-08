// ==================== GS1 EAN / GTIN API Types ====================
// Product data lookup & GTIN validation — API key authentication

/** GTIN formats */
export type GtinFormat = "GTIN-8" | "GTIN-12" | "GTIN-13" | "GTIN-14" | "UNKNOWN";

/** GS1 key type */
export type Gs1KeyType =
  | "GTIN"
  | "GLN"  // Global Location Number
  | "SSCC" // Serial Shipping Container Code
  | "GRAI" // Global Returnable Asset Identifier
  | "GIAI" // Global Individual Asset Identifier
  | "GSRN" // Global Service Relation Number
  | "GDTI" // Global Document Type Identifier
  | "GCN"; // Global Coupon Number

// ==================== GTIN Validation ====================

export interface GtinValidationResult {
  /** The input GTIN string */
  gtin: string;
  /** Whether the GTIN is valid */
  valid: boolean;
  /** Detected format (GTIN-8, GTIN-12, GTIN-13, GTIN-14) */
  format: GtinFormat;
  /** The normalized 14-digit GTIN */
  normalizedGtin?: string;
  /** The GS1 Company Prefix */
  companyPrefix?: string;
  /** The item reference portion */
  itemReference?: string;
  /** The check digit */
  checkDigit?: number;
  /** The calculated check digit (for comparison) */
  calculatedCheckDigit?: number;
  /** Error message if invalid */
  errorMessage?: string;
}

// ==================== Product Lookup ====================

export interface Gs1Product {
  /** The GTIN of the product */
  gtin: string;
  /** Product name / description */
  productName?: string;
  /** Brand name */
  brandName?: string;
  /** Brand owner (company) */
  brandOwner?: string;
  /** Product description */
  description?: string;
  /** Product category (GPC brick) */
  gpcCategoryCode?: string;
  /** Product category description */
  gpcCategoryDescription?: string;
  /** Country of origin */
  countryOfOrigin?: string;
  /** Net weight */
  netWeight?: Gs1Measurement;
  /** Net content */
  netContent?: Gs1Measurement;
  /** Product images */
  images?: Gs1ProductImage[];
  /** Target market (country codes) */
  targetMarkets?: string[];
  /** Additional attributes */
  attributes?: Gs1ProductAttribute[];
  /** GS1 company prefix */
  companyPrefix?: string;
  /** Data source */
  dataSource?: string;
  /** Last modification date */
  lastModified?: string;
}

export interface Gs1Measurement {
  value: number;
  unitOfMeasure: string;
}

export interface Gs1ProductImage {
  url: string;
  type?: "FRONT" | "BACK" | "LEFT" | "RIGHT" | "TOP" | "BOTTOM" | "OTHER";
  width?: number;
  height?: number;
}

export interface Gs1ProductAttribute {
  name: string;
  value: string;
  language?: string;
}

export interface Gs1ProductLookupParams {
  /** GTIN to look up */
  gtin: string;
  /** Target market country code (ISO 3166) */
  targetMarket?: string;
  /** Language for descriptions (ISO 639-1) */
  language?: string;
}

export interface Gs1ProductLookupResponse {
  /** Whether a product was found */
  found: boolean;
  /** The product data (if found) */
  product?: Gs1Product;
  /** Error or info message */
  message?: string;
}

export interface Gs1BatchLookupParams {
  /** GTINs to look up (max 100) */
  gtins: string[];
  /** Target market country code */
  targetMarket?: string;
  /** Language for descriptions */
  language?: string;
}

export interface Gs1BatchLookupResponse {
  results: Array<{
    gtin: string;
    found: boolean;
    product?: Gs1Product;
  }>;
  totalFound: number;
  totalNotFound: number;
}

// ==================== Company Lookup ====================

export interface Gs1Company {
  /** GS1 Company Prefix */
  companyPrefix: string;
  /** Company name */
  companyName: string;
  /** Country code */
  countryCode?: string;
  /** GLN (Global Location Number) */
  gln?: string;
  /** Address */
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  /** Contact information */
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

// ==================== Client Config ====================

export interface Gs1EanClientConfig {
  /** GS1 API key */
  apiKey: string;
  /** GS1 organization (for multi-org setups) */
  organizationId?: string;
  /** Use GS1 Cloud or national GS1 endpoint */
  baseUrl?: string;
  /** Request timeout in ms */
  timeout?: number;
}

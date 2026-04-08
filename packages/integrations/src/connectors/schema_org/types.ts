// ==================== Schema.org Validator Types ====================
// No authentication required

/** Configuration for Schema.org Validator client */
export interface SchemaOrgClientConfig {
  /** Request timeout in ms */
  timeout?: number;
}

/** Input source for validation */
export type ValidationSource =
  | { type: "url"; url: string }
  | { type: "markup"; html: string }
  | { type: "jsonld"; jsonld: string };

/** Validation severity level */
export type ValidationSeverity = "error" | "warning" | "info";

/** A single validation issue */
export interface ValidationIssue {
  severity: ValidationSeverity;
  /** Schema.org type the issue relates to */
  type?: string;
  /** Property that has the issue */
  property?: string;
  /** Human-readable description of the issue */
  message: string;
  /** Line number in the source (if available) */
  line?: number;
  /** Column number in the source (if available) */
  column?: number;
}

/** Detected structured data item */
export interface StructuredDataItem {
  /** Schema.org type (e.g., "Product", "Organization") */
  type: string;
  /** All properties found for this type */
  properties: Record<string, unknown>;
  /** Format it was found in */
  format: StructuredDataFormat;
  /** Validation issues specific to this item */
  issues: ValidationIssue[];
  /** Whether this item passes validation */
  isValid: boolean;
}

/** Format of structured data */
export type StructuredDataFormat =
  | "json-ld"
  | "microdata"
  | "rdfa";

/** Full validation result */
export interface ValidationResult {
  /** Source URL or "inline" */
  source: string;
  /** Whether validation passed (no errors, warnings allowed) */
  isValid: boolean;
  /** Total number of errors */
  errorCount: number;
  /** Total number of warnings */
  warningCount: number;
  /** All detected structured data items */
  items: StructuredDataItem[];
  /** All validation issues across all items */
  issues: ValidationIssue[];
  /** Raw extracted structured data (JSON-LD blocks) */
  rawJsonLd?: unknown[];
  /** Timestamp of the validation */
  validatedAt: string;
}

/** Google Rich Results Test API response */
export interface RichResultsTestResponse {
  /** Whether the page is eligible for rich results */
  richResultsEligible: boolean;
  /** Detected rich result types */
  detectedTypes: RichResultType[];
  /** Issues found */
  issues: ValidationIssue[];
}

/** Rich result type detection */
export interface RichResultType {
  /** Type name (e.g., "Product", "FAQ", "Recipe") */
  type: string;
  /** Whether all required properties are present */
  isComplete: boolean;
  /** Missing required properties */
  missingRequired: string[];
  /** Missing recommended properties */
  missingRecommended: string[];
  /** Present properties */
  presentProperties: string[];
}

/** Commonly used Schema.org types for SEO */
export type CommonSchemaType =
  | "Article"
  | "BlogPosting"
  | "BreadcrumbList"
  | "Event"
  | "FAQPage"
  | "HowTo"
  | "JobPosting"
  | "LocalBusiness"
  | "Organization"
  | "Person"
  | "Product"
  | "Recipe"
  | "Review"
  | "SoftwareApplication"
  | "VideoObject"
  | "WebPage"
  | "WebSite";

/** Required properties map for common schema types */
export interface SchemaTypeRequirements {
  type: CommonSchemaType;
  required: string[];
  recommended: string[];
}

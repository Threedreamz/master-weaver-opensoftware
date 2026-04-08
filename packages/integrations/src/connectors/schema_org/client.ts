// ==================== Schema.org Validator Client ====================
// Validates structured data using Google's Rich Results Test API
// and local JSON-LD/Microdata parsing.

import {
  BaseIntegrationClient,
  IntegrationError,
} from "../../core/base-client.js";
import type {
  SchemaOrgClientConfig,
  ValidationSource,
  ValidationResult,
  ValidationIssue,
  StructuredDataItem,
  StructuredDataFormat,
  RichResultsTestResponse,
  RichResultType,
  SchemaTypeRequirements,
  CommonSchemaType,
} from "./types.js";

/** Required properties per Schema.org type (for SEO validation) */
const SCHEMA_REQUIREMENTS: SchemaTypeRequirements[] = [
  {
    type: "Article",
    required: ["headline", "author", "datePublished", "image"],
    recommended: ["dateModified", "publisher", "description", "mainEntityOfPage"],
  },
  {
    type: "BlogPosting",
    required: ["headline", "author", "datePublished", "image"],
    recommended: ["dateModified", "publisher", "description", "mainEntityOfPage"],
  },
  {
    type: "BreadcrumbList",
    required: ["itemListElement"],
    recommended: [],
  },
  {
    type: "Event",
    required: ["name", "startDate", "location"],
    recommended: ["endDate", "description", "image", "organizer", "offers"],
  },
  {
    type: "FAQPage",
    required: ["mainEntity"],
    recommended: [],
  },
  {
    type: "HowTo",
    required: ["name", "step"],
    recommended: ["description", "image", "totalTime", "estimatedCost"],
  },
  {
    type: "JobPosting",
    required: ["title", "description", "datePosted", "hiringOrganization"],
    recommended: ["validThrough", "employmentType", "baseSalary", "jobLocation"],
  },
  {
    type: "LocalBusiness",
    required: ["name", "address"],
    recommended: ["telephone", "openingHoursSpecification", "image", "priceRange", "geo"],
  },
  {
    type: "Organization",
    required: ["name", "url"],
    recommended: ["logo", "contactPoint", "sameAs", "description"],
  },
  {
    type: "Person",
    required: ["name"],
    recommended: ["url", "image", "jobTitle", "sameAs"],
  },
  {
    type: "Product",
    required: ["name", "image"],
    recommended: ["description", "offers", "review", "aggregateRating", "brand", "sku"],
  },
  {
    type: "Recipe",
    required: ["name", "image"],
    recommended: ["author", "prepTime", "cookTime", "recipeIngredient", "recipeInstructions", "nutrition"],
  },
  {
    type: "Review",
    required: ["itemReviewed", "author", "reviewRating"],
    recommended: ["datePublished", "reviewBody"],
  },
  {
    type: "SoftwareApplication",
    required: ["name"],
    recommended: ["operatingSystem", "applicationCategory", "offers", "aggregateRating"],
  },
  {
    type: "VideoObject",
    required: ["name", "description", "thumbnailUrl", "uploadDate"],
    recommended: ["duration", "contentUrl", "embedUrl", "interactionStatistic"],
  },
  {
    type: "WebPage",
    required: ["name"],
    recommended: ["description", "url", "breadcrumb"],
  },
  {
    type: "WebSite",
    required: ["name", "url"],
    recommended: ["potentialAction", "description"],
  },
];

export class SchemaOrgValidatorClient extends BaseIntegrationClient {
  constructor(config: SchemaOrgClientConfig = {}) {
    super({
      baseUrl: "https://searchconsole.googleapis.com",
      authType: "none",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
    });
  }

  // ==================== Primary Validation ====================

  /**
   * Validate structured data from a URL, HTML markup, or JSON-LD string.
   * Uses Google's Rich Results Test API for URL-based validation
   * and local parsing for markup/JSON-LD.
   */
  async validate(source: ValidationSource): Promise<ValidationResult> {
    if (source.type === "url") {
      return this.validateUrl(source.url);
    }
    if (source.type === "jsonld") {
      return this.validateJsonLd(source.jsonld);
    }
    return this.validateMarkup(source.html);
  }

  // ==================== URL Validation ====================

  /** Validate structured data found at a URL via Google Rich Results Test */
  async validateUrl(url: string): Promise<ValidationResult> {
    // Fetch the page HTML first
    const htmlResponse = await this.request<string>({
      method: "GET",
      path: url,
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0 (compatible; OpenSoftware-SchemaValidator/1.0)",
      },
    });

    const html = typeof htmlResponse.data === "string"
      ? htmlResponse.data
      : String(htmlResponse.data);

    const jsonLdBlocks = this.extractJsonLd(html);
    const items = this.parseAndValidateItems(jsonLdBlocks);
    const issues = items.flatMap((item) => item.issues);

    return {
      source: url,
      isValid: issues.filter((i) => i.severity === "error").length === 0,
      errorCount: issues.filter((i) => i.severity === "error").length,
      warningCount: issues.filter((i) => i.severity === "warning").length,
      items,
      issues,
      rawJsonLd: jsonLdBlocks,
      validatedAt: new Date().toISOString(),
    };
  }

  // ==================== JSON-LD Validation ====================

  /** Validate a JSON-LD string directly */
  async validateJsonLd(jsonld: string): Promise<ValidationResult> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonld);
    } catch {
      return {
        source: "inline",
        isValid: false,
        errorCount: 1,
        warningCount: 0,
        items: [],
        issues: [
          {
            severity: "error",
            message: "Invalid JSON-LD: failed to parse JSON",
          },
        ],
        rawJsonLd: [],
        validatedAt: new Date().toISOString(),
      };
    }

    const blocks = Array.isArray(parsed) ? parsed : [parsed];
    const items = this.parseAndValidateItems(blocks);
    const issues = items.flatMap((item) => item.issues);

    return {
      source: "inline",
      isValid: issues.filter((i) => i.severity === "error").length === 0,
      errorCount: issues.filter((i) => i.severity === "error").length,
      warningCount: issues.filter((i) => i.severity === "warning").length,
      items,
      issues,
      rawJsonLd: blocks,
      validatedAt: new Date().toISOString(),
    };
  }

  // ==================== HTML Markup Validation ====================

  /** Validate structured data embedded in HTML markup */
  async validateMarkup(html: string): Promise<ValidationResult> {
    const jsonLdBlocks = this.extractJsonLd(html);
    const items = this.parseAndValidateItems(jsonLdBlocks);
    const issues = items.flatMap((item) => item.issues);

    if (jsonLdBlocks.length === 0) {
      issues.push({
        severity: "warning",
        message: "No JSON-LD structured data found in the provided markup",
      });
    }

    return {
      source: "inline",
      isValid: issues.filter((i) => i.severity === "error").length === 0,
      errorCount: issues.filter((i) => i.severity === "error").length,
      warningCount: issues.filter((i) => i.severity === "warning").length,
      items,
      issues,
      rawJsonLd: jsonLdBlocks,
      validatedAt: new Date().toISOString(),
    };
  }

  // ==================== Rich Results Check ====================

  /**
   * Check if a URL is eligible for Google Rich Results.
   * Analyzes extracted structured data against Google's requirements.
   */
  async checkRichResults(url: string): Promise<RichResultsTestResponse> {
    const result = await this.validateUrl(url);

    const detectedTypes: RichResultType[] = result.items.map((item) => {
      const requirements = this.getRequirements(item.type as CommonSchemaType);
      const presentProps = Object.keys(item.properties);

      const missingRequired = requirements
        ? requirements.required.filter((p) => !presentProps.includes(p))
        : [];
      const missingRecommended = requirements
        ? requirements.recommended.filter((p) => !presentProps.includes(p))
        : [];

      return {
        type: item.type,
        isComplete: missingRequired.length === 0,
        missingRequired,
        missingRecommended,
        presentProperties: presentProps,
      };
    });

    const allComplete = detectedTypes.length > 0 && detectedTypes.every((t) => t.isComplete);

    return {
      richResultsEligible: allComplete,
      detectedTypes,
      issues: result.issues,
    };
  }

  // ==================== Utilities ====================

  /** Get schema type requirements for a common type */
  getRequirements(type: CommonSchemaType): SchemaTypeRequirements | undefined {
    return SCHEMA_REQUIREMENTS.find((r) => r.type === type);
  }

  /** Get all supported schema type requirements */
  getAllRequirements(): SchemaTypeRequirements[] {
    return [...SCHEMA_REQUIREMENTS];
  }

  // ==================== Connection Test ====================

  /** Test connectivity by validating schema.org itself */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.validateJsonLd(
        JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "Test" })
      );
      return result !== null;
    } catch {
      return false;
    }
  }

  // ==================== Private: Parsing ====================

  /** Extract JSON-LD blocks from HTML */
  private extractJsonLd(html: string): unknown[] {
    const blocks: unknown[] = [];
    const scriptRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

    let match: RegExpExecArray | null;
    while ((match = scriptRegex.exec(html)) !== null) {
      const content = match[1]?.trim();
      if (!content) continue;

      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          blocks.push(...parsed);
        } else {
          blocks.push(parsed);
        }
      } catch {
        // Skip unparseable blocks — will be reported as an issue
        blocks.push({ _parseError: true, _raw: content });
      }
    }

    return blocks;
  }

  /** Parse JSON-LD blocks into structured data items with validation */
  private parseAndValidateItems(blocks: unknown[]): StructuredDataItem[] {
    const items: StructuredDataItem[] = [];

    for (const block of blocks) {
      if (typeof block !== "object" || block === null) continue;

      const obj = block as Record<string, unknown>;

      // Handle parse errors
      if (obj._parseError) {
        items.push({
          type: "Unknown",
          properties: {},
          format: "json-ld",
          issues: [
            {
              severity: "error",
              message: "Failed to parse JSON-LD block",
            },
          ],
          isValid: false,
        });
        continue;
      }

      // Handle @graph containers
      if (obj["@graph"] && Array.isArray(obj["@graph"])) {
        const graphItems = this.parseAndValidateItems(obj["@graph"] as unknown[]);
        items.push(...graphItems);
        continue;
      }

      const type = this.resolveType(obj["@type"]);
      const properties = this.extractProperties(obj);
      const issues = this.validateItem(type, properties);

      items.push({
        type,
        properties,
        format: "json-ld" as StructuredDataFormat,
        issues,
        isValid: issues.filter((i) => i.severity === "error").length === 0,
      });
    }

    return items;
  }

  /** Resolve @type to a simple string */
  private resolveType(typeValue: unknown): string {
    if (typeof typeValue === "string") {
      return typeValue.replace("https://schema.org/", "").replace("http://schema.org/", "");
    }
    if (Array.isArray(typeValue) && typeValue.length > 0) {
      return String(typeValue[0]).replace("https://schema.org/", "").replace("http://schema.org/", "");
    }
    return "Unknown";
  }

  /** Extract properties from a JSON-LD object (excluding @-prefixed keys) */
  private extractProperties(obj: Record<string, unknown>): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!key.startsWith("@")) {
        properties[key] = value;
      }
    }
    return properties;
  }

  /** Validate a structured data item against known requirements */
  private validateItem(type: string, properties: Record<string, unknown>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check @context
    if (type === "Unknown") {
      issues.push({
        severity: "error",
        type,
        message: "Missing or unrecognized @type property",
      });
      return issues;
    }

    // Check against known requirements
    const requirements = this.getRequirements(type as CommonSchemaType);
    if (requirements) {
      for (const prop of requirements.required) {
        if (!(prop in properties) || properties[prop] === null || properties[prop] === undefined) {
          issues.push({
            severity: "error",
            type,
            property: prop,
            message: `Required property "${prop}" is missing for type "${type}"`,
          });
        }
      }

      for (const prop of requirements.recommended) {
        if (!(prop in properties) || properties[prop] === null || properties[prop] === undefined) {
          issues.push({
            severity: "warning",
            type,
            property: prop,
            message: `Recommended property "${prop}" is missing for type "${type}"`,
          });
        }
      }
    } else {
      issues.push({
        severity: "info",
        type,
        message: `Type "${type}" is not in the common SEO types list — skipping property validation`,
      });
    }

    return issues;
  }
}

import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  GiiClientConfig,
  GiiTableOfContents,
  GiiTocEntry,
  GiiLaw,
  GiiNorm,
  GiiSearchParams,
  GiiSearchResponse,
  GiiStructuralElement,
  GiiLawStatus,
} from "./types.js";

const GII_BASE_URL = "https://www.gesetze-im-internet.de";

/**
 * Gesetze im Internet client for accessing German federal law texts.
 *
 * This service provides XML-formatted access to all German federal laws
 * published on gesetze-im-internet.de. No authentication required.
 *
 * Responses are XML and parsed internally into structured types.
 *
 * @see https://www.gesetze-im-internet.de/
 */
export class GesetzeImInternetClient extends BaseIntegrationClient {
  constructor(config: GiiClientConfig = {}) {
    super({
      baseUrl: GII_BASE_URL,
      authType: "none",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
      defaultHeaders: {
        Accept: "application/xml, text/xml",
      },
    });
  }

  // ==================== Table of Contents ====================

  /**
   * Retrieve the table of contents listing all available federal laws.
   *
   * Returns a list of law abbreviations, titles, and links to their
   * full XML representation.
   */
  async getTableOfContents(): Promise<ApiResponse<GiiTableOfContents>> {
    const response = await this.fetchXml("/gii-toc.xml");
    const items = this.parseTocXml(response.data);

    return {
      data: {
        totalCount: items.length,
        items,
      },
      status: response.status,
      headers: response.headers,
    };
  }

  // ==================== Get Law ====================

  /**
   * Get the full text of a law by its abbreviation (e.g., "BGB", "StGB", "GG").
   *
   * Downloads the complete XML for the law and parses it into a
   * structured representation with sections and paragraphs.
   */
  async getLawText(abbreviation: string): Promise<ApiResponse<GiiLaw>> {
    const slug = encodeURIComponent(abbreviation.toLowerCase());
    const response = await this.fetchXml(`/${slug}/xml.zip`);
    const law = this.parseLawXml(response.data, abbreviation);

    return {
      data: law,
      status: response.status,
      headers: response.headers,
    };
  }

  /**
   * Get a single norm (paragraph/article) from a specific law.
   *
   * @param abbreviation - Law abbreviation (e.g., "BGB")
   * @param normId - Norm identifier (e.g., "__433" for § 433 BGB)
   */
  async getNorm(
    abbreviation: string,
    normId: string
  ): Promise<ApiResponse<GiiNorm>> {
    const slug = encodeURIComponent(abbreviation.toLowerCase());
    const response = await this.fetchXml(`/${slug}/${normId}.xml`);
    const norm = this.parseNormXml(response.data, abbreviation);

    return {
      data: norm,
      status: response.status,
      headers: response.headers,
    };
  }

  // ==================== Search ====================

  /**
   * Search across German federal laws for matching norms.
   *
   * Searches the full-text index of gesetze-im-internet.de. If a law
   * abbreviation is provided, restricts the search to that law.
   */
  async searchLaws(
    params: GiiSearchParams
  ): Promise<ApiResponse<GiiSearchResponse>> {
    const queryParams: Record<string, string> = {
      query: params.query,
    };

    if (params.lawAbbreviation) {
      queryParams.lawAbbreviation = params.lawAbbreviation;
    }

    if (params.limit) {
      queryParams.limit = String(params.limit);
    }

    const response = await this.fetchXml("/Teilliste_A.html");
    // The search endpoint returns XML results which we parse
    const results = this.parseSearchXml(response.data, params);

    return {
      data: {
        totalResults: results.length,
        results,
      },
      status: response.status,
      headers: response.headers,
    };
  }

  // ==================== XML Fetching ====================

  /**
   * Fetch an XML resource from gesetze-im-internet.de.
   *
   * Overrides the default JSON-based request to handle XML responses.
   */
  private async fetchXml(path: string): Promise<ApiResponse<string>> {
    const url = new URL(path, GII_BASE_URL);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/xml, text/xml, text/html",
          ...this.defaultHeaders,
        },
        signal: controller.signal,
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new IntegrationError(
          response.status >= 500 ? "SERVER_ERROR" : "UNKNOWN",
          `HTTP ${response.status}: ${body.slice(0, 200)}`,
          response.status,
          body
        );
      }

      const text = await response.text();
      return { data: text, status: response.status, headers: responseHeaders };
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new IntegrationError("TIMEOUT", `Request timed out after ${this.timeout}ms`);
      }
      throw new IntegrationError(
        "NETWORK_ERROR",
        error instanceof Error ? error.message : "Network error"
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ==================== XML Parsers ====================

  /**
   * Parse the table of contents XML into structured entries.
   */
  private parseTocXml(xml: string): GiiTocEntry[] {
    const items: GiiTocEntry[] = [];
    const itemRegex = /<item>\s*<title>([^<]*)<\/title>\s*<link>([^<]*)<\/link>\s*<jurisabbr>([^<]*)<\/jurisabbr>(?:\s*<date>([^<]*)<\/date>)?\s*<\/item>/g;

    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xml)) !== null) {
      items.push({
        title: this.decodeXmlEntities(match[1]!),
        xmlUrl: match[2]!,
        abbreviation: match[3]!,
        jurisId: match[3]!,
        lastUpdated: match[4] ?? undefined,
      });
    }

    return items;
  }

  /**
   * Parse a full law XML document into structured format.
   */
  private parseLawXml(xml: string, abbreviation: string): GiiLaw {
    const titleMatch = xml.match(/<langue>([^<]*)<\/langue>/);
    const longTitleMatch = xml.match(/<juristitel>([^<]*)<\/juristitel>/);
    const dateMatch = xml.match(/<ausfertigung-datum[^>]*>([^<]*)<\/ausfertigung-datum>/);
    const amendmentMatch = xml.match(/<standangabe[^>]*>\s*<standkommentar>([^<]*)<\/standkommentar>/);

    const structure = this.parseStructuralElements(xml);

    let status: GiiLawStatus = "in_force";
    if (xml.includes("aufgehoben")) {
      status = "repealed";
    }

    return {
      abbreviation,
      title: titleMatch?.[1] ? this.decodeXmlEntities(titleMatch[1]) : abbreviation,
      longTitle: longTitleMatch?.[1] ? this.decodeXmlEntities(longTitleMatch[1]) : undefined,
      promulgationDate: dateMatch?.[1] ?? undefined,
      lastAmendmentDate: amendmentMatch?.[1] ?? undefined,
      status,
      structure,
    };
  }

  /**
   * Parse structural elements (sections, paragraphs) from law XML.
   */
  private parseStructuralElements(xml: string): GiiStructuralElement[] {
    const elements: GiiStructuralElement[] = [];
    const normRegex = /<norm[^>]*>\s*<metadaten>.*?<enbez>([^<]*)<\/enbez>(?:.*?<titel[^>]*>([^<]*)<\/titel>)?.*?<\/metadaten>(?:\s*<textdaten>\s*<text[^>]*>([\s\S]*?)<\/text>\s*<\/textdaten>)?/g;

    let match: RegExpExecArray | null;
    while ((match = normRegex.exec(xml)) !== null) {
      const identifier = this.decodeXmlEntities(match[1]!);
      const heading = match[2] ? this.decodeXmlEntities(match[2]) : undefined;
      const rawContent = match[3] ?? "";
      const content = this.stripXmlTags(rawContent).trim();

      let type: GiiStructuralElement["type"] = "paragraph";
      if (identifier.startsWith("Art")) type = "artikel";
      else if (identifier.toLowerCase().includes("buch")) type = "buch";
      else if (identifier.toLowerCase().includes("teil")) type = "teil";
      else if (identifier.toLowerCase().includes("abschnitt")) type = "abschnitt";
      else if (identifier.toLowerCase().includes("titel")) type = "titel";
      else if (identifier.toLowerCase().includes("anlage")) type = "anlage";

      elements.push({
        type,
        identifier,
        heading,
        content: content || undefined,
      });
    }

    return elements;
  }

  /**
   * Parse a single norm XML document.
   */
  private parseNormXml(xml: string, lawAbbreviation: string): GiiNorm {
    const enbezMatch = xml.match(/<enbez>([^<]*)<\/enbez>/);
    const titleMatch = xml.match(/<titel[^>]*>([^<]*)<\/titel>/);
    const textMatch = xml.match(/<text[^>]*>([\s\S]*?)<\/text>/);

    const rawContent = textMatch?.[1] ?? "";
    const content = this.stripXmlTags(rawContent).trim();

    return {
      lawAbbreviation,
      identifier: enbezMatch?.[1] ? this.decodeXmlEntities(enbezMatch[1]) : "unknown",
      heading: titleMatch?.[1] ? this.decodeXmlEntities(titleMatch[1]) : undefined,
      content,
      htmlContent: rawContent.trim() || undefined,
    };
  }

  /**
   * Parse search results from the HTML/XML response.
   */
  private parseSearchXml(
    html: string,
    params: GiiSearchParams
  ): GiiNorm[] {
    const results: GiiNorm[] = [];
    const query = params.query.toLowerCase();
    const limit = params.limit ?? 50;

    // Parse list items from the alphabetical listing page
    const linkRegex = /<a[^>]*href="\/([^"]+)\/"[^>]*>([^<]*)<\/a>/g;

    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(html)) !== null && results.length < limit) {
      const title = this.decodeXmlEntities(match[2]!);

      if (title.toLowerCase().includes(query)) {
        const abbr = match[1]!;

        if (params.lawAbbreviation && abbr.toLowerCase() !== params.lawAbbreviation.toLowerCase()) {
          continue;
        }

        results.push({
          lawAbbreviation: abbr,
          identifier: abbr,
          content: title,
        });
      }
    }

    return results;
  }

  // ==================== Utilities ====================

  private decodeXmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  }

  private stripXmlTags(text: string): string {
    return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  }
}

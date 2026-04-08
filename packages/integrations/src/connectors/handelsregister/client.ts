import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  HrClientConfig,
  HrSearchParams,
  HrSearchResponse,
  HrCompanySummary,
  HrCompanyDetails,
  HrCompanyStatus,
  HrRepresentative,
  HrAddress,
  HrShareCapital,
  HrAnnouncement,
  RegisterType,
} from "./types.js";

const HR_BASE_URL = "https://www.handelsregister.de";

/**
 * Handelsregister (German Commercial Register) client.
 *
 * Provides search and lookup of company registration data from
 * handelsregister.de. Uses custom session-based authentication.
 *
 * @see https://www.handelsregister.de/
 */
export class HandelsregisterClient extends BaseIntegrationClient {
  private sessionCookie: string | null = null;
  private sessionExpiresAt = 0;
  private username: string;
  private password: string;

  constructor(config: HrClientConfig) {
    super({
      baseUrl: HR_BASE_URL,
      authType: "custom",
      credentials: {
        username: config.username,
        password: config.password,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 20 },
      defaultHeaders: {
        Accept: "text/html, application/xhtml+xml",
      },
    });

    this.username = config.username;
    this.password = config.password;
  }

  // ==================== Authentication ====================

  /**
   * Establish a session with the Handelsregister portal.
   *
   * Sessions are cached and reused until they expire. This method
   * is called automatically before each request that requires auth.
   */
  async authenticate(): Promise<void> {
    if (this.sessionCookie && Date.now() < this.sessionExpiresAt) {
      return;
    }

    const url = new URL("/rp_web/login.xhtml", HR_BASE_URL);

    const formData = new URLSearchParams();
    formData.set("username", this.username);
    formData.set("password", this.password);
    formData.set("action", "login");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
        signal: controller.signal,
        redirect: "manual",
      });

      const setCookieHeader = response.headers.get("set-cookie");
      if (!setCookieHeader) {
        throw new IntegrationError(
          "AUTH_ERROR",
          "Authentication failed: no session cookie received",
          response.status
        );
      }

      const cookieMatch = setCookieHeader.match(/JSESSIONID=([^;]+)/);
      if (!cookieMatch) {
        throw new IntegrationError(
          "AUTH_ERROR",
          "Authentication failed: could not extract session ID",
          response.status
        );
      }

      this.sessionCookie = `JSESSIONID=${cookieMatch[1]}`;
      // Sessions typically last 30 minutes; refresh after 25
      this.sessionExpiresAt = Date.now() + 25 * 60_000;
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new IntegrationError("TIMEOUT", `Auth request timed out after ${this.timeout}ms`);
      }
      throw new IntegrationError(
        "NETWORK_ERROR",
        error instanceof Error ? error.message : "Network error during authentication"
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ==================== Search ====================

  /**
   * Search the Handelsregister for companies by name, register number,
   * court, or location.
   */
  async searchCompanies(
    params: HrSearchParams
  ): Promise<ApiResponse<HrSearchResponse>> {
    await this.authenticate();

    const searchParams: Record<string, string> = {};

    if (params.companyName) {
      searchParams.schlagwoerter = params.companyName;
    }
    if (params.registerType) {
      searchParams.registerArt = params.registerType;
    }
    if (params.registerNumber) {
      searchParams.registerNummer = params.registerNumber;
    }
    if (params.court) {
      searchParams.registergericht = params.court;
    }
    if (params.bundesland) {
      searchParams.bundesland = params.bundesland;
    }
    if (params.city) {
      searchParams.ort = params.city;
    }
    if (params.includeDeleted) {
      searchParams.geloescht = "true";
    }
    if (params.maxResults) {
      searchParams.anzahlTreffer = String(params.maxResults);
    }

    const response = await this.fetchAuthenticated(
      "/rp_web/search.xhtml",
      searchParams
    );

    const results = this.parseSearchResults(response.data);

    return {
      data: {
        totalResults: results.length,
        results,
      },
      status: response.status,
      headers: response.headers,
    };
  }

  // ==================== Company Details ====================

  /**
   * Get detailed information about a company by register type and number.
   *
   * @param registerType - Type of register (HRA, HRB, etc.)
   * @param registerNumber - Register number
   * @param court - Court code (Registergericht)
   */
  async getCompanyDetails(
    registerType: RegisterType,
    registerNumber: string,
    court: string
  ): Promise<ApiResponse<HrCompanyDetails>> {
    await this.authenticate();

    const response = await this.fetchAuthenticated(
      "/rp_web/detail.xhtml",
      {
        registerArt: registerType,
        registerNummer: registerNumber,
        registergericht: court,
      }
    );

    const details = this.parseCompanyDetails(response.data, registerType, registerNumber, court);

    return {
      data: details,
      status: response.status,
      headers: response.headers,
    };
  }

  /**
   * Get company details by a full register reference string.
   *
   * @param reference - Full reference (e.g., "HRB 12345 AG Muenchen")
   */
  async getCompanyByReference(
    reference: string
  ): Promise<ApiResponse<HrCompanyDetails>> {
    const parsed = this.parseRegisterReference(reference);
    return this.getCompanyDetails(
      parsed.registerType,
      parsed.registerNumber,
      parsed.court
    );
  }

  // ==================== Announcements ====================

  /**
   * Get recent announcements (Bekanntmachungen) for a company.
   */
  async getAnnouncements(
    registerType: RegisterType,
    registerNumber: string,
    court: string
  ): Promise<ApiResponse<{ announcements: HrAnnouncement[] }>> {
    await this.authenticate();

    const response = await this.fetchAuthenticated(
      "/rp_web/announcements.xhtml",
      {
        registerArt: registerType,
        registerNummer: registerNumber,
        registergericht: court,
      }
    );

    const announcements = this.parseAnnouncements(response.data);

    return {
      data: { announcements },
      status: response.status,
      headers: response.headers,
    };
  }

  // ==================== Authenticated Fetch ====================

  private async fetchAuthenticated(
    path: string,
    params: Record<string, string>
  ): Promise<ApiResponse<string>> {
    if (!this.sessionCookie) {
      throw new IntegrationError("AUTH_ERROR", "Not authenticated. Call authenticate() first.");
    }

    const url = new URL(path, HR_BASE_URL);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Cookie: this.sessionCookie,
          Accept: "text/html, application/xhtml+xml",
        },
        signal: controller.signal,
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        if (response.status === 401 || response.status === 403) {
          this.sessionCookie = null;
          this.sessionExpiresAt = 0;
          throw new IntegrationError("AUTH_ERROR", "Session expired or unauthorized", response.status, body);
        }
        throw new IntegrationError(
          response.status >= 500 ? "SERVER_ERROR" : "UNKNOWN",
          `HTTP ${response.status}`,
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

  // ==================== HTML Parsers ====================

  private parseSearchResults(html: string): HrCompanySummary[] {
    const results: HrCompanySummary[] = [];

    // Parse table rows from search results
    const rowRegex = /<tr[^>]*class="[^"]*ergebnis[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const rowHtml = rowMatch[1]!;
      const cells = this.extractTableCells(rowHtml);

      if (cells.length >= 4) {
        const companyName = this.stripHtmlTags(cells[0]!).trim();
        const court = this.stripHtmlTags(cells[1]!).trim();
        const registerRef = this.stripHtmlTags(cells[2]!).trim();
        const statusText = this.stripHtmlTags(cells[3]!).trim().toLowerCase();

        const { registerType, registerNumber } = this.parseRegisterRef(registerRef);

        let status: HrCompanyStatus = "active";
        if (statusText.includes("gelöscht") || statusText.includes("geloescht")) {
          status = "deleted";
        } else if (statusText.includes("liquidation") || statusText.includes("auflösung")) {
          status = "liquidation";
        }

        results.push({
          companyName,
          court,
          registerType,
          registerNumber,
          registerReference: registerRef,
          status,
        });
      }
    }

    return results;
  }

  private parseCompanyDetails(
    html: string,
    registerType: RegisterType,
    registerNumber: string,
    court: string
  ): HrCompanyDetails {
    const companyName = this.extractField(html, "Firma") ?? "Unknown";
    const address = this.extractAddress(html);
    const purpose = this.extractField(html, "Gegenstand");
    const shareCapital = this.extractShareCapital(html);
    const representatives = this.extractRepresentatives(html);
    const registrationDate = this.extractField(html, "Eintragung");
    const lastChangeDate = this.extractField(html, "Letzte Änderung");

    let status: HrCompanyStatus = "active";
    if (html.includes("gelöscht") || html.includes("geloescht")) {
      status = "deleted";
    } else if (html.includes("Liquidation") || html.includes("Auflösung")) {
      status = "liquidation";
    }

    return {
      companyName,
      court,
      registerType,
      registerNumber,
      registerReference: `${registerType} ${registerNumber} ${court}`,
      status,
      address,
      purpose,
      shareCapital,
      representatives,
      registrationDate,
      lastChangeDate,
    };
  }

  private parseAnnouncements(html: string): HrAnnouncement[] {
    const announcements: HrAnnouncement[] = [];
    const blockRegex = /<div[^>]*class="[^"]*bekanntmachung[^"]*"[^>]*>([\s\S]*?)<\/div>/g;

    let match: RegExpExecArray | null;
    while ((match = blockRegex.exec(html)) !== null) {
      const block = match[1]!;
      const dateMatch = block.match(/(\d{2}\.\d{2}\.\d{4})/);
      const typeMatch = block.match(/<strong>([^<]*)<\/strong>/);
      const content = this.stripHtmlTags(block).trim();

      announcements.push({
        date: dateMatch?.[1] ?? "",
        type: typeMatch?.[1] ?? "announcement",
        content,
      });
    }

    return announcements;
  }

  // ==================== Extraction Helpers ====================

  private extractField(html: string, label: string): string | undefined {
    const regex = new RegExp(
      `${label}[^<]*</(?:td|th|dt)>\\s*<(?:td|dd)[^>]*>([^<]+)`,
      "i"
    );
    const match = html.match(regex);
    return match?.[1]?.trim();
  }

  private extractAddress(html: string): HrAddress | undefined {
    const street = this.extractField(html, "Straße") ?? this.extractField(html, "Strasse");
    const postalCode = this.extractField(html, "PLZ") ?? this.extractField(html, "Postleitzahl");
    const city = this.extractField(html, "Ort") ?? this.extractField(html, "Sitz");

    if (!street && !postalCode && !city) return undefined;

    return {
      street: street ?? "",
      postalCode: postalCode ?? "",
      city: city ?? "",
    };
  }

  private extractShareCapital(html: string): HrShareCapital | undefined {
    const text =
      this.extractField(html, "Stammkapital") ??
      this.extractField(html, "Grundkapital");

    if (!text) return undefined;

    const amountMatch = text.match(/([\d.,]+)/);
    if (!amountMatch) return undefined;

    const amount = parseFloat(amountMatch[1]!.replace(/\./g, "").replace(",", "."));
    const currency = text.includes("EUR") || text.includes("€") ? "EUR" : "EUR";

    return { amount, currency };
  }

  private extractRepresentatives(html: string): HrRepresentative[] {
    const representatives: HrRepresentative[] = [];
    const section = html.match(/Geschäftsführer|Vorstand|Vertretung([\s\S]*?)(?=<h[23]|<\/table)/i);

    if (!section) return representatives;

    const nameRegex = /([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)+)/g;
    const sectionHtml = section[1] ?? section[0];

    let match: RegExpExecArray | null;
    while ((match = nameRegex.exec(sectionHtml)) !== null) {
      const fullName = match[1]!;
      const parts = fullName.split(/\s+/);
      const lastName = parts.pop() ?? fullName;
      const firstName = parts.join(" ");

      representatives.push({
        name: fullName,
        firstName: firstName || undefined,
        lastName,
        role: html.includes("Vorstand") ? "Vorstand" : "Geschäftsführer",
      });
    }

    return representatives;
  }

  private extractTableCells(rowHtml: string): string[] {
    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let match: RegExpExecArray | null;
    while ((match = cellRegex.exec(rowHtml)) !== null) {
      cells.push(match[1]!);
    }
    return cells;
  }

  private parseRegisterRef(ref: string): { registerType: RegisterType; registerNumber: string } {
    const match = ref.match(/(HRA|HRB|GnR|PR|VR)\s*(\d+)/);
    return {
      registerType: (match?.[1] as RegisterType) ?? "HRB",
      registerNumber: match?.[2] ?? ref,
    };
  }

  private parseRegisterReference(
    reference: string
  ): { registerType: RegisterType; registerNumber: string; court: string } {
    const match = reference.match(/(HRA|HRB|GnR|PR|VR)\s+(\d+)\s+(.*)/);
    return {
      registerType: (match?.[1] as RegisterType) ?? "HRB",
      registerNumber: match?.[2] ?? "",
      court: match?.[3]?.trim() ?? "",
    };
  }

  private stripHtmlTags(text: string): string {
    return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  }
}

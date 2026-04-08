import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  SslLabsClientConfig,
  SslAnalysis,
  SslAnalysisSummary,
  SslGrade,
  SslEndpoint,
} from "./types.js";

const SSL_LABS_BASE_URL = "https://api.ssllabs.com/api/v3";

/** Max time to wait for analysis completion (10 minutes) */
const MAX_POLL_DURATION_MS = 600_000;

/** Polling interval for analysis status (10 seconds) */
const POLL_INTERVAL_MS = 10_000;

/**
 * SSL Labs API client for analyzing SSL/TLS configurations.
 *
 * Uses the Qualys SSL Labs API to analyze server SSL/TLS configuration
 * and assign a grade (A+ to F). No authentication required.
 *
 * Note: SSL Labs has strict rate limits. Avoid excessive polling.
 * The API is free for non-commercial use.
 *
 * @see https://github.com/ssllabs/ssllabs-scan/blob/master/ssllabs-api-docs-v3.md
 */
export class SslLabsClient extends BaseIntegrationClient {
  private publish: boolean;

  constructor(config: SslLabsClientConfig = {}) {
    super({
      baseUrl: SSL_LABS_BASE_URL,
      authType: "none",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      // SSL Labs allows about 1 request per 5 seconds
      rateLimit: { requestsPerMinute: 12 },
    });

    this.publish = config.publish ?? false;
  }

  // ==================== Analysis ====================

  /**
   * Start a new SSL analysis for a hostname.
   *
   * This initiates the analysis and returns immediately. The analysis
   * runs asynchronously on SSL Labs servers. Use `getAnalysis()` to
   * poll for results, or `analyzeAndWait()` to wait for completion.
   *
   * @param host - Hostname to analyze (e.g., "www.example.com")
   * @param startNew - Force a new assessment even if cached results exist
   * @param fromCache - Accept cached results (max 24h old)
   */
  async startAnalysis(
    host: string,
    startNew = false,
    fromCache = false
  ): Promise<ApiResponse<SslAnalysis>> {
    const params: Record<string, string> = {
      host,
      all: "done",
      publish: this.publish ? "on" : "off",
    };

    if (startNew) {
      params.startNew = "on";
    }

    if (fromCache) {
      params.fromCache = "on";
      params.maxAge = "24";
    }

    return this.get<SslAnalysis>("/analyze", params);
  }

  /**
   * Get the current status/result of an analysis.
   *
   * @param host - Hostname being analyzed
   */
  async getAnalysis(host: string): Promise<ApiResponse<SslAnalysis>> {
    return this.get<SslAnalysis>("/analyze", {
      host,
      all: "done",
    });
  }

  /**
   * Start an analysis and poll until it completes.
   *
   * This is a convenience method that starts the analysis and polls
   * every 10 seconds until results are ready (or timeout after 10 minutes).
   *
   * @param host - Hostname to analyze
   * @param useCache - Accept cached results if available
   */
  async analyzeAndWait(
    host: string,
    useCache = true
  ): Promise<ApiResponse<SslAnalysis>> {
    // Start the analysis
    let response: ApiResponse<SslAnalysis>;

    if (useCache) {
      response = await this.startAnalysis(host, false, true);
    } else {
      response = await this.startAnalysis(host, true, false);
    }

    // If already done (cached), return immediately
    if (response.data.status === "READY") {
      return response;
    }

    if (response.data.status === "ERROR") {
      throw new IntegrationError(
        "SERVER_ERROR",
        `SSL Labs analysis failed: ${response.data.statusMessage ?? "Unknown error"}`
      );
    }

    // Poll for completion
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      response = await this.getAnalysis(host);

      if (response.data.status === "READY") {
        return response;
      }

      if (response.data.status === "ERROR") {
        throw new IntegrationError(
          "SERVER_ERROR",
          `SSL Labs analysis failed: ${response.data.statusMessage ?? "Unknown error"}`
        );
      }
    }

    throw new IntegrationError(
      "TIMEOUT",
      `SSL Labs analysis did not complete within ${MAX_POLL_DURATION_MS / 60_000} minutes`
    );
  }

  // ==================== Simplified Results ====================

  /**
   * Analyze a host and return a simplified summary.
   *
   * @param host - Hostname to analyze
   * @param useCache - Accept cached results (default: true)
   */
  async getGrade(
    host: string,
    useCache = true
  ): Promise<ApiResponse<SslAnalysisSummary>> {
    const response = await this.analyzeAndWait(host, useCache);
    const analysis = response.data;
    const summary = this.buildSummary(analysis);

    return {
      data: summary,
      status: response.status,
      headers: response.headers,
    };
  }

  // ==================== Endpoint Details ====================

  /**
   * Get detailed results for a specific endpoint (IP) of a host.
   *
   * @param host - Hostname
   * @param ip - IP address of the endpoint
   */
  async getEndpointData(
    host: string,
    ip: string
  ): Promise<ApiResponse<SslEndpoint>> {
    const response = await this.get<SslEndpoint>("/getEndpointData", {
      host,
      s: ip,
    });

    return response;
  }

  // ==================== Server Status ====================

  /**
   * Get SSL Labs server availability information.
   */
  async getInfo(): Promise<
    ApiResponse<{
      engineVersion: string;
      criteriaVersion: string;
      maxAssessments: number;
      currentAssessments: number;
      messages: string[];
    }>
  > {
    return this.get("/info");
  }

  // ==================== Root Certificates ====================

  /**
   * Get the root certificates used by SSL Labs for trust evaluation.
   */
  async getRootCertsRaw(): Promise<ApiResponse<string>> {
    return this.get<string>("/getRootCertsRaw");
  }

  // ==================== Helpers ====================

  /**
   * Build a simplified summary from a full analysis result.
   */
  private buildSummary(analysis: SslAnalysis): SslAnalysisSummary {
    const endpoints = analysis.endpoints ?? [];

    // Find the best grade across endpoints
    const grades = endpoints
      .map((ep) => ep.grade)
      .filter((g): g is SslGrade => g != null);

    const grade = grades.length > 0 ? this.bestGrade(grades) : null;

    // Certificate info from first endpoint with details
    const detailsEndpoint = endpoints.find((ep) => ep.details);
    const certInfo = detailsEndpoint?.details?.cert;

    let certificateExpires: string | null = null;
    let daysUntilExpiry: number | null = null;
    let certificateValid = false;

    if (certInfo) {
      const expiryDate = new Date(certInfo.notAfter);
      certificateExpires = expiryDate.toISOString();
      daysUntilExpiry = Math.floor(
        (expiryDate.getTime() - Date.now()) / 86_400_000
      );
      certificateValid = daysUntilExpiry > 0 && certInfo.issues === 0;
    }

    // Protocols
    const protocols = detailsEndpoint?.details?.protocols ?? [];
    const supportedProtocols = protocols.map((p) => `${p.name} ${p.version}`);
    const tls13Supported = protocols.some(
      (p) => p.name === "TLS" && p.version === "1.3"
    );

    // HSTS
    const hstsEnabled =
      detailsEndpoint?.details?.hstsPolicy?.status === "present";

    // Forward secrecy (value > 0 means some support, >= 4 means with all browsers)
    const forwardSecrecy =
      (detailsEndpoint?.details?.forwardSecrecy ?? 0) > 0;

    // Vulnerabilities
    const vulnerabilities: string[] = [];
    const vulns = detailsEndpoint?.details?.vulnerabilities;
    if (vulns) {
      if (vulns.heartbleed) vulnerabilities.push("Heartbleed");
      if (vulns.beast) vulnerabilities.push("BEAST");
      if (vulns.poodleTls && vulns.poodleTls > 0) vulnerabilities.push("POODLE (TLS)");
      if (vulns.drownVulnerable) vulnerabilities.push("DROWN");
      if (vulns.openSslCcs && vulns.openSslCcs > 0) vulnerabilities.push("OpenSSL CCS Injection");
      if (vulns.ticketbleed && vulns.ticketbleed > 0) vulnerabilities.push("Ticketbleed");
      if (vulns.bleichenbacher && vulns.bleichenbacher > 0) vulnerabilities.push("ROBOT");
    }

    return {
      host: analysis.host,
      grade,
      certificateValid,
      certificateExpires,
      daysUntilExpiry,
      supportedProtocols,
      tls13Supported,
      hstsEnabled,
      forwardSecrecy,
      vulnerabilities,
      endpointCount: endpoints.length,
    };
  }

  /**
   * Determine the best (highest) grade from a list.
   */
  private bestGrade(grades: SslGrade[]): SslGrade {
    const gradeOrder: SslGrade[] = [
      "A+", "A", "A-", "B", "C", "D", "E", "F", "T", "M", "N",
    ];

    let best: SslGrade = grades[0]!;
    let bestIndex = gradeOrder.indexOf(best);

    for (const g of grades) {
      const idx = gradeOrder.indexOf(g);
      if (idx !== -1 && idx < bestIndex) {
        best = g;
        bestIndex = idx;
      }
    }

    return best;
  }
}

/**
 * Google PageSpeed Insights API v5 client.
 *
 * Authentication: API key (no OAuth2 required).
 *
 * @see https://developers.google.com/speed/docs/insights/v5/get-started
 */

import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  Strategy,
  Category,
  PageSpeedResult,
  CoreWebVitals,
  LighthouseScores,
  PageSpeedSummary,
} from "./types.js";

const BASE_URL = "https://www.googleapis.com/pagespeedonline/v5";

export class GooglePageSpeedClient extends BaseIntegrationClient {
  private readonly apiKey: string;

  /**
   * @param apiKey - Google API key with PageSpeed Insights API enabled
   */
  constructor(apiKey: string) {
    super({
      baseUrl: BASE_URL,
      authType: "api_key",
      credentials: { apiKey },
      rateLimit: { requestsPerMinute: 60 },
    });
    this.apiKey = apiKey;
  }

  // ── Analyze URL ───────────────────────────────────────────────

  /**
   * Run a full PageSpeed Insights analysis on a URL.
   *
   * @param url - The URL to analyze
   * @param strategy - Device strategy: "mobile" or "desktop"
   * @param categories - Lighthouse categories to include (defaults to all)
   * @param locale - Locale for the results (e.g. "en", "de")
   */
  async analyze(
    url: string,
    strategy: Strategy = "mobile",
    categories?: Category[],
    locale?: string,
  ): Promise<ApiResponse<PageSpeedResult>> {
    const params: Record<string, string> = {
      url,
      strategy,
      key: this.apiKey,
    };

    if (locale) {
      params["locale"] = locale;
    }

    // The API accepts multiple category params; we join them for simplicity
    // and pass as individual query params via URL construction
    if (categories && categories.length > 0) {
      // PageSpeed API accepts multiple &category= params
      const categoryParams = categories.map((c) => `category=${c}`).join("&");
      const fullUrl = `${BASE_URL}/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${this.apiKey}${locale ? `&locale=${locale}` : ""}&${categoryParams}`;

      const response = await fetch(fullUrl, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`PageSpeed analysis failed: ${response.status} ${error}`);
      }

      return { data: await response.json() as PageSpeedResult, status: 200, headers: {} };
    }

    return this.get<PageSpeedResult>("/runPagespeed", params);
  }

  /**
   * Analyze a URL for both mobile and desktop strategies.
   */
  async analyzeBoth(
    url: string,
    categories?: Category[],
    locale?: string,
  ): Promise<{ mobile: ApiResponse<PageSpeedResult>; desktop: ApiResponse<PageSpeedResult> }> {
    const [mobile, desktop] = await Promise.all([
      this.analyze(url, "mobile", categories, locale),
      this.analyze(url, "desktop", categories, locale),
    ]);
    return { mobile, desktop };
  }

  // ── Convenience Extractors ────────────────────────────────────

  /**
   * Extract Core Web Vitals from a PageSpeed result.
   */
  extractCoreWebVitals(result: PageSpeedResult): CoreWebVitals {
    const metrics = result.loadingExperience.metrics;
    return {
      lcp: metrics.LARGEST_CONTENTFUL_PAINT_MS
        ? { value: metrics.LARGEST_CONTENTFUL_PAINT_MS.percentile, category: metrics.LARGEST_CONTENTFUL_PAINT_MS.category }
        : undefined,
      fid: metrics.FIRST_INPUT_DELAY_MS
        ? { value: metrics.FIRST_INPUT_DELAY_MS.percentile, category: metrics.FIRST_INPUT_DELAY_MS.category }
        : undefined,
      cls: metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE
        ? { value: metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile, category: metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.category }
        : undefined,
      inp: metrics.INTERACTION_TO_NEXT_PAINT
        ? { value: metrics.INTERACTION_TO_NEXT_PAINT.percentile, category: metrics.INTERACTION_TO_NEXT_PAINT.category }
        : undefined,
      fcp: metrics.FIRST_CONTENTFUL_PAINT_MS
        ? { value: metrics.FIRST_CONTENTFUL_PAINT_MS.percentile, category: metrics.FIRST_CONTENTFUL_PAINT_MS.category }
        : undefined,
      ttfb: metrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE
        ? { value: metrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE.percentile, category: metrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE.category }
        : undefined,
    };
  }

  /**
   * Extract Lighthouse category scores from a PageSpeed result.
   */
  extractLighthouseScores(result: PageSpeedResult): LighthouseScores {
    const cats = result.lighthouseResult.categories;
    return {
      performance: cats.performance?.score ?? null,
      accessibility: cats.accessibility?.score ?? null,
      bestPractices: cats["best-practices"]?.score ?? null,
      seo: cats.seo?.score ?? null,
    };
  }

  /**
   * Get a compact summary of the PageSpeed analysis.
   */
  getSummary(result: PageSpeedResult, strategy: Strategy): PageSpeedSummary {
    return {
      url: result.id,
      strategy,
      overallCategory: result.loadingExperience.overall_category,
      coreWebVitals: this.extractCoreWebVitals(result),
      lighthouseScores: this.extractLighthouseScores(result),
      fetchTime: result.lighthouseResult.fetchTime,
    };
  }
}

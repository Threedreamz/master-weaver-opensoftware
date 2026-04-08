import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  OxrLatestResponse,
  OxrHistoricalResponse,
  OxrTimeSeriesResponse,
  OxrConvertResponse,
  OxrCurrencies,
  OxrUsageResponse,
  OxrLatestParams,
  OxrHistoricalParams,
  OxrTimeSeriesParams,
  OxrConvertParams,
} from "./types.js";

export interface OpenExchangeRatesClientOptions {
  appId: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Open Exchange Rates API client for real-time and historical FX rates.
 *
 * Uses API key authentication via the `app_id` query parameter.
 */
export class OpenExchangeRatesClient extends BaseIntegrationClient {
  private readonly appId: string;

  constructor(config: OpenExchangeRatesClientOptions) {
    super({
      baseUrl: config.baseUrl ?? "https://openexchangerates.org/api",
      authType: "none",
      credentials: {},
      timeout: config.timeout ?? 15_000,
      retry: config.retries
        ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 }
        : undefined,
      rateLimit: { requestsPerMinute: 60 },
    });
    this.appId = config.appId;
  }

  /** Build query params, always including app_id. */
  private buildQuery(
    extra?: Record<string, string>,
  ): Record<string, string> {
    return { app_id: this.appId, ...extra };
  }

  // ── Latest Rates ───────────────────────────────────────────────────────

  /** Get the latest exchange rates. */
  async getLatestRates(
    params?: OxrLatestParams,
  ): Promise<OxrLatestResponse> {
    const query: Record<string, string> = {};
    if (params?.base) query.base = params.base;
    if (params?.symbols) query.symbols = params.symbols.join(",");
    if (params?.show_alternative) query.show_alternative = "1";

    const { data } = await this.get<OxrLatestResponse>(
      "/latest.json",
      this.buildQuery(query),
    );
    return data;
  }

  // ── Historical Rates ───────────────────────────────────────────────────

  /** Get historical rates for a specific date (YYYY-MM-DD). */
  async getHistoricalRates(
    params: OxrHistoricalParams,
  ): Promise<OxrHistoricalResponse> {
    const query: Record<string, string> = {};
    if (params.base) query.base = params.base;
    if (params.symbols) query.symbols = params.symbols.join(",");
    if (params.show_alternative) query.show_alternative = "1";

    const { data } = await this.get<OxrHistoricalResponse>(
      `/historical/${params.date}.json`,
      this.buildQuery(query),
    );
    return data;
  }

  // ── Time Series ────────────────────────────────────────────────────────

  /** Get rates for a date range (Enterprise plan). */
  async getTimeSeries(
    params: OxrTimeSeriesParams,
  ): Promise<OxrTimeSeriesResponse> {
    const query: Record<string, string> = {
      start: params.start,
      end: params.end,
    };
    if (params.base) query.base = params.base;
    if (params.symbols) query.symbols = params.symbols.join(",");

    const { data } = await this.get<OxrTimeSeriesResponse>(
      "/time-series.json",
      this.buildQuery(query),
    );
    return data;
  }

  // ── Convert ────────────────────────────────────────────────────────────

  /** Convert an amount between two currencies (Enterprise plan). */
  async convert(params: OxrConvertParams): Promise<OxrConvertResponse> {
    const { data } = await this.get<OxrConvertResponse>(
      `/convert/${params.amount}/${params.from}/${params.to}`,
      this.buildQuery(),
    );
    return data;
  }

  // ── Currencies ─────────────────────────────────────────────────────────

  /** Get available currencies. */
  async getCurrencies(options?: {
    show_alternative?: boolean;
    show_inactive?: boolean;
  }): Promise<OxrCurrencies> {
    const query: Record<string, string> = {};
    if (options?.show_alternative) query.show_alternative = "1";
    if (options?.show_inactive) query.show_inactive = "1";

    const { data } = await this.get<OxrCurrencies>(
      "/currencies.json",
      this.buildQuery(query),
    );
    return data;
  }

  // ── Usage ──────────────────────────────────────────────────────────────

  /** Get API usage stats for your app. */
  async getUsage(): Promise<OxrUsageResponse> {
    const { data } = await this.get<OxrUsageResponse>(
      "/usage.json",
      this.buildQuery(),
    );
    return data;
  }

  // ── Connection Test ────────────────────────────────────────────────────

  /** Test the connection by fetching usage info. */
  async testConnection(): Promise<boolean> {
    try {
      const usage = await this.getUsage();
      return usage.status === 200;
    } catch {
      return false;
    }
  }
}

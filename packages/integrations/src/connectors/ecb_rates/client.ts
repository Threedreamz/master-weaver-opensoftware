import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  EcbRatesClientConfig,
  EcbExchangeRate,
  EcbDailyRates,
  EcbHistoricalRates,
} from "./types.js";

export interface EcbRatesClientOptions {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

/**
 * ECB (European Central Bank) exchange rates client.
 *
 * Fetches daily EUR reference rates from the ECB's public XML/SDMX API.
 * No authentication required. Base currency is always EUR.
 */
export class EcbRatesClient extends BaseIntegrationClient {
  constructor(config?: EcbRatesClientOptions) {
    super({
      baseUrl:
        config?.baseUrl ??
        "https://www.ecb.europa.eu/stats/eurofxref",
      authType: "none",
      credentials: {},
      timeout: config?.timeout ?? 15_000,
      retry: config?.retries
        ? {
            maxRetries: config.retries,
            baseDelayMs: 1000,
            maxDelayMs: 10_000,
          }
        : undefined,
      rateLimit: { requestsPerMinute: 30 },
      defaultHeaders: {
        Accept: "application/xml, text/xml",
      },
    });
  }

  // ── Daily Rates ────────────────────────────────────────────────────────

  /** Get the latest daily EUR reference rates. */
  async getLatestRates(): Promise<EcbDailyRates> {
    const { data } = await this.get<string>("/eurofxref-daily.xml");
    return this.parseDailyXml(data as unknown as string);
  }

  /** Get the last 90 days of EUR reference rates. */
  async getHistoricalRates(): Promise<EcbHistoricalRates> {
    const { data } = await this.get<string>("/eurofxref-hist-90d.xml");
    return this.parseHistoricalXml(data as unknown as string);
  }

  /** Get the full historical EUR reference rates (since 1999). */
  async getFullHistoricalRates(): Promise<EcbHistoricalRates> {
    const { data } = await this.get<string>("/eurofxref-hist.xml");
    return this.parseHistoricalXml(data as unknown as string);
  }

  // ── Conversion Helpers ─────────────────────────────────────────────────

  /**
   * Get the exchange rate for a specific currency against EUR.
   * Returns null if the currency is not found.
   */
  async getRate(currency: string): Promise<number | null> {
    if (currency.toUpperCase() === "EUR") return 1;
    const { rates } = await this.getLatestRates();
    const rate = rates.find(
      (r) => r.currency === currency.toUpperCase(),
    );
    return rate?.rate ?? null;
  }

  /**
   * Convert an amount between two currencies using the latest ECB rates.
   * Both currencies must be in the ECB reference list (or EUR).
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<{ result: number; rate: number; date: string } | null> {
    const daily = await this.getLatestRates();
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    const fromRate =
      from === "EUR"
        ? 1
        : daily.rates.find((r) => r.currency === from)?.rate;
    const toRate =
      to === "EUR"
        ? 1
        : daily.rates.find((r) => r.currency === to)?.rate;

    if (fromRate === undefined || toRate === undefined) return null;

    const rate = toRate / fromRate;
    return { result: amount * rate, rate, date: daily.date };
  }

  // ── XML Parsing ────────────────────────────────────────────────────────

  private parseDailyXml(xml: string): EcbDailyRates {
    const dateMatch = xml.match(/Cube time='(\d{4}-\d{2}-\d{2})'/);
    const date = dateMatch?.[1] ?? "";

    const rates = this.extractRates(xml);
    return { date, rates };
  }

  private parseHistoricalXml(xml: string): EcbHistoricalRates {
    const dayBlocks = xml.split(/<Cube time='/);
    const dailyRates: EcbDailyRates[] = [];

    for (let i = 1; i < dayBlocks.length; i++) {
      const dateMatch = dayBlocks[i].match(/^(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) continue;
      const date = dateMatch[1];
      const rates = this.extractRates(dayBlocks[i]);
      dailyRates.push({ date, rates });
    }

    return { base: "EUR", rates: dailyRates };
  }

  private extractRates(xml: string): EcbExchangeRate[] {
    const rates: EcbExchangeRate[] = [];
    const regex = /currency='([A-Z]{3})'\s+rate='([\d.]+)'/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(xml)) !== null) {
      rates.push({
        currency: match[1],
        rate: parseFloat(match[2]),
      });
    }

    return rates;
  }

  // ── Connection Test ────────────────────────────────────────────────────

  /** Test the connection by fetching the latest rates. */
  async testConnection(): Promise<boolean> {
    try {
      const rates = await this.getLatestRates();
      return rates.rates.length > 0;
    } catch {
      return false;
    }
  }
}

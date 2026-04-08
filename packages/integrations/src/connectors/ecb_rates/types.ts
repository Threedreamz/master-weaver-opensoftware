// ── Shared ──────────────────────────────────────────────────────────────────

export interface EcbRatesClientConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

// ── Exchange Rates ─────────────────────────────────────────────────────────

export interface EcbExchangeRate {
  currency: string;
  rate: number;
}

export interface EcbDailyRates {
  date: string;
  rates: EcbExchangeRate[];
}

export interface EcbHistoricalRates {
  base: "EUR";
  rates: EcbDailyRates[];
}

// ── SDMX Response Types ───────────────────────────────────────────────────

export interface EcbSdmxSeries {
  frequency: string;
  currency: string;
  currencyDenom: string;
  exchangeRateType: string;
  seriesVariation: string;
  observations: Array<{
    date: string;
    value: number;
  }>;
}

export interface EcbSdmxResponse {
  series: EcbSdmxSeries[];
}

// ── Currency Info ──────────────────────────────────────────────────────────

export interface EcbCurrency {
  code: string;
  name: string;
}

/** All currencies published by the ECB daily reference rates. */
export const ECB_CURRENCIES: EcbCurrency[] = [
  { code: "USD", name: "US dollar" },
  { code: "JPY", name: "Japanese yen" },
  { code: "BGN", name: "Bulgarian lev" },
  { code: "CZK", name: "Czech koruna" },
  { code: "DKK", name: "Danish krone" },
  { code: "GBP", name: "Pound sterling" },
  { code: "HUF", name: "Hungarian forint" },
  { code: "PLN", name: "Polish zloty" },
  { code: "RON", name: "Romanian leu" },
  { code: "SEK", name: "Swedish krona" },
  { code: "CHF", name: "Swiss franc" },
  { code: "ISK", name: "Icelandic krona" },
  { code: "NOK", name: "Norwegian krone" },
  { code: "TRY", name: "Turkish lira" },
  { code: "AUD", name: "Australian dollar" },
  { code: "BRL", name: "Brazilian real" },
  { code: "CAD", name: "Canadian dollar" },
  { code: "CNY", name: "Chinese yuan renminbi" },
  { code: "HKD", name: "Hong Kong dollar" },
  { code: "IDR", name: "Indonesian rupiah" },
  { code: "ILS", name: "Israeli shekel" },
  { code: "INR", name: "Indian rupee" },
  { code: "KRW", name: "South Korean won" },
  { code: "MXN", name: "Mexican peso" },
  { code: "MYR", name: "Malaysian ringgit" },
  { code: "NZD", name: "New Zealand dollar" },
  { code: "PHP", name: "Philippine peso" },
  { code: "SGD", name: "Singapore dollar" },
  { code: "THB", name: "Thai baht" },
  { code: "ZAR", name: "South African rand" },
];

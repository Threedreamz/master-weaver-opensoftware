// ── Shared ──────────────────────────────────────────────────────────────────

export interface OpenExchangeRatesClientConfig {
  appId: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

// ── Latest Rates ───────────────────────────────────────────────────────────

export interface OxrLatestResponse {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: Record<string, number>;
}

// ── Historical Rates ───────────────────────────────────────────────────────

export interface OxrHistoricalResponse {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: Record<string, number>;
}

// ── Time Series ────────────────────────────────────────────────────────────

export interface OxrTimeSeriesResponse {
  disclaimer: string;
  license: string;
  start_date: string;
  end_date: string;
  base: string;
  rates: Record<string, Record<string, number>>;
}

// ── Convert ────────────────────────────────────────────────────────────────

export interface OxrConvertResponse {
  disclaimer: string;
  license: string;
  request: {
    query: string;
    amount: number;
    from: string;
    to: string;
  };
  meta: {
    timestamp: number;
    rate: number;
  };
  response: number;
}

// ── Currencies ─────────────────────────────────────────────────────────────

/** Map of currency code to currency name. */
export type OxrCurrencies = Record<string, string>;

// ── Usage ──────────────────────────────────────────────────────────────────

export interface OxrUsageResponse {
  status: number;
  data: {
    app_id: string;
    status: string;
    plan: {
      name: string;
      quota: string;
      update_frequency: string;
      features: Record<string, boolean>;
    };
    usage: {
      requests: number;
      requests_quota: number;
      requests_remaining: number;
      days_elapsed: number;
      days_remaining: number;
      daily_average: number;
    };
  };
}

// ── Query Params ───────────────────────────────────────────────────────────

export interface OxrLatestParams {
  base?: string;
  symbols?: string[];
  show_alternative?: boolean;
}

export interface OxrHistoricalParams {
  date: string;
  base?: string;
  symbols?: string[];
  show_alternative?: boolean;
}

export interface OxrTimeSeriesParams {
  start: string;
  end: string;
  base?: string;
  symbols?: string[];
}

export interface OxrConvertParams {
  from: string;
  to: string;
  amount: number;
}

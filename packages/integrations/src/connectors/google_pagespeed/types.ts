/**
 * Google PageSpeed Insights API v5 types.
 * @see https://developers.google.com/speed/docs/insights/v5/reference
 */

export type Strategy = "mobile" | "desktop";

export type Category =
  | "accessibility"
  | "best-practices"
  | "performance"
  | "seo";

// ── Core Web Vitals ───────────────────────────────────────────────

export interface MetricDistribution {
  min: number;
  max?: number;
  proportion: number;
}

export interface CruxMetric {
  percentile: number;
  distributions: MetricDistribution[];
  category: "FAST" | "AVERAGE" | "SLOW" | "NONE";
}

export interface LoadingExperience {
  id: string;
  metrics: {
    CUMULATIVE_LAYOUT_SHIFT_SCORE?: CruxMetric;
    EXPERIMENTAL_TIME_TO_FIRST_BYTE?: CruxMetric;
    FIRST_CONTENTFUL_PAINT_MS?: CruxMetric;
    FIRST_INPUT_DELAY_MS?: CruxMetric;
    INTERACTION_TO_NEXT_PAINT?: CruxMetric;
    LARGEST_CONTENTFUL_PAINT_MS?: CruxMetric;
  };
  overall_category: "FAST" | "AVERAGE" | "SLOW" | "NONE";
  initial_url: string;
}

// ── Lighthouse ────────────────────────────────────────────────────

export interface LighthouseAuditResult {
  id: string;
  title: string;
  description: string;
  score: number | null;
  scoreDisplayMode: "numeric" | "binary" | "manual" | "informative" | "notApplicable" | "error";
  displayValue?: string;
  numericValue?: number;
  numericUnit?: "millisecond" | "byte" | "unitless" | "element";
  details?: {
    type: string;
    headings?: Array<{ key: string; label: string; valueType: string }>;
    items?: Array<Record<string, unknown>>;
    overallSavingsMs?: number;
    overallSavingsBytes?: number;
  };
}

export interface LighthouseCategoryResult {
  id: string;
  title: string;
  description: string;
  score: number | null;
  manualDescription?: string;
  auditRefs: Array<{
    id: string;
    weight: number;
    group?: string;
    acronym?: string;
    relevantAudits?: string[];
  }>;
}

export interface LighthouseResult {
  requestedUrl: string;
  finalUrl: string;
  lighthouseVersion: string;
  userAgent: string;
  fetchTime: string;
  environment: {
    networkUserAgent: string;
    hostUserAgent: string;
    benchmarkIndex: number;
  };
  runWarnings: string[];
  configSettings: {
    emulatedFormFactor: string;
    formFactor: string;
    locale: string;
    onlyCategories: string[];
    channel: string;
  };
  audits: Record<string, LighthouseAuditResult>;
  categories: {
    accessibility?: LighthouseCategoryResult;
    "best-practices"?: LighthouseCategoryResult;
    performance?: LighthouseCategoryResult;
    seo?: LighthouseCategoryResult;
  };
  categoryGroups: Record<
    string,
    { title: string; description?: string }
  >;
  timing: { total: number };
  i18n: {
    rendererFormattedStrings: Record<string, string>;
  };
}

// ── Top-Level Response ────────────────────────────────────────────

export interface PageSpeedResult {
  captchaResult: "CAPTCHA_NOT_NEEDED" | "CAPTCHA_NEEDED" | "CAPTCHA_MATCHED";
  kind: "pagespeedonline#result";
  id: string;
  loadingExperience: LoadingExperience;
  originLoadingExperience?: LoadingExperience;
  lighthouseResult: LighthouseResult;
  analysisUTCTimestamp: string;
  version: {
    major: number;
    minor: number;
  };
}

// ── Convenience Extracted Types ───────────────────────────────────

export interface CoreWebVitals {
  lcp?: { value: number; category: string };
  fid?: { value: number; category: string };
  cls?: { value: number; category: string };
  inp?: { value: number; category: string };
  fcp?: { value: number; category: string };
  ttfb?: { value: number; category: string };
}

export interface LighthouseScores {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
}

export interface PageSpeedSummary {
  url: string;
  strategy: Strategy;
  overallCategory: string;
  coreWebVitals: CoreWebVitals;
  lighthouseScores: LighthouseScores;
  fetchTime: string;
}

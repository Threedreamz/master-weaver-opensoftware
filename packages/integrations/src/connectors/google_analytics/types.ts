/**
 * Google Analytics Data API v1beta types.
 * @see https://developers.google.com/analytics/devguides/reporting/data/v1
 */

// ── Shared Primitives ─────────────────────────────────────────────

export interface DateRange {
  startDate: string;
  endDate: string;
  name?: string;
}

export interface Dimension {
  name: string;
}

export interface Metric {
  name: string;
  expression?: string;
}

export interface FilterExpression {
  andGroup?: { expressions: FilterExpression[] };
  orGroup?: { expressions: FilterExpression[] };
  notExpression?: FilterExpression;
  filter?: Filter;
}

export interface Filter {
  fieldName: string;
  stringFilter?: {
    matchType: "EXACT" | "BEGINS_WITH" | "ENDS_WITH" | "CONTAINS" | "FULL_REGEXP" | "PARTIAL_REGEXP";
    value: string;
    caseSensitive?: boolean;
  };
  inListFilter?: {
    values: string[];
    caseSensitive?: boolean;
  };
  numericFilter?: {
    operation: "EQUAL" | "LESS_THAN" | "LESS_THAN_OR_EQUAL" | "GREATER_THAN" | "GREATER_THAN_OR_EQUAL";
    value: NumericValue;
  };
  betweenFilter?: {
    fromValue: NumericValue;
    toValue: NumericValue;
  };
}

export interface NumericValue {
  int64Value?: string;
  doubleValue?: number;
}

export interface OrderBy {
  metric?: { metricName: string };
  dimension?: { dimensionName: string; orderType?: "ALPHANUMERIC" | "CASE_INSENSITIVE_ALPHANUMERIC" | "NUMERIC" };
  desc?: boolean;
}

export type MetricAggregation = "TOTAL" | "MINIMUM" | "MAXIMUM" | "COUNT";

// ── Run Report ────────────────────────────────────────────────────

export interface RunReportRequest {
  dateRanges: DateRange[];
  dimensions?: Dimension[];
  metrics: Metric[];
  dimensionFilter?: FilterExpression;
  metricFilter?: FilterExpression;
  orderBys?: OrderBy[];
  limit?: number;
  offset?: number;
  metricAggregations?: MetricAggregation[];
  currencyCode?: string;
  keepEmptyRows?: boolean;
  returnPropertyQuota?: boolean;
}

export interface DimensionHeader {
  name: string;
}

export interface MetricHeader {
  name: string;
  type: "TYPE_UNSPECIFIED" | "TYPE_INTEGER" | "TYPE_FLOAT" | "TYPE_SECONDS" | "TYPE_MILLISECONDS" | "TYPE_MINUTES" | "TYPE_HOURS" | "TYPE_STANDARD" | "TYPE_CURRENCY" | "TYPE_FEET" | "TYPE_MILES" | "TYPE_METERS" | "TYPE_KILOMETERS";
}

export interface DimensionValue {
  value: string;
}

export interface MetricValue {
  value: string;
}

export interface Row {
  dimensionValues: DimensionValue[];
  metricValues: MetricValue[];
}

export interface PropertyQuota {
  tokensPerDay: { consumed: number; remaining: number };
  tokensPerHour: { consumed: number; remaining: number };
  concurrentRequests: { consumed: number; remaining: number };
  serverErrorsPerProjectPerHour: { consumed: number; remaining: number };
  potentiallyThresholdedRequestsPerHour: { consumed: number; remaining: number };
  tokensPerProjectPerHour: { consumed: number; remaining: number };
}

export interface RunReportResponse {
  dimensionHeaders: DimensionHeader[];
  metricHeaders: MetricHeader[];
  rows?: Row[];
  totals?: Row[];
  maximums?: Row[];
  minimums?: Row[];
  rowCount: number;
  metadata: {
    dataLossFromOtherRow?: boolean;
    schemaRestrictionResponse?: {
      activeMetricRestrictions?: Array<{
        metricName: string;
        restrictedMetricTypes: string[];
      }>;
    };
    currencyCode?: string;
    timeZone?: string;
  };
  propertyQuota?: PropertyQuota;
  kind: string;
}

// ── Run Realtime Report ───────────────────────────────────────────

export interface RunRealtimeReportRequest {
  dimensions?: Dimension[];
  metrics: Metric[];
  dimensionFilter?: FilterExpression;
  metricFilter?: FilterExpression;
  limit?: number;
  metricAggregations?: MetricAggregation[];
  orderBys?: OrderBy[];
  returnPropertyQuota?: boolean;
  minuteRanges?: Array<{
    name?: string;
    startMinutesAgo?: number;
    endMinutesAgo?: number;
  }>;
}

export interface RunRealtimeReportResponse {
  dimensionHeaders: DimensionHeader[];
  metricHeaders: MetricHeader[];
  rows?: Row[];
  totals?: Row[];
  maximums?: Row[];
  minimums?: Row[];
  rowCount: number;
  propertyQuota?: PropertyQuota;
  kind: string;
}

// ── Metadata ──────────────────────────────────────────────────────

export interface DimensionMetadata {
  apiName: string;
  uiName: string;
  description: string;
  deprecatedApiNames?: string[];
  customDefinition?: boolean;
  category: string;
}

export interface MetricMetadata {
  apiName: string;
  uiName: string;
  description: string;
  deprecatedApiNames?: string[];
  type: string;
  expression?: string;
  customDefinition?: boolean;
  blockedReasons?: string[];
  category: string;
}

export interface MetadataResponse {
  name: string;
  dimensions: DimensionMetadata[];
  metrics: MetricMetadata[];
}

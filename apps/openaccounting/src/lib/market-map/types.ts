export type MarketMapLayer = "countries" | "regions" | "plz" | "leads";
export type LeadStatus = "new" | "qualified" | "contacted" | "converted" | "rejected";
export type EnrichmentStatus = "pending" | "partial" | "complete" | "failed";

export interface MarketCountryProperties {
  code: string;
  name: string;
  smeCount: number;
  population: number;
  gdpEur: number;
  marketScore: number;
  region: string;
  smeEmployees?: number;
  potentialRevenueEUR?: number;
  addressableRate?: number;
  formattedRevenue?: string;
}

export interface MarketPLZProperties {
  countryCode: string;
  postalCode: string;
  cityName: string;
  latitude: number;
  longitude: number;
  smeCount: number;
  marketScore: number;
  population: number;
  potentialRevenueEUR?: number;
  formattedRevenue?: string;
}

export interface MarketLeadProperties {
  id: number;
  companyName: string;
  vatId?: string;
  countryCode: string;
  postalCode?: string;
  city?: string;
  industry?: string;
  employeesRange?: string;
  revenueRange?: string;
  leadScore: number;
  leadStatus: LeadStatus;
  enrichmentStatus: EnrichmentStatus;
  latitude?: number;
  longitude?: number;
  projectedRevenueEUR?: number;
  formattedRevenue?: string;
}

export interface GeoJSONFeature<T = Record<string, unknown>> {
  type: "Feature";
  geometry: {
    type: "Point" | "Polygon" | "MultiPolygon";
    coordinates: number[] | number[][] | number[][][] | number[][][][];
  };
  properties: T;
}

export interface GeoJSONFeatureCollection<T = Record<string, unknown>> {
  type: "FeatureCollection";
  features: GeoJSONFeature<T>[];
}

export const MARKET_SCORE_COLORS = {
  high:   { color: "#22c55e", label: "High Potential",   min: 70 },
  medium: { color: "#f59e0b", label: "Medium Potential", min: 40 },
  low:    { color: "#ef4444", label: "Low Potential",    min: 0 },
} as const;

export function getScoreColor(score: number): string {
  if (score >= 70) return MARKET_SCORE_COLORS.high.color;
  if (score >= 40) return MARKET_SCORE_COLORS.medium.color;
  return MARKET_SCORE_COLORS.low.color;
}

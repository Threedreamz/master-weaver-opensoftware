export interface CampaignRow {
  id: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED";
  biddingStrategy: string;
  budget: number;
  budgetType: string;
  networkSettings: string;
  startDate: string | null;
  endDate: string | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
}

export interface KeywordRow {
  id: string;
  adGroupId: string;
  keyword: string;
  matchType: "EXACT" | "PHRASE" | "BROAD";
  status: "ENABLED" | "PAUSED" | "REMOVED";
  qualityScore: number | null;
  expectedCtr: string | null;
  adRelevance: string | null;
  landingPageExperience: string | null;
  cpc: number;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
}

export interface SearchTermRow {
  searchTerm: string;
  keyword: string;
  matchType: string;
  campaignId: string;
  adGroupId: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
}

export interface GeoMetricRow {
  geoCode: string;
  region: string;
  country: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
}

export interface DeviceMetricRow {
  device: "MOBILE" | "TABLET" | "DESKTOP" | "OTHER";
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
}

export interface HourMetricRow {
  hour: number;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
}

export interface DailyMetricRow {
  date: string;
  campaignId: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
}

export interface AssetRow {
  id: string;
  name: string;
  type: "HEADLINE" | "DESCRIPTION" | "IMAGE" | "VIDEO" | "TEXT";
  performanceLabel: "BEST" | "GOOD" | "LOW" | "LEARNING" | "UNRATED" | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
}

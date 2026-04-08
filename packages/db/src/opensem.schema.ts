import { sqliteTable, text, integer, real, index, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./shared.schema";

// ==================== SEO AUDITS ====================

export const seoAudits = sqliteTable("seo_audits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull(),
  locale: text("locale").notNull().default("de"),
  overallScore: integer("overall_score"),
  results: text("results", { mode: "json" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("seo_audits_url_idx").on(table.url),
  index("seo_audits_created_idx").on(table.createdAt),
]);

// ==================== SEO PAGESPEED ====================

export const seoPagespeedResults = sqliteTable("seo_pagespeed_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull(),
  strategy: text("strategy", { enum: ["mobile", "desktop"] }).notNull().default("mobile"),
  performanceScore: integer("performance_score"),
  accessibilityScore: integer("accessibility_score"),
  bestPracticesScore: integer("best_practices_score"),
  seoScore: integer("seo_score"),
  fcpMs: integer("fcp_ms"),
  lcpMs: integer("lcp_ms"),
  cls: real("cls"),
  tbtMs: integer("tbt_ms"),
  speedIndexMs: integer("speed_index_ms"),
  rawResponse: text("raw_response", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("seo_pagespeed_url_idx").on(table.url),
  index("seo_pagespeed_created_idx").on(table.createdAt),
]);

// ==================== SEMRUSH ====================

export const semrushSnapshots = sqliteTable("semrush_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  domain: text("domain").notNull(),
  database: text("database").notNull().default("us"),
  organicKeywords: integer("organic_keywords"),
  organicTraffic: integer("organic_traffic"),
  organicCost: real("organic_cost"),
  paidKeywords: integer("paid_keywords"),
  paidTraffic: integer("paid_traffic"),
  paidCost: real("paid_cost"),
  backlinks: integer("backlinks"),
  referringDomains: integer("referring_domains"),
  authorityScore: integer("authority_score"),
  rawResponse: text("raw_response", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("semrush_domain_idx").on(table.domain),
  index("semrush_created_idx").on(table.createdAt),
]);

// ==================== SEO KEYWORDS & RANKINGS ====================

export const seoKeywords = sqliteTable("seo_keywords", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keyword: text("keyword").notNull(),
  locale: text("locale").notNull().default("de"),
  targetUrl: text("target_url"),
  searchEngine: text("search_engine", {
    enum: ["google", "bing", "google_de", "google_en"],
  }).default("google").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("sk_keyword_idx").on(table.keyword),
  index("sk_active_idx").on(table.isActive),
  uniqueIndex("sk_keyword_engine_idx").on(table.keyword, table.searchEngine, table.locale),
]);

export const seoRankSnapshots = sqliteTable("seo_rank_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keywordId: integer("keyword_id").notNull().references(() => seoKeywords.id, { onDelete: "cascade" }),
  position: integer("position"),
  previousPosition: integer("previous_position"),
  positionChange: integer("position_change"),
  url: text("url"),
  searchVolume: integer("search_volume"),
  difficulty: integer("difficulty"),
  checkedAt: integer("checked_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("srs_keyword_idx").on(table.keywordId),
  index("srs_checked_idx").on(table.checkedAt),
]);

export const seoCompetitors = sqliteTable("seo_competitors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  domain: text("domain").notNull().unique(),
  name: text("name"),
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const seoCompetitorRanks = sqliteTable("seo_competitor_ranks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keywordId: integer("keyword_id").notNull().references(() => seoKeywords.id, { onDelete: "cascade" }),
  competitorId: integer("competitor_id").notNull().references(() => seoCompetitors.id, { onDelete: "cascade" }),
  position: integer("position"),
  url: text("url"),
  checkedAt: integer("checked_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("scr_keyword_idx").on(table.keywordId),
  index("scr_competitor_idx").on(table.competitorId),
]);

// ==================== ANALYTICS: EVENT TRACKING ====================

export const trackingEvents = sqliteTable("tracking_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  anonymousId: text("anonymous_id"),
  eventType: text("event_type", {
    enum: ["pageview", "click", "scroll", "form_submit", "search",
           "add_to_collection", "review_submit", "offer_click",
           "signup", "login", "custom"],
  }).notNull(),
  eventName: text("event_name"),
  pageUrl: text("page_url"),
  pagePath: text("page_path"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmTerm: text("utm_term"),
  utmContent: text("utm_content"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  scrollDepth: integer("scroll_depth"),
  ipHash: text("ip_hash"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("te_session_idx").on(table.sessionId),
  index("te_user_idx").on(table.userId),
  index("te_type_idx").on(table.eventType),
  index("te_name_idx").on(table.eventName),
  index("te_page_idx").on(table.pagePath),
  index("te_created_idx").on(table.createdAt),
  index("te_utm_source_idx").on(table.utmSource),
]);

// ==================== ANALYTICS: SESSIONS ====================

export const trackingSessions = sqliteTable("tracking_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  anonymousId: text("anonymous_id"),
  firstUtmSource: text("first_utm_source"),
  firstUtmMedium: text("first_utm_medium"),
  firstUtmCampaign: text("first_utm_campaign"),
  firstReferrer: text("first_referrer"),
  landingPage: text("landing_page"),
  pageCount: integer("page_count").default(0).notNull(),
  eventCount: integer("event_count").default(0).notNull(),
  durationSeconds: integer("duration_seconds").default(0),
  deviceType: text("device_type"),
  browser: text("browser"),
  os: text("os"),
  country: text("country"),
  ipHash: text("ip_hash"),
  isConverted: integer("is_converted", { mode: "boolean" }).default(false).notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  lastActivityAt: integer("last_activity_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("ts_user_idx").on(table.userId),
  index("ts_started_idx").on(table.startedAt),
  index("ts_utm_idx").on(table.firstUtmSource, table.firstUtmMedium),
]);

// ==================== ANALYTICS: FUNNELS ====================

export const funnelDefinitions = sqliteTable("funnel_definitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const funnelSteps = sqliteTable("funnel_steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  funnelId: integer("funnel_id").notNull().references(() => funnelDefinitions.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  name: text("name").notNull(),
  matchType: text("match_type", { enum: ["page_path", "event_name", "event_type"] }).notNull(),
  matchValue: text("match_value").notNull(),
  matchOperator: text("match_operator", { enum: ["equals", "contains", "starts_with", "regex"] }).default("equals").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("fs_funnel_idx").on(table.funnelId),
]);

// ==================== ANALYTICS: COHORTS ====================

export const userCohorts = sqliteTable("user_cohorts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  cohortType: text("cohort_type", {
    enum: ["signup_date", "acquisition_channel", "first_action", "custom"],
  }).notNull(),
  criteria: text("criteria", { mode: "json" }).$type<Record<string, unknown>>(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const userCohortMembers = sqliteTable("user_cohort_members", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  cohortId: integer("cohort_id").notNull().references(() => userCohorts.id, { onDelete: "cascade" }),
  assignedAt: integer("assigned_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.cohortId] }),
]);

// ==================== WEB VITALS ====================

export const webVitalsReports = sqliteTable("web_vitals_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id"),
  pageUrl: text("page_url").notNull(),
  pagePath: text("page_path"),
  lcpMs: real("lcp_ms"),
  fidMs: real("fid_ms"),
  cls: real("cls"),
  inpMs: real("inp_ms"),
  ttfbMs: real("ttfb_ms"),
  fcpMs: real("fcp_ms"),
  deviceType: text("device_type"),
  connectionType: text("connection_type"),
  userAgent: text("user_agent"),
  ipHash: text("ip_hash"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("wvr_path_idx").on(table.pagePath),
  index("wvr_created_idx").on(table.createdAt),
]);

// ==================== RELATIONS ====================

export const seoKeywordsRelations = relations(seoKeywords, ({ many }) => ({
  snapshots: many(seoRankSnapshots),
  competitorRanks: many(seoCompetitorRanks),
}));

export const seoRankSnapshotsRelations = relations(seoRankSnapshots, ({ one }) => ({
  keyword: one(seoKeywords, { fields: [seoRankSnapshots.keywordId], references: [seoKeywords.id] }),
}));

export const seoCompetitorRanksRelations = relations(seoCompetitorRanks, ({ one }) => ({
  keyword: one(seoKeywords, { fields: [seoCompetitorRanks.keywordId], references: [seoKeywords.id] }),
  competitor: one(seoCompetitors, { fields: [seoCompetitorRanks.competitorId], references: [seoCompetitors.id] }),
}));

export const funnelDefinitionsRelations = relations(funnelDefinitions, ({ many }) => ({
  steps: many(funnelSteps),
}));

export const funnelStepsRelations = relations(funnelSteps, ({ one }) => ({
  funnel: one(funnelDefinitions, { fields: [funnelSteps.funnelId], references: [funnelDefinitions.id] }),
}));

export const userCohortsRelations = relations(userCohorts, ({ many }) => ({
  members: many(userCohortMembers),
}));

export const userCohortMembersRelations = relations(userCohortMembers, ({ one }) => ({
  user: one(users, { fields: [userCohortMembers.userId], references: [users.id] }),
  cohort: one(userCohorts, { fields: [userCohortMembers.cohortId], references: [userCohorts.id] }),
}));

// ==================== PAID ADS ACCOUNTS ====================

export const paidAdsAccounts = sqliteTable("paid_ads_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  externalId: text("external_id"),
  name: text("name").notNull(),
  type: text("type", { enum: ["client", "mcc"] }).default("client").notNull(),
  parentAccountId: integer("parent_account_id"),
  currency: text("currency").default("EUR").notNull(),
  timezone: text("timezone").default("Europe/Berlin").notNull(),
  status: text("status", { enum: ["active", "paused", "suspended", "closed"] }).default("active").notNull(),
  lastSyncAt: integer("last_sync_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("paid_ads_accounts_external_id_idx").on(table.externalId),
  index("paid_ads_accounts_status_idx").on(table.status),
]);

// ==================== PAID ADS INTEGRATIONS ====================

export const paidAdsIntegrations = sqliteTable("paid_ads_integrations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  platform: text("platform", { enum: ["google_ads", "ga4", "gtm", "merchant_center"] }).notNull(),
  status: text("status", { enum: ["connected", "disconnected", "error", "expired"] }).default("disconnected").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: integer("token_expires_at", { mode: "timestamp" }),
  scopes: text("scopes", { mode: "json" }).$type<string[]>(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  lastHealthCheck: integer("last_health_check", { mode: "timestamp" }),
  healthStatus: text("health_status", { enum: ["healthy", "degraded", "unhealthy"] }).default("healthy").notNull(),
  lastError: text("last_error"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("paid_ads_integrations_account_idx").on(table.accountId),
  index("paid_ads_integrations_platform_idx").on(table.platform),
]);

// ==================== PAID ADS CAMPAIGNS ====================

export const paidAdsCampaigns = sqliteTable("paid_ads_campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  name: text("name").notNull(),
  type: text("type", { enum: ["search", "display", "shopping", "video", "performance_max", "discovery", "app", "local", "smart"] }).notNull(),
  status: text("status", { enum: ["draft", "enabled", "paused", "removed"] }).default("draft").notNull(),
  biddingStrategy: text("bidding_strategy", { enum: ["manual_cpc", "maximize_conversions", "maximize_clicks", "target_cpa", "target_roas", "maximize_conversion_value", "target_impression_share"] }),
  dailyBudget: real("daily_budget"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  targetLocations: text("target_locations", { mode: "json" }).$type<string[]>(),
  targetLanguages: text("target_languages", { mode: "json" }).$type<string[]>(),
  labels: text("labels", { mode: "json" }).$type<string[]>(),
  notes: text("notes"),
  syncStatus: text("sync_status", { enum: ["synced", "pending_push", "conflict", "local_only"] }).default("local_only").notNull(),
  lastSyncAt: integer("last_sync_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("paid_ads_campaigns_account_idx").on(table.accountId),
  index("paid_ads_campaigns_external_idx").on(table.externalId),
  index("paid_ads_campaigns_status_idx").on(table.status),
]);

// ==================== PAID ADS AD GROUPS ====================

export const paidAdsAdGroups = sqliteTable("paid_ads_ad_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  campaignId: integer("campaign_id").notNull().references(() => paidAdsCampaigns.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  name: text("name").notNull(),
  status: text("status", { enum: ["draft", "enabled", "paused", "removed"] }).default("draft").notNull(),
  cpcBid: real("cpc_bid"),
  syncStatus: text("sync_status", { enum: ["synced", "pending_push", "conflict", "local_only"] }).default("local_only").notNull(),
  lastSyncAt: integer("last_sync_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("paid_ads_ad_groups_campaign_idx").on(table.campaignId),
  index("paid_ads_ad_groups_account_idx").on(table.accountId),
]);

// ==================== PAID ADS ADS ====================

export const paidAdsAds = sqliteTable("paid_ads_ads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adGroupId: integer("ad_group_id").notNull().references(() => paidAdsAdGroups.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  type: text("type", { enum: ["responsive_search", "responsive_display", "shopping", "video", "call", "app", "expanded_text"] }).notNull(),
  status: text("status", { enum: ["draft", "enabled", "paused", "removed"] }).default("draft").notNull(),
  headlines: text("headlines", { mode: "json" }).$type<string[]>(),
  descriptions: text("descriptions", { mode: "json" }).$type<string[]>(),
  finalUrls: text("final_urls", { mode: "json" }).$type<string[]>(),
  syncStatus: text("sync_status", { enum: ["synced", "pending_push", "conflict", "local_only"] }).default("local_only").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("paid_ads_ads_ad_group_idx").on(table.adGroupId),
  index("paid_ads_ads_account_idx").on(table.accountId),
]);

// ==================== PAID ADS KEYWORDS ====================

export const paidAdsKeywords = sqliteTable("paid_ads_keywords", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adGroupId: integer("ad_group_id").notNull().references(() => paidAdsAdGroups.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  keyword: text("keyword").notNull(),
  matchType: text("match_type", { enum: ["exact", "phrase", "broad"] }).notNull(),
  status: text("status", { enum: ["enabled", "paused", "removed"] }).default("enabled").notNull(),
  isNegative: integer("is_negative", { mode: "boolean" }).default(false).notNull(),
  maxCpc: real("max_cpc"),
  qualityScore: integer("quality_score"),
  syncStatus: text("sync_status", { enum: ["synced", "pending_push", "conflict", "local_only"] }).default("local_only").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("paid_ads_keywords_ad_group_idx").on(table.adGroupId),
  index("paid_ads_keywords_account_idx").on(table.accountId),
]);

// ==================== PAID ADS ASSETS ====================

export const paidAdsAssets = sqliteTable("paid_ads_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  type: text("type", { enum: ["image", "video", "headline", "description", "call_to_action", "logo", "sitelink", "callout"] }).notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  status: text("status", { enum: ["active", "paused", "removed"] }).default("active").notNull(),
  performanceLabel: text("performance_label", { enum: ["best", "good", "low", "pending", "unknown"] }).default("unknown").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("paid_ads_assets_account_idx").on(table.accountId),
  index("paid_ads_assets_type_idx").on(table.type),
]);

// ==================== PAID ADS AUDIENCES ====================

export const paidAdsAudiences = sqliteTable("paid_ads_audiences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", { enum: ["remarketing", "similar", "custom_intent", "in_market", "affinity", "combined", "customer_match"] }).notNull(),
  memberCount: integer("member_count"),
  status: text("status", { enum: ["active", "closed", "removed"] }).default("active").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("paid_ads_audiences_account_idx").on(table.accountId),
]);

// ==================== SEARCH INTELLIGENCE LINKS ====================

export const searchIntelligenceLinks = sqliteTable("search_intelligence_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => paidAdsCampaigns.id, { onDelete: "set null" }),
  semrushDomain: text("semrush_domain").notNull(),
  semrushDatabase: text("semrush_database").notNull().default("de"),
  syncMode: text("sync_mode").notNull().default("bidirectional"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastSyncAt: integer("last_sync_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("si_links_account_idx").on(table.accountId),
  index("si_links_active_idx").on(table.isActive),
]);

// ==================== API CREDENTIALS ====================

export const apiCredentials = sqliteTable("api_credentials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider", { enum: ["google_ads", "semrush"] }).notNull(),
  credentialKey: text("credential_key").notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  lastTestedAt: integer("last_tested_at", { mode: "timestamp" }),
  testStatus: text("test_status", { enum: ["untested", "success", "failed"] }).default("untested").notNull(),
  lastError: text("last_error"),
  createdBy: text("created_by").references(() => users.id),
  updatedBy: text("updated_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  uniqueIndex("api_cred_provider_key_unique").on(table.provider, table.credentialKey),
  index("api_cred_provider_idx").on(table.provider),
]);

// ==================== SEMRUSH KEYWORD DATA ====================

export const semrushKeywordData = sqliteTable("semrush_keyword_data", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  linkId: integer("link_id").notNull().references(() => searchIntelligenceLinks.id, { onDelete: "cascade" }),
  keyword: text("keyword").notNull(),
  database: text("database").notNull().default("de"),
  searchVolume: integer("search_volume").default(0).notNull(),
  cpc: real("cpc").default(0).notNull(),
  competition: real("competition").default(0).notNull(),
  difficulty: integer("difficulty"),
  intent: text("intent"),
  organicPosition: integer("organic_position"),
  paidPosition: integer("paid_position"),
  organicUrl: text("organic_url"),
  traffic: integer("traffic").default(0).notNull(),
  trafficPercent: real("traffic_percent").default(0).notNull(),
  source: text("source", { enum: ["organic", "paid", "both"] }).default("organic").notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("sr_kw_link_idx").on(table.linkId),
  index("sr_kw_keyword_idx").on(table.keyword),
  uniqueIndex("sr_kw_link_keyword_source_unique").on(table.linkId, table.keyword, table.source),
]);

// ==================== SEMRUSH COMPETITOR DATA ====================

export const semrushCompetitorData = sqliteTable("semrush_competitor_data", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  linkId: integer("link_id").notNull().references(() => searchIntelligenceLinks.id, { onDelete: "cascade" }),
  competitorDomain: text("competitor_domain").notNull(),
  database: text("database").notNull().default("de"),
  commonKeywords: integer("common_keywords").default(0).notNull(),
  organicKeywords: integer("organic_keywords").default(0).notNull(),
  organicTraffic: integer("organic_traffic").default(0).notNull(),
  organicCost: real("organic_cost").default(0).notNull(),
  paidKeywords: integer("paid_keywords").default(0).notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("sr_comp_link_idx").on(table.linkId),
  uniqueIndex("sr_comp_link_domain_unique").on(table.linkId, table.competitorDomain),
]);

// ==================== SEMRUSH DOMAIN HISTORY ====================

export const semrushDomainHistory = sqliteTable("semrush_domain_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  linkId: integer("link_id").notNull().references(() => searchIntelligenceLinks.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  database: text("database").notNull().default("de"),
  organicKeywords: integer("organic_keywords").default(0).notNull(),
  organicTraffic: integer("organic_traffic").default(0).notNull(),
  organicCost: real("organic_cost").default(0).notNull(),
  paidKeywords: integer("paid_keywords").default(0).notNull(),
  paidTraffic: integer("paid_traffic").default(0).notNull(),
  paidCost: real("paid_cost").default(0).notNull(),
  backlinks: integer("backlinks").default(0).notNull(),
  referringDomains: integer("referring_domains").default(0).notNull(),
  authorityScore: integer("authority_score").default(0).notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("sr_hist_link_idx").on(table.linkId),
  index("sr_hist_synced_idx").on(table.syncedAt),
]);

// ==================== PAID ADS SEARCH TERMS ====================

export const paidAdsSearchTerms = sqliteTable("paid_ads_search_terms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => paidAdsCampaigns.id, { onDelete: "set null" }),
  searchTerm: text("search_term").notNull(),
  keyword: text("keyword"),
  matchType: text("match_type"),
  impressions: integer("impressions").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  cost: integer("cost").default(0).notNull(),
  conversions: real("conversions").default(0).notNull(),
  cpa: integer("cpa"),
  status: text("status", { enum: ["profitable", "neutral", "waste"] }).default("neutral").notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pa_st_account_idx").on(table.accountId),
  index("pa_st_status_idx").on(table.status),
  uniqueIndex("pa_st_account_term_unique").on(table.accountId, table.searchTerm),
]);

// ==================== PAID ADS METRICS GEO ====================

export const paidAdsMetricsGeo = sqliteTable("paid_ads_metrics_geo", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => paidAdsCampaigns.id, { onDelete: "set null" }),
  region: text("region").notNull(),
  country: text("country").default("DE").notNull(),
  impressions: integer("impressions").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  cost: integer("cost").default(0).notNull(),
  conversions: real("conversions").default(0).notNull(),
  cpa: integer("cpa"),
  syncedAt: integer("synced_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pa_geo_account_idx").on(table.accountId),
  index("pa_geo_region_idx").on(table.region),
]);

// ==================== PAID ADS METRICS DEVICE ====================

export const paidAdsMetricsDevice = sqliteTable("paid_ads_metrics_device", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => paidAdsCampaigns.id, { onDelete: "set null" }),
  device: text("device", { enum: ["MOBILE", "DESKTOP", "TABLET", "OTHER"] }).notNull(),
  impressions: integer("impressions").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  cost: integer("cost").default(0).notNull(),
  conversions: real("conversions").default(0).notNull(),
  ctr: real("ctr").default(0).notNull(),
  conversionRate: real("conversion_rate").default(0).notNull(),
  cpc: integer("cpc").default(0).notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pa_dev_account_idx").on(table.accountId),
  uniqueIndex("pa_dev_account_device_unique").on(table.accountId, table.device),
]);

// ==================== PAID ADS METRICS HOUR ====================

export const paidAdsMetricsHour = sqliteTable("paid_ads_metrics_hour", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => paidAdsCampaigns.id, { onDelete: "set null" }),
  hour: integer("hour").notNull(),
  impressions: integer("impressions").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  cost: integer("cost").default(0).notNull(),
  conversions: real("conversions").default(0).notNull(),
  conversionRate: real("conversion_rate").default(0).notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pa_hour_account_idx").on(table.accountId),
  uniqueIndex("pa_hour_account_hour_unique").on(table.accountId, table.hour),
]);

// ==================== PAID ADS METRICS DAILY ====================

export const paidAdsMetricsDaily = sqliteTable("paid_ads_metrics_daily", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => paidAdsCampaigns.id, { onDelete: "set null" }),
  date: text("date").notNull(),
  impressions: integer("impressions").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  cost: integer("cost").default(0).notNull(),
  conversions: real("conversions").default(0).notNull(),
  conversionValue: real("conversion_value").default(0).notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pa_daily_account_idx").on(table.accountId),
  index("pa_daily_date_idx").on(table.date),
]);

// ==================== PAID ADS BUDGETS ====================

export const paidAdsBudgets = sqliteTable("paid_ads_budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => paidAdsCampaigns.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  period: text("period", { enum: ["daily", "monthly", "lifetime"] }).default("daily").notNull(),
  status: text("status", { enum: ["active", "paused", "exhausted"] }).default("active").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("paid_ads_budgets_account_idx").on(table.accountId),
]);

export const paidAdsBudgetPlans = sqliteTable("paid_ads_budget_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  month: text("month").notNull(),
  plannedBudget: real("planned_budget").notNull(),
  actualSpend: real("actual_spend").default(0).notNull(),
  forecastedSpend: real("forecasted_spend"),
  status: text("status", { enum: ["planned", "active", "completed", "overspent"] }).default("planned").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("paid_ads_budget_plans_account_idx").on(table.accountId),
  index("paid_ads_budget_plans_month_idx").on(table.month),
]);

export const paidAdsBudgetPacing = sqliteTable("paid_ads_budget_pacing", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  budgetPlanId: integer("budget_plan_id").notNull().references(() => paidAdsBudgetPlans.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  plannedSpend: real("planned_spend").notNull(),
  actualSpend: real("actual_spend").default(0).notNull(),
  cumulativePlanned: real("cumulative_planned").notNull(),
  cumulativeActual: real("cumulative_actual").default(0).notNull(),
  velocity: real("velocity"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("paid_ads_budget_pacing_plan_idx").on(table.budgetPlanId),
  index("paid_ads_budget_pacing_date_idx").on(table.date),
]);

// ==================== CONVERSION TRACKING ====================

export const paidAdsConversionActions = sqliteTable("paid_ads_conversion_actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  name: text("name").notNull(),
  category: text("category", { enum: ["purchase", "lead", "page_view", "sign_up", "add_to_cart", "begin_checkout", "contact", "custom"] }).notNull(),
  source: text("source", { enum: ["website", "app", "phone", "import", "store_visit"] }).default("website").notNull(),
  attributionModel: text("attribution_model", { enum: ["last_click", "first_click", "linear", "time_decay", "position_based", "data_driven"] }).default("last_click").notNull(),
  defaultValue: real("default_value"),
  isPrimary: integer("is_primary", { mode: "boolean" }).default(true).notNull(),
  status: text("status", { enum: ["active", "paused", "removed"] }).default("active").notNull(),
  tagStatus: text("tag_status", { enum: ["unverified", "active", "inactive", "conversion_delay"] }).default("unverified").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("paid_ads_conv_actions_account_idx").on(table.accountId),
  index("paid_ads_conv_actions_category_idx").on(table.category),
]);

export const paidAdsConversionEvents = sqliteTable("paid_ads_conversion_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversionActionId: integer("conversion_action_id").notNull().references(() => paidAdsConversionActions.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  gclid: text("gclid"),
  conversionValue: real("conversion_value"),
  currencyCode: text("currency_code").default("EUR"),
  orderId: text("order_id"),
  conversionDateTime: text("conversion_date_time").notNull(),
  uploadStatus: text("upload_status", { enum: ["pending", "uploaded", "failed"] }).default("pending").notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("paid_ads_conv_events_action_idx").on(table.conversionActionId),
  index("paid_ads_conv_events_gclid_idx").on(table.gclid),
]);

// ==================== TYPE EXPORTS ====================

export type SeoAudit = typeof seoAudits.$inferSelect;
export type SeoPagespeedResult = typeof seoPagespeedResults.$inferSelect;
export type SemrushSnapshot = typeof semrushSnapshots.$inferSelect;
export type SeoKeyword = typeof seoKeywords.$inferSelect;
export type SeoRankSnapshot = typeof seoRankSnapshots.$inferSelect;
export type SeoCompetitor = typeof seoCompetitors.$inferSelect;
export type TrackingEvent = typeof trackingEvents.$inferSelect;
export type TrackingSession = typeof trackingSessions.$inferSelect;
export type FunnelDefinition = typeof funnelDefinitions.$inferSelect;
export type UserCohort = typeof userCohorts.$inferSelect;
export type WebVitalsReport = typeof webVitalsReports.$inferSelect;

// ==================== PAID SEARCH TYPE EXPORTS ====================

export type PaidAdsAccount = typeof paidAdsAccounts.$inferSelect;
export type PaidAdsIntegration = typeof paidAdsIntegrations.$inferSelect;
export type PaidAdsCampaign = typeof paidAdsCampaigns.$inferSelect;
export type PaidAdsAdGroup = typeof paidAdsAdGroups.$inferSelect;
export type PaidAdsAd = typeof paidAdsAds.$inferSelect;
export type PaidAdsKeyword = typeof paidAdsKeywords.$inferSelect;
export type PaidAdsAsset = typeof paidAdsAssets.$inferSelect;
export type PaidAdsAudience = typeof paidAdsAudiences.$inferSelect;
export type SearchIntelligenceLink = typeof searchIntelligenceLinks.$inferSelect;
export type ApiCredential = typeof apiCredentials.$inferSelect;
export type SemrushKeywordDataRow = typeof semrushKeywordData.$inferSelect;
export type SemrushCompetitorDataRow = typeof semrushCompetitorData.$inferSelect;
export type SemrushDomainHistoryRow = typeof semrushDomainHistory.$inferSelect;
export type PaidAdsSearchTerm = typeof paidAdsSearchTerms.$inferSelect;
export type PaidAdsMetricGeo = typeof paidAdsMetricsGeo.$inferSelect;
export type PaidAdsMetricDevice = typeof paidAdsMetricsDevice.$inferSelect;
export type PaidAdsMetricHour = typeof paidAdsMetricsHour.$inferSelect;
export type PaidAdsMetricDaily = typeof paidAdsMetricsDaily.$inferSelect;
export type PaidAdsBudget = typeof paidAdsBudgets.$inferSelect;
export type PaidAdsBudgetPlan = typeof paidAdsBudgetPlans.$inferSelect;
export type PaidAdsBudgetPacingRow = typeof paidAdsBudgetPacing.$inferSelect;
export type PaidAdsConversionAction = typeof paidAdsConversionActions.$inferSelect;
export type PaidAdsConversionEvent = typeof paidAdsConversionEvents.$inferSelect;

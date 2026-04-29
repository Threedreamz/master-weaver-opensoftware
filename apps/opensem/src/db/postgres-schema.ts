// opensem Postgres Schema — extracted from admin-starter for OpenSoftware AppStore service
// Source: admin-starter/apps/admin/src/db/schema.ts
// Welle 1: Schema migration (SQLite shared @opensoftware/db -> standalone Postgres)
//
// Tables (33 total):
//   USERS (1):                  users (own copy, OIDC-synced)
//   PERMISSIONS (1):            adminPermissions
//   PAID ADS (17 + 2 changeset):
//     paidAdsAccounts, paidAdsIntegrations, paidAdsCampaigns, paidAdsAdGroups,
//     paidAdsAds, paidAdsAssets, paidAdsKeywords, paidAdsAudiences, paidAdsBudgets,
//     paidAdsBudgetPlans, paidAdsBudgetPacing, paidAdsConversionActions,
//     paidAdsConversionEvents, paidAdsTrackingHealth, paidAdsMetricsDaily,
//     paidAdsAlerts, paidAdsAuditLog,
//     mutationChangesets, mutationChangesetItems  (kept — FK target for organicSiteAuditIssues.ticketId)
//   SEARCH INTELLIGENCE + SEMRUSH (5):
//     searchIntelligenceLinks, apiCredentials,
//     semrushKeywordData, semrushCompetitorData, semrushDomainHistory
//   PAID ADS METRICS extras (4):
//     paidAdsSearchTerms, paidAdsMetricsGeo, paidAdsMetricsDevice, paidAdsMetricsHour
//   GSC (3 — included since they FK to searchIntelligenceLinks):
//     gscQueryMetrics, gscCoreWebVitals, gscIndexCoverage
//   SEARCH INTELLIGENCE RULES (1): searchIntelligenceRules
//   ORGANIC INTELLIGENCE (12):
//     organicVisibilitySnapshots, organicSerpFeatures, organicSiteAuditRuns,
//     organicSiteAuditIssues, organicBacklinks, organicBacklinkSnapshots,
//     organicDisavowEntries, organicMasterplanJobs, organicKeywordUniverse,
//     organicTopicClusters, organicSprints, organicRoadmapItems

import {
  pgTable,
  text,
  integer,
  serial,
  boolean,
  timestamp,
  doublePrecision,
  index,
  uniqueIndex,
  jsonb,
  primaryKey,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ==================== USERS (OIDC-synced) ====================
// opensem owns its own users table (synced via FinderAuth/3DreamzAuth OIDC).
// Schema mirrors admin-starter for compatibility with @mw/auth-nextauth's createAuth() factory.

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  role: text("role").default("user").notNull(),
  points: integer("points").default(0).notNull(),
  loginStreak: integer("login_streak").default(0).notNull(),
  longestLoginStreak: integer("longest_login_streak").default(0).notNull(),
  lastLoginDate: text("last_login_date"),
  verified: boolean("verified").default(false).notNull(),
  locale: text("locale").default("de").notNull(),
  adminPreferences: text("admin_preferences"),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("users_email_idx").on(table.email),
  index("users_username_idx").on(table.username),
  index("users_role_idx").on(table.role),
]);

// ==================== NEXTAUTH ADAPTER TABLES ====================
// Required by @auth/drizzle-adapter — accounts, sessions, verificationTokens.

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (table) => [
  uniqueIndex("accounts_provider_idx").on(table.provider, table.providerAccountId),
]);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.identifier, table.token] }),
]);

// ==================== ADMIN PERMISSIONS ====================

export const adminPermissions = pgTable("admin_permissions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permissionKey: text("permission_key").notNull(),
  granted: boolean("granted").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  uniqueIndex("admin_perms_user_key_idx").on(table.userId, table.permissionKey),
  index("admin_perms_user_idx").on(table.userId),
]);

export const adminPermissionsRelations = relations(adminPermissions, ({ one }) => ({
  user: one(users, { fields: [adminPermissions.userId], references: [users.id] }),
}));

// ==================== PAID ADS — Accounts & Integrations ====================

export const paidAdsAccounts = pgTable("paid_ads_accounts", {
  id: serial("id").primaryKey(),
  externalId: text("external_id"),
  name: text("name").notNull(),
  type: text("type").default("client").notNull(),
  parentAccountId: integer("parent_account_id"),
  currency: text("currency").default("EUR").notNull(),
  timezone: text("timezone").default("Europe/Berlin").notNull(),
  status: text("status").default("active").notNull(),
  lastSyncAt: timestamp("last_sync_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("paid_ads_accounts_external_id_idx").on(table.externalId),
  index("paid_ads_accounts_parent_idx").on(table.parentAccountId),
  index("paid_ads_accounts_status_idx").on(table.status),
]);

export const paidAdsIntegrations = pgTable("paid_ads_integrations", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  status: text("status").default("disconnected").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at", { mode: "date" }),
  scopes: text("scopes").$type<string[]>(),
  metadata: text("metadata").$type<Record<string, unknown>>(),
  lastHealthCheck: timestamp("last_health_check", { mode: "date" }),
  healthStatus: text("health_status").default("healthy").notNull(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("paid_ads_integrations_account_idx").on(table.accountId),
  index("paid_ads_integrations_platform_idx").on(table.platform),
  index("paid_ads_integrations_status_idx").on(table.status),
]);

// ==================== PAID ADS — Campaigns, Ad Groups, Ads ====================

export const paidAdsCampaigns = pgTable("paid_ads_campaigns", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").default("draft").notNull(),
  biddingStrategy: text("bidding_strategy"),
  dailyBudget: doublePrecision("daily_budget"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  targetLocations: text("target_locations").$type<string[]>(),
  targetLanguages: text("target_languages").$type<string[]>(),
  adSchedule: text("ad_schedule").$type<Record<string, unknown>[]>(),
  labels: text("labels").$type<string[]>(),
  notes: text("notes"),
  syncStatus: text("sync_status").default("local_only").notNull(),
  lastSyncAt: timestamp("last_sync_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("paid_ads_campaigns_account_idx").on(table.accountId),
  index("paid_ads_campaigns_external_idx").on(table.externalId),
  index("paid_ads_campaigns_status_idx").on(table.status),
  index("paid_ads_campaigns_type_idx").on(table.type),
  index("paid_ads_campaigns_sync_idx").on(table.syncStatus),
]);

export const paidAdsAdGroups = pgTable("paid_ads_ad_groups", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => paidAdsCampaigns.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  name: text("name").notNull(),
  status: text("status").default("draft").notNull(),
  type: text("type").default("standard").notNull(),
  cpcBid: doublePrecision("cpc_bid"),
  cpmBid: doublePrecision("cpm_bid"),
  targetCpa: doublePrecision("target_cpa"),
  targetRoas: doublePrecision("target_roas"),
  syncStatus: text("sync_status").default("local_only").notNull(),
  lastSyncAt: timestamp("last_sync_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("paid_ads_ad_groups_campaign_idx").on(table.campaignId),
  index("paid_ads_ad_groups_account_idx").on(table.accountId),
  index("paid_ads_ad_groups_external_idx").on(table.externalId),
  index("paid_ads_ad_groups_status_idx").on(table.status),
]);

export const paidAdsAds = pgTable("paid_ads_ads", {
  id: serial("id").primaryKey(),
  adGroupId: integer("ad_group_id").notNull().references(() => paidAdsAdGroups.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  type: text("type").notNull(),
  status: text("status").default("draft").notNull(),
  approvalStatus: text("approval_status").default("pending").notNull(),
  headlines: text("headlines").$type<string[]>(),
  descriptions: text("descriptions").$type<string[]>(),
  finalUrls: text("final_urls").$type<string[]>(),
  path1: text("path_1"),
  path2: text("path_2"),
  displayUrl: text("display_url"),
  disapprovalReasons: text("disapproval_reasons").$type<string[]>(),
  syncStatus: text("sync_status").default("local_only").notNull(),
  lastSyncAt: timestamp("last_sync_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("paid_ads_ads_ad_group_idx").on(table.adGroupId),
  index("paid_ads_ads_account_idx").on(table.accountId),
  index("paid_ads_ads_external_idx").on(table.externalId),
  index("paid_ads_ads_status_idx").on(table.status),
  index("paid_ads_ads_approval_idx").on(table.approvalStatus),
]);

// ==================== PAID ADS — Assets, Keywords, Audiences ====================

export const paidAdsAssets = pgTable("paid_ads_assets", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  type: text("type").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  metadata: text("metadata").$type<Record<string, unknown>>(),
  status: text("status").default("active").notNull(),
  performanceLabel: text("performance_label").default("unknown").notNull(),
  syncStatus: text("sync_status").default("local_only").notNull(),
  lastSyncAt: timestamp("last_sync_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("paid_ads_assets_account_idx").on(table.accountId),
  index("paid_ads_assets_type_idx").on(table.type),
  index("paid_ads_assets_status_idx").on(table.status),
]);

export const paidAdsKeywords = pgTable("paid_ads_keywords", {
  id: serial("id").primaryKey(),
  adGroupId: integer("ad_group_id").notNull().references(() => paidAdsAdGroups.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  keyword: text("keyword").notNull(),
  matchType: text("match_type").notNull(),
  status: text("status").default("enabled").notNull(),
  isNegative: boolean("is_negative").default(false).notNull(),
  maxCpc: doublePrecision("max_cpc"),
  qualityScore: integer("quality_score"),
  syncStatus: text("sync_status").default("local_only").notNull(),
  lastSyncAt: timestamp("last_sync_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("paid_ads_keywords_ad_group_idx").on(table.adGroupId),
  index("paid_ads_keywords_account_idx").on(table.accountId),
  index("paid_ads_keywords_match_idx").on(table.matchType),
  index("paid_ads_keywords_status_idx").on(table.status),
]);

export const paidAdsAudiences = pgTable("paid_ads_audiences", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  source: text("source").default("manual").notNull(),
  memberCount: integer("member_count"),
  status: text("status").default("active").notNull(),
  metadata: text("metadata").$type<Record<string, unknown>>(),
  syncStatus: text("sync_status").default("local_only").notNull(),
  lastSyncAt: timestamp("last_sync_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("paid_ads_audiences_account_idx").on(table.accountId),
  index("paid_ads_audiences_type_idx").on(table.type),
  index("paid_ads_audiences_status_idx").on(table.status),
]);

// ==================== PAID ADS — Budgets & Pacing ====================

export const paidAdsBudgets = pgTable("paid_ads_budgets", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => paidAdsCampaigns.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  amount: doublePrecision("amount").notNull(),
  period: text("period").default("daily").notNull(),
  deliveryMethod: text("delivery_method").default("standard").notNull(),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("paid_ads_budgets_account_idx").on(table.accountId),
  index("paid_ads_budgets_campaign_idx").on(table.campaignId),
  index("paid_ads_budgets_status_idx").on(table.status),
]);

export const paidAdsBudgetPlans = pgTable("paid_ads_budget_plans", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  month: text("month").notNull(),
  plannedBudget: doublePrecision("planned_budget").notNull(),
  actualSpend: doublePrecision("actual_spend").default(0).notNull(),
  forecastedSpend: doublePrecision("forecasted_spend"),
  status: text("status").default("planned").notNull(),
  adjustmentRules: text("adjustment_rules").$type<Record<string, unknown>>(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("paid_ads_budget_plans_account_idx").on(table.accountId),
  index("paid_ads_budget_plans_month_idx").on(table.month),
  index("paid_ads_budget_plans_status_idx").on(table.status),
]);

export const paidAdsBudgetPacing = pgTable("paid_ads_budget_pacing", {
  id: serial("id").primaryKey(),
  budgetPlanId: integer("budget_plan_id").notNull().references(() => paidAdsBudgetPlans.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  plannedSpend: doublePrecision("planned_spend").notNull(),
  actualSpend: doublePrecision("actual_spend").default(0).notNull(),
  cumulativePlanned: doublePrecision("cumulative_planned").notNull(),
  cumulativeActual: doublePrecision("cumulative_actual").default(0).notNull(),
  velocity: doublePrecision("velocity"),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("paid_ads_budget_pacing_plan_idx").on(table.budgetPlanId),
  index("paid_ads_budget_pacing_date_idx").on(table.date),
]);

// ==================== PAID ADS — Conversion Tracking ====================

export const paidAdsConversionActions = pgTable("paid_ads_conversion_actions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  name: text("name").notNull(),
  category: text("category").notNull(),
  source: text("source").default("website").notNull(),
  countingType: text("counting_type").default("one_per_click").notNull(),
  attributionModel: text("attribution_model").default("last_click").notNull(),
  defaultValue: doublePrecision("default_value"),
  isPrimary: boolean("is_primary").default(true).notNull(),
  status: text("status").default("active").notNull(),
  tagStatus: text("tag_status").default("unverified").notNull(),
  lastConversionAt: timestamp("last_conversion_at", { mode: "date" }),
  syncStatus: text("sync_status").default("local_only").notNull(),
  lastSyncAt: timestamp("last_sync_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("paid_ads_conv_actions_account_idx").on(table.accountId),
  index("paid_ads_conv_actions_category_idx").on(table.category),
  index("paid_ads_conv_actions_status_idx").on(table.status),
  index("paid_ads_conv_actions_tag_idx").on(table.tagStatus),
]);

export const paidAdsConversionEvents = pgTable("paid_ads_conversion_events", {
  id: serial("id").primaryKey(),
  conversionActionId: integer("conversion_action_id").notNull().references(() => paidAdsConversionActions.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  gclid: text("gclid"),
  gbraid: text("gbraid"),
  wbraid: text("wbraid"),
  conversionValue: doublePrecision("conversion_value"),
  currencyCode: text("currency_code").default("EUR"),
  orderId: text("order_id"),
  conversionDateTime: text("conversion_date_time").notNull(),
  uploadStatus: text("upload_status").default("pending").notNull(),
  metadata: text("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("paid_ads_conv_events_action_idx").on(table.conversionActionId),
  index("paid_ads_conv_events_account_idx").on(table.accountId),
  index("paid_ads_conv_events_gclid_idx").on(table.gclid),
  index("paid_ads_conv_events_upload_idx").on(table.uploadStatus),
]);

export const paidAdsTrackingHealth = pgTable("paid_ads_tracking_health", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  conversionActionId: integer("conversion_action_id").references(() => paidAdsConversionActions.id, { onDelete: "set null" }),
  metric: text("metric").notNull(),
  severity: text("severity").notNull(),
  status: text("status").default("active").notNull(),
  details: text("details"),
  detectedAt: timestamp("detected_at", { mode: "date" }).default(sql`now()`).notNull(),
  resolvedAt: timestamp("resolved_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("paid_ads_tracking_health_account_idx").on(table.accountId),
  index("paid_ads_tracking_health_metric_idx").on(table.metric),
  index("paid_ads_tracking_health_status_idx").on(table.status),
  index("paid_ads_tracking_health_severity_idx").on(table.severity),
]);

// ==================== MUTATION CHANGESETS (shared paid+organic approval inbox) ====================

export const mutationChangesets = pgTable("mutation_changesets", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().references(() => users.id),
  approvedBy: text("approved_by").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("draft").notNull(),
  scope: text("scope").default("paid").notNull(),
  deployedAt: timestamp("deployed_at", { mode: "date" }),
  errorLog: text("error_log"),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("mutation_changesets_account_idx").on(table.accountId),
  index("mutation_changesets_status_idx").on(table.status),
  index("mutation_changesets_scope_idx").on(table.scope, table.status),
  index("mutation_changesets_created_by_idx").on(table.createdBy),
]);

export const mutationChangesetItems = pgTable("mutation_changeset_items", {
  id: serial("id").primaryKey(),
  changesetId: integer("changeset_id").notNull().references(() => mutationChangesets.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  fieldChanges: text("field_changes").$type<Record<string, { before: unknown; after: unknown }>>(),
  status: text("status").default("pending").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("mutation_changeset_items_changeset_idx").on(table.changesetId),
  index("mutation_changeset_items_entity_idx").on(table.entityType, table.entityId),
]);

// ==================== PAID ADS — Daily Metrics ====================

export const paidAdsMetricsDaily = pgTable("paid_ads_metrics_daily", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => paidAdsCampaigns.id, { onDelete: "set null" }),
  adGroupId: integer("ad_group_id").references(() => paidAdsAdGroups.id, { onDelete: "set null" }),
  date: text("date").notNull(),
  impressions: integer("impressions").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  cost: doublePrecision("cost").default(0).notNull(),
  conversions: doublePrecision("conversions").default(0).notNull(),
  conversionValue: doublePrecision("conversion_value").default(0).notNull(),
  ctr: doublePrecision("ctr"),
  avgCpc: doublePrecision("avg_cpc"),
  impressionShare: doublePrecision("impression_share"),
  lostIsBudget: doublePrecision("lost_is_budget"),
  lostIsRank: doublePrecision("lost_is_rank"),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("paid_ads_metrics_daily_account_idx").on(table.accountId),
  index("paid_ads_metrics_daily_campaign_idx").on(table.campaignId),
  index("paid_ads_metrics_daily_date_idx").on(table.date),
  index("paid_ads_metrics_daily_account_date_idx").on(table.accountId, table.date),
]);

// ==================== PAID ADS — Alerts & Audit Log ====================

export const paidAdsAlerts = pgTable("paid_ads_alerts", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  status: text("status").default("active").notNull(),
  resolvedAt: timestamp("resolved_at", { mode: "date" }),
  resolvedBy: text("resolved_by").references(() => users.id),
  metadata: text("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("paid_ads_alerts_account_idx").on(table.accountId),
  index("paid_ads_alerts_type_idx").on(table.type),
  index("paid_ads_alerts_severity_idx").on(table.severity),
  index("paid_ads_alerts_status_idx").on(table.status),
]);

export const paidAdsAuditLog = pgTable("paid_ads_audit_log", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => paidAdsAccounts.id, { onDelete: "set null" }),
  userId: text("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  before: text("before").$type<Record<string, unknown>>(),
  after: text("after").$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("paid_ads_audit_log_account_idx").on(table.accountId),
  index("paid_ads_audit_log_user_idx").on(table.userId),
  index("paid_ads_audit_log_entity_idx").on(table.entityType, table.entityId),
  index("paid_ads_audit_log_created_idx").on(table.createdAt),
]);

// ==================== PAID ADS — Relations ====================

export const paidAdsAccountsRelations = relations(paidAdsAccounts, ({ many, one }) => ({
  integrations: many(paidAdsIntegrations),
  campaigns: many(paidAdsCampaigns),
  budgets: many(paidAdsBudgets),
  budgetPlans: many(paidAdsBudgetPlans),
  conversionActions: many(paidAdsConversionActions),
  alerts: many(paidAdsAlerts),
  metrics: many(paidAdsMetricsDaily),
  changesets: many(mutationChangesets),
  auditLog: many(paidAdsAuditLog),
  parent: one(paidAdsAccounts, { fields: [paidAdsAccounts.parentAccountId], references: [paidAdsAccounts.id] }),
}));

export const paidAdsIntegrationsRelations = relations(paidAdsIntegrations, ({ one }) => ({
  account: one(paidAdsAccounts, { fields: [paidAdsIntegrations.accountId], references: [paidAdsAccounts.id] }),
}));

export const paidAdsCampaignsRelations = relations(paidAdsCampaigns, ({ one, many }) => ({
  account: one(paidAdsAccounts, { fields: [paidAdsCampaigns.accountId], references: [paidAdsAccounts.id] }),
  adGroups: many(paidAdsAdGroups),
  budget: one(paidAdsBudgets),
  metrics: many(paidAdsMetricsDaily),
}));

export const paidAdsAdGroupsRelations = relations(paidAdsAdGroups, ({ one, many }) => ({
  campaign: one(paidAdsCampaigns, { fields: [paidAdsAdGroups.campaignId], references: [paidAdsCampaigns.id] }),
  account: one(paidAdsAccounts, { fields: [paidAdsAdGroups.accountId], references: [paidAdsAccounts.id] }),
  ads: many(paidAdsAds),
  keywords: many(paidAdsKeywords),
}));

export const paidAdsAdsRelations = relations(paidAdsAds, ({ one }) => ({
  adGroup: one(paidAdsAdGroups, { fields: [paidAdsAds.adGroupId], references: [paidAdsAdGroups.id] }),
  account: one(paidAdsAccounts, { fields: [paidAdsAds.accountId], references: [paidAdsAccounts.id] }),
}));

export const paidAdsKeywordsRelations = relations(paidAdsKeywords, ({ one }) => ({
  adGroup: one(paidAdsAdGroups, { fields: [paidAdsKeywords.adGroupId], references: [paidAdsAdGroups.id] }),
  account: one(paidAdsAccounts, { fields: [paidAdsKeywords.accountId], references: [paidAdsAccounts.id] }),
}));

export const paidAdsAudiencesRelations = relations(paidAdsAudiences, ({ one }) => ({
  account: one(paidAdsAccounts, { fields: [paidAdsAudiences.accountId], references: [paidAdsAccounts.id] }),
}));

export const paidAdsBudgetsRelations = relations(paidAdsBudgets, ({ one }) => ({
  account: one(paidAdsAccounts, { fields: [paidAdsBudgets.accountId], references: [paidAdsAccounts.id] }),
  campaign: one(paidAdsCampaigns, { fields: [paidAdsBudgets.campaignId], references: [paidAdsCampaigns.id] }),
}));

export const paidAdsBudgetPlansRelations = relations(paidAdsBudgetPlans, ({ one, many }) => ({
  account: one(paidAdsAccounts, { fields: [paidAdsBudgetPlans.accountId], references: [paidAdsAccounts.id] }),
  pacing: many(paidAdsBudgetPacing),
}));

export const paidAdsBudgetPacingRelations = relations(paidAdsBudgetPacing, ({ one }) => ({
  budgetPlan: one(paidAdsBudgetPlans, { fields: [paidAdsBudgetPacing.budgetPlanId], references: [paidAdsBudgetPlans.id] }),
}));

export const paidAdsConversionActionsRelations = relations(paidAdsConversionActions, ({ one, many }) => ({
  account: one(paidAdsAccounts, { fields: [paidAdsConversionActions.accountId], references: [paidAdsAccounts.id] }),
  events: many(paidAdsConversionEvents),
  healthChecks: many(paidAdsTrackingHealth),
}));

export const paidAdsConversionEventsRelations = relations(paidAdsConversionEvents, ({ one }) => ({
  conversionAction: one(paidAdsConversionActions, { fields: [paidAdsConversionEvents.conversionActionId], references: [paidAdsConversionActions.id] }),
  account: one(paidAdsAccounts, { fields: [paidAdsConversionEvents.accountId], references: [paidAdsAccounts.id] }),
}));

export const paidAdsTrackingHealthRelations = relations(paidAdsTrackingHealth, ({ one }) => ({
  account: one(paidAdsAccounts, { fields: [paidAdsTrackingHealth.accountId], references: [paidAdsAccounts.id] }),
  conversionAction: one(paidAdsConversionActions, { fields: [paidAdsTrackingHealth.conversionActionId], references: [paidAdsConversionActions.id] }),
}));

export const mutationChangesetsRelations = relations(mutationChangesets, ({ one, many }) => ({
  account: one(paidAdsAccounts, { fields: [mutationChangesets.accountId], references: [paidAdsAccounts.id] }),
  creator: one(users, { fields: [mutationChangesets.createdBy], references: [users.id] }),
  approver: one(users, { fields: [mutationChangesets.approvedBy], references: [users.id] }),
  items: many(mutationChangesetItems),
}));

export const mutationChangesetItemsRelations = relations(mutationChangesetItems, ({ one }) => ({
  changeset: one(mutationChangesets, { fields: [mutationChangesetItems.changesetId], references: [mutationChangesets.id] }),
}));

export const paidAdsMetricsDailyRelations = relations(paidAdsMetricsDaily, ({ one }) => ({
  account: one(paidAdsAccounts, { fields: [paidAdsMetricsDaily.accountId], references: [paidAdsAccounts.id] }),
  campaign: one(paidAdsCampaigns, { fields: [paidAdsMetricsDaily.campaignId], references: [paidAdsCampaigns.id] }),
  adGroup: one(paidAdsAdGroups, { fields: [paidAdsMetricsDaily.adGroupId], references: [paidAdsAdGroups.id] }),
}));

export const paidAdsAlertsRelations = relations(paidAdsAlerts, ({ one }) => ({
  account: one(paidAdsAccounts, { fields: [paidAdsAlerts.accountId], references: [paidAdsAccounts.id] }),
  resolver: one(users, { fields: [paidAdsAlerts.resolvedBy], references: [users.id] }),
}));

export const paidAdsAuditLogRelations = relations(paidAdsAuditLog, ({ one }) => ({
  account: one(paidAdsAccounts, { fields: [paidAdsAuditLog.accountId], references: [paidAdsAccounts.id] }),
  user: one(users, { fields: [paidAdsAuditLog.userId], references: [users.id] }),
}));

// ==================== SEARCH INTELLIGENCE LINKS ====================

export const searchIntelligenceLinks = pgTable("search_intelligence_links", {
  id:              serial("id").primaryKey(),
  accountId:       integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  campaignId:      integer("campaign_id").references(() => paidAdsCampaigns.id, { onDelete: "set null" }),
  semrushDomain:   text("semrush_domain").notNull(),
  semrushDatabase: text("semrush_database").notNull().default("de"),
  syncMode:        text("sync_mode").notNull().default("bidirektional"),
  isActive:        boolean("is_active").notNull().default(true),
  lastSyncAt:      timestamp("last_sync_at", { mode: "date" }),
  createdAt:       timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt:       timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("si_links_account_idx").on(table.accountId),
  index("si_links_campaign_idx").on(table.campaignId),
  index("si_links_active_idx").on(table.isActive),
]);

// ==================== API CREDENTIALS ====================

export const apiCredentials = pgTable("api_credentials", {
  id:             serial("id").primaryKey(),
  provider:       text("provider").notNull(),
  credentialKey:  text("credential_key").notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  lastTestedAt:   timestamp("last_tested_at", { mode: "date" }),
  testStatus:     text("test_status").default("untested").notNull(),
  lastError:      text("last_error"),
  createdBy:      text("created_by").references(() => users.id),
  updatedBy:      text("updated_by").references(() => users.id),
  createdAt:      timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt:      timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  uniqueIndex("api_cred_provider_key_unique").on(table.provider, table.credentialKey),
  index("api_cred_provider_idx").on(table.provider),
]);

// ==================== SEMRUSH ====================

export const semrushKeywordData = pgTable("semrush_keyword_data", {
  id:               serial("id").primaryKey(),
  linkId:           integer("link_id").references(() => searchIntelligenceLinks.id, { onDelete: "cascade" }),
  keyword:          text("keyword").notNull(),
  database:         text("database").notNull().default("de"),
  searchVolume:     integer("search_volume").default(0).notNull(),
  cpc:              doublePrecision("cpc").default(0).notNull(),
  competition:      doublePrecision("competition").default(0).notNull(),
  difficulty:       integer("difficulty"),
  intent:           text("intent"),
  organicPosition:  integer("organic_position"),
  paidPosition:     integer("paid_position"),
  organicUrl:       text("organic_url"),
  traffic:          integer("traffic").default(0).notNull(),
  trafficPercent:   doublePrecision("traffic_percent").default(0).notNull(),
  source:           varchar("source", { length: 20 }).default("semrush").notNull(),
  syncedAt:         timestamp("synced_at", { mode: "date" }).default(sql`now()`).notNull(),
  createdAt:        timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("sr_kw_link_idx").on(table.linkId),
  index("sr_kw_keyword_idx").on(table.keyword),
  index("sr_kw_source_idx").on(table.source),
  uniqueIndex("sr_kw_link_keyword_source_unique").on(table.linkId, table.keyword, table.source),
]);

export const semrushCompetitorData = pgTable("semrush_competitor_data", {
  id:               serial("id").primaryKey(),
  linkId:           integer("link_id").references(() => searchIntelligenceLinks.id, { onDelete: "cascade" }),
  competitorDomain: text("competitor_domain").notNull(),
  database:         text("database").notNull().default("de"),
  commonKeywords:   integer("common_keywords").default(0).notNull(),
  organicKeywords:  integer("organic_keywords").default(0).notNull(),
  organicTraffic:   integer("organic_traffic").default(0).notNull(),
  organicCost:      doublePrecision("organic_cost").default(0).notNull(),
  paidKeywords:     integer("paid_keywords").default(0).notNull(),
  source:           varchar("source", { length: 20 }).default("semrush").notNull(),
  syncedAt:         timestamp("synced_at", { mode: "date" }).default(sql`now()`).notNull(),
  createdAt:        timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("sr_comp_link_idx").on(table.linkId),
  index("sr_comp_source_idx").on(table.source),
  uniqueIndex("sr_comp_link_domain_unique").on(table.linkId, table.competitorDomain),
]);

export const semrushDomainHistory = pgTable("semrush_domain_history", {
  id:               serial("id").primaryKey(),
  linkId:           integer("link_id").references(() => searchIntelligenceLinks.id, { onDelete: "cascade" }),
  domain:           text("domain").notNull(),
  database:         text("database").notNull().default("de"),
  organicKeywords:  integer("organic_keywords").default(0).notNull(),
  organicTraffic:   integer("organic_traffic").default(0).notNull(),
  organicCost:      doublePrecision("organic_cost").default(0).notNull(),
  paidKeywords:     integer("paid_keywords").default(0).notNull(),
  paidTraffic:      integer("paid_traffic").default(0).notNull(),
  paidCost:         doublePrecision("paid_cost").default(0).notNull(),
  backlinks:        integer("backlinks").default(0).notNull(),
  referringDomains: integer("referring_domains").default(0).notNull(),
  authorityScore:   integer("authority_score").default(0).notNull(),
  syncedAt:         timestamp("synced_at", { mode: "date" }).default(sql`now()`).notNull(),
  createdAt:        timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("sr_hist_link_idx").on(table.linkId),
  index("sr_hist_synced_idx").on(table.syncedAt),
]);

// ==================== PAID ADS — Search Terms / Geo / Device / Hour ====================

export const paidAdsSearchTerms = pgTable("paid_ads_search_terms", {
  id:           serial("id").primaryKey(),
  accountId:    integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  campaignId:   integer("campaign_id").references(() => paidAdsCampaigns.id, { onDelete: "set null" }),
  searchTerm:   text("search_term").notNull(),
  keyword:      text("keyword"),
  matchType:    text("match_type"),
  impressions:  integer("impressions").default(0).notNull(),
  clicks:       integer("clicks").default(0).notNull(),
  cost:         integer("cost").default(0).notNull(),
  conversions:  doublePrecision("conversions").default(0).notNull(),
  cpa:          integer("cpa"),
  status:       text("status").default("neutral").notNull(),
  syncedAt:     timestamp("synced_at", { mode: "date" }).default(sql`now()`).notNull(),
  createdAt:    timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("pa_st_account_idx").on(table.accountId),
  index("pa_st_status_idx").on(table.status),
  uniqueIndex("pa_st_account_term_unique").on(table.accountId, table.searchTerm),
]);

export const paidAdsMetricsGeo = pgTable("paid_ads_metrics_geo", {
  id:           serial("id").primaryKey(),
  accountId:    integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  campaignId:   integer("campaign_id").references(() => paidAdsCampaigns.id, { onDelete: "set null" }),
  region:       text("region").notNull(),
  country:      text("country").default("DE").notNull(),
  impressions:  integer("impressions").default(0).notNull(),
  clicks:       integer("clicks").default(0).notNull(),
  cost:         integer("cost").default(0).notNull(),
  conversions:  doublePrecision("conversions").default(0).notNull(),
  cpa:          integer("cpa"),
  syncedAt:     timestamp("synced_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("pa_geo_account_idx").on(table.accountId),
  index("pa_geo_region_idx").on(table.region),
]);

export const paidAdsMetricsDevice = pgTable("paid_ads_metrics_device", {
  id:              serial("id").primaryKey(),
  accountId:       integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  campaignId:      integer("campaign_id").references(() => paidAdsCampaigns.id, { onDelete: "set null" }),
  device:          text("device").notNull(),
  impressions:     integer("impressions").default(0).notNull(),
  clicks:          integer("clicks").default(0).notNull(),
  cost:            integer("cost").default(0).notNull(),
  conversions:     doublePrecision("conversions").default(0).notNull(),
  ctr:             doublePrecision("ctr").default(0).notNull(),
  conversionRate:  doublePrecision("conversion_rate").default(0).notNull(),
  cpc:             integer("cpc").default(0).notNull(),
  syncedAt:        timestamp("synced_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("pa_dev_account_idx").on(table.accountId),
  uniqueIndex("pa_dev_account_device_unique").on(table.accountId, table.device),
]);

export const paidAdsMetricsHour = pgTable("paid_ads_metrics_hour", {
  id:              serial("id").primaryKey(),
  accountId:       integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  campaignId:      integer("campaign_id").references(() => paidAdsCampaigns.id, { onDelete: "set null" }),
  hour:            integer("hour").notNull(),
  impressions:     integer("impressions").default(0).notNull(),
  clicks:          integer("clicks").default(0).notNull(),
  cost:            integer("cost").default(0).notNull(),
  conversions:     doublePrecision("conversions").default(0).notNull(),
  conversionRate:  doublePrecision("conversion_rate").default(0).notNull(),
  syncedAt:        timestamp("synced_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("pa_hour_account_idx").on(table.accountId),
  uniqueIndex("pa_hour_account_hour_unique").on(table.accountId, table.hour),
]);

// ==================== SEARCH INTELLIGENCE RULES ====================

export interface RuleCondition {
  field: "organic_position" | "ctr_14d" | "cost_no_conversion" | "competitor_position_delta" | "search_volume_spike";
  operator: "lt" | "lte" | "gt" | "gte" | "eq";
  value: number;
  timeframeDays?: number;
}

export const searchIntelligenceRules = pgTable("search_intelligence_rules", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => paidAdsAccounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(false).notNull(),
  conditions: text("conditions").$type<RuleCondition[]>().notNull(),
  action: text("action", {
    enum: [
      "increase_bid",
      "decrease_bid",
      "pause_keyword",
      "pause_campaign",
      "add_negative_keyword",
      "create_campaign_draft",
    ],
  }).notNull(),
  actionConfig: text("action_config").$type<Record<string, unknown>>(),
  checkInterval: text("check_interval", {
    enum: ["hourly", "daily", "weekly"],
  }).default("daily").notNull(),
  lastEvaluatedAt: timestamp("last_evaluated_at", { mode: "date" }),
  executionCount: integer("execution_count").default(0).notNull(),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("search_intelligence_rules_account_idx").on(table.accountId),
  index("search_intelligence_rules_active_idx").on(table.isActive),
  index("search_intelligence_rules_interval_idx").on(table.checkInterval),
]);

// ==================== ORGANIC INTELLIGENCE — M1 ====================

export const organicVisibilitySnapshots = pgTable("organic_visibility_snapshots", {
  id:               serial("id").primaryKey(),
  linkId:           integer("link_id").notNull().references(() => searchIntelligenceLinks.id, { onDelete: "cascade" }),
  snapshotDate:     timestamp("snapshot_date", { mode: "date" }).notNull(),
  domain:           text("domain").notNull(),
  isCompetitor:     boolean("is_competitor").default(false).notNull(),
  database:         text("database").notNull().default("de"),
  visibilityScore:  doublePrecision("visibility_score").default(0).notNull(),
  estimatedTraffic: integer("estimated_traffic").default(0).notNull(),
  top3Count:        integer("top3_count").default(0).notNull(),
  top10Count:       integer("top10_count").default(0).notNull(),
  top20Count:       integer("top20_count").default(0).notNull(),
  avgPosition:      doublePrecision("avg_position").default(0).notNull(),
  createdAt:        timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("organic_vis_link_date_idx").on(table.linkId, table.snapshotDate),
  uniqueIndex("organic_vis_link_domain_date_unique").on(table.linkId, table.domain, table.snapshotDate),
]);

// ==================== GSC (extracted with organic — FK to searchIntelligenceLinks) ====================

export const gscQueryMetrics = pgTable("gsc_query_metrics", {
  id:          serial("id").primaryKey(),
  linkId:      integer("link_id").notNull().references(() => searchIntelligenceLinks.id, { onDelete: "cascade" }),
  date:        timestamp("date", { mode: "date" }).notNull(),
  page:        text("page").notNull(),
  query:       text("query").notNull(),
  device:      text("device").notNull().default("ALL"),
  country:     text("country").notNull().default("ALL"),
  clicks:      integer("clicks").default(0).notNull(),
  impressions: integer("impressions").default(0).notNull(),
  ctr:         doublePrecision("ctr").default(0).notNull(),
  position:    doublePrecision("position").default(0).notNull(),
  syncedAt:    timestamp("synced_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("gsc_qm_link_date_idx").on(table.linkId, table.date),
  index("gsc_qm_page_idx").on(table.page),
  index("gsc_qm_query_idx").on(table.query),
  uniqueIndex("gsc_qm_unique").on(table.linkId, table.date, table.page, table.query, table.device),
]);

export const gscCoreWebVitals = pgTable("gsc_core_web_vitals", {
  id:            serial("id").primaryKey(),
  linkId:        integer("link_id").notNull().references(() => searchIntelligenceLinks.id, { onDelete: "cascade" }),
  url:           text("url").notNull(),
  formFactor:    text("form_factor").notNull().default("mobile"),
  lcpP75Ms:      doublePrecision("lcp_p75_ms"),
  inpP75Ms:      doublePrecision("inp_p75_ms"),
  clsP75:        doublePrecision("cls_p75"),
  overallStatus: text("overall_status"),
  measuredAt:    timestamp("measured_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("gsc_cwv_link_idx").on(table.linkId),
  uniqueIndex("gsc_cwv_unique").on(table.linkId, table.url, table.formFactor),
]);

export const gscIndexCoverage = pgTable("gsc_index_coverage", {
  id:          serial("id").primaryKey(),
  linkId:      integer("link_id").notNull().references(() => searchIntelligenceLinks.id, { onDelete: "cascade" }),
  url:         text("url").notNull(),
  state:       text("state").notNull(),
  verdict:     text("verdict"),
  lastCrawled: timestamp("last_crawled", { mode: "date" }),
  syncedAt:    timestamp("synced_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("gsc_ix_link_verdict_idx").on(table.linkId, table.verdict),
  uniqueIndex("gsc_ix_link_url_unique").on(table.linkId, table.url),
]);

// ==================== ORGANIC INTELLIGENCE — M2 ====================

export const organicSerpFeatures = pgTable("organic_serp_features", {
  id:                 serial("id").primaryKey(),
  linkId:             integer("link_id").notNull().references(() => searchIntelligenceLinks.id, { onDelete: "cascade" }),
  keyword:            text("keyword").notNull(),
  database:           text("database").notNull().default("de"),
  hasFeaturedSnippet: boolean("has_featured_snippet").default(false).notNull(),
  hasPaa:             boolean("has_paa").default(false).notNull(),
  hasKnowledgePanel:  boolean("has_knowledge_panel").default(false).notNull(),
  hasVideoCarousel:   boolean("has_video_carousel").default(false).notNull(),
  hasLocalPack:       boolean("has_local_pack").default(false).notNull(),
  ownsFeature:        text("owns_feature").default("none").notNull(),
  opportunityScore:   integer("opportunity_score").default(0).notNull(),
  syncedAt:           timestamp("synced_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("organic_serp_link_idx").on(table.linkId),
  index("organic_serp_opp_idx").on(table.opportunityScore),
  uniqueIndex("organic_serp_unique").on(table.linkId, table.keyword, table.database),
]);

// ==================== ORGANIC INTELLIGENCE — M3 (Site Audits) ====================

export const organicSiteAuditRuns = pgTable("organic_site_audit_runs", {
  id:            serial("id").primaryKey(),
  linkId:        integer("link_id").notNull().references(() => searchIntelligenceLinks.id, { onDelete: "cascade" }),
  campaignId:    text("campaign_id").notNull(),
  snapshotId:    text("snapshot_id"),
  status:        text("status").notNull().default("pending"),
  totalPages:    integer("total_pages").default(0).notNull(),
  errorsCount:   integer("errors_count").default(0).notNull(),
  warningsCount: integer("warnings_count").default(0).notNull(),
  noticesCount:  integer("notices_count").default(0).notNull(),
  siteHealth:    integer("site_health").default(0).notNull(),
  startedAt:     timestamp("started_at", { mode: "date" }),
  finishedAt:    timestamp("finished_at", { mode: "date" }),
  createdAt:     timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("organic_audit_link_idx").on(table.linkId),
  index("organic_audit_status_idx").on(table.status),
]);

export const organicSiteAuditIssues = pgTable("organic_site_audit_issues", {
  id:                serial("id").primaryKey(),
  runId:             integer("run_id").notNull().references(() => organicSiteAuditRuns.id, { onDelete: "cascade" }),
  issueCode:         text("issue_code").notNull(),
  severity:          text("severity").notNull().default("notice"),
  issueTitle:        text("issue_title").notNull(),
  affectedPageCount: integer("affected_page_count").default(0).notNull(),
  sampleUrls:        jsonb("sample_urls").$type<string[]>().default([]).notNull(),
  category:          text("category").notNull().default("technical"),
  ticketId:          integer("ticket_id").references(() => mutationChangesetItems.id, { onDelete: "set null" }),
}, (table) => [
  index("organic_audit_issues_run_idx").on(table.runId),
  index("organic_audit_issues_severity_idx").on(table.severity),
  uniqueIndex("organic_audit_issues_unique").on(table.runId, table.issueCode),
]);

// ==================== ORGANIC INTELLIGENCE — M4 (Authority & Off-Page) ====================

export const organicBacklinks = pgTable("organic_backlinks", {
  id:              serial("id").primaryKey(),
  linkId:          integer("link_id").notNull().references(() => searchIntelligenceLinks.id, { onDelete: "cascade" }),
  sourceUrl:       text("source_url").notNull(),
  targetUrl:       text("target_url").notNull().default(""),
  anchorText:      text("anchor_text").notNull().default(""),
  domainAuthority: integer("domain_authority").default(0).notNull(),
  pageAuthority:   integer("page_authority").default(0).notNull(),
  linkType:        text("link_type").notNull().default("follow"),
  firstSeen:       timestamp("first_seen", { mode: "date" }),
  lastSeen:        timestamp("last_seen", { mode: "date" }),
  status:          text("status").notNull().default("active"),
  sourceTld:       text("source_tld").default("").notNull(),
  toxicityScore:   integer("toxicity_score").default(0).notNull(),
  isDisavowed:     boolean("is_disavowed").default(false).notNull(),
  syncedAt:        timestamp("synced_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("organic_bl_link_idx").on(table.linkId),
  index("organic_bl_status_idx").on(table.status),
  index("organic_bl_tox_idx").on(table.toxicityScore),
  uniqueIndex("organic_bl_unique").on(table.linkId, table.sourceUrl, table.targetUrl),
]);

export const organicBacklinkSnapshots = pgTable("organic_backlink_snapshots", {
  id:               serial("id").primaryKey(),
  linkId:           integer("link_id").notNull().references(() => searchIntelligenceLinks.id, { onDelete: "cascade" }),
  snapshotDate:     timestamp("snapshot_date", { mode: "date" }).notNull(),
  totalBacklinks:   integer("total_backlinks").default(0).notNull(),
  referringDomains: integer("referring_domains").default(0).notNull(),
  newCount:         integer("new_count").default(0).notNull(),
  lostCount:        integer("lost_count").default(0).notNull(),
  authorityScore:   integer("authority_score").default(0).notNull(),
}, (table) => [
  index("organic_bl_snap_link_idx").on(table.linkId),
  uniqueIndex("organic_bl_snap_unique").on(table.linkId, table.snapshotDate),
]);

export const organicDisavowEntries = pgTable("organic_disavow_entries", {
  id:             serial("id").primaryKey(),
  linkId:         integer("link_id").notNull().references(() => searchIntelligenceLinks.id, { onDelete: "cascade" }),
  domainOrUrl:    text("domain_or_url").notNull(),
  isDomain:       boolean("is_domain").default(true).notNull(),
  reason:         text("reason").default("").notNull(),
  addedByUserId:  text("added_by_user_id").references(() => users.id, { onDelete: "set null" }),
  exportedAt:     timestamp("exported_at", { mode: "date" }),
  createdAt:      timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("organic_disavow_link_idx").on(table.linkId),
  uniqueIndex("organic_disavow_unique").on(table.linkId, table.domainOrUrl),
]);

// ==================== ORGANIC INTELLIGENCE — M5 (Strategy & Foundation) ====================

export const organicMasterplanJobs = pgTable("organic_masterplan_jobs", {
  id:             serial("id").primaryKey(),
  linkId:         integer("link_id").notNull().references(() => searchIntelligenceLinks.id, { onDelete: "cascade" }),
  status:         text("status").notNull().default("queued"),
  seedKeyword:    text("seed_keyword").notNull(),
  database:       text("database").notNull().default("de"),
  keywordCount:   integer("keyword_count").default(0).notNull(),
  clusterCount:   integer("cluster_count").default(0).notNull(),
  progress:       integer("progress").default(0).notNull(),
  errorMessage:   text("error_message"),
  triggeredById:  text("triggered_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt:      timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  startedAt:      timestamp("started_at", { mode: "date" }),
  completedAt:    timestamp("completed_at", { mode: "date" }),
}, (table) => [
  index("organic_mp_job_link_idx").on(table.linkId),
  index("organic_mp_job_status_idx").on(table.status),
]);

export const organicKeywordUniverse = pgTable("organic_keyword_universe", {
  id:           serial("id").primaryKey(),
  jobId:        integer("job_id").notNull().references(() => organicMasterplanJobs.id, { onDelete: "cascade" }),
  keyword:      text("keyword").notNull(),
  searchVolume: integer("search_volume").default(0).notNull(),
  difficulty:   integer("difficulty").default(0).notNull(),
  intent:       text("intent").default("").notNull(),
  cpc:          doublePrecision("cpc").default(0).notNull(),
  serpFeatures: jsonb("serp_features").$type<string[]>().default([]).notNull(),
  embedding:    jsonb("embedding").$type<number[]>(),
  clusterId:    integer("cluster_id"),
}, (table) => [
  index("organic_ku_job_idx").on(table.jobId),
  index("organic_ku_cluster_idx").on(table.clusterId),
  uniqueIndex("organic_ku_unique").on(table.jobId, table.keyword),
]);

export const organicTopicClusters = pgTable("organic_topic_clusters", {
  id:              serial("id").primaryKey(),
  jobId:           integer("job_id").notNull().references(() => organicMasterplanJobs.id, { onDelete: "cascade" }),
  label:           text("label").notNull(),
  pillarKeyword:   text("pillar_keyword").notNull(),
  keywordCount:    integer("keyword_count").default(0).notNull(),
  totalVolume:     integer("total_volume").default(0).notNull(),
  priorityScore:   integer("priority_score").default(0).notNull(),
  suggestedMonth:  integer("suggested_month").default(1).notNull(),
}, (table) => [
  index("organic_tc_job_idx").on(table.jobId),
  index("organic_tc_priority_idx").on(table.priorityScore),
]);

export const organicSprints = pgTable("organic_sprints", {
  id:        serial("id").primaryKey(),
  linkId:    integer("link_id").notNull().references(() => searchIntelligenceLinks.id, { onDelete: "cascade" }),
  name:      text("name").notNull(),
  theme:     text("theme").default("").notNull(),
  startDate: timestamp("start_date", { mode: "date" }).notNull(),
  endDate:   timestamp("end_date", { mode: "date" }).notNull(),
  status:    text("status").notNull().default("planned"),
  goalJson:  jsonb("goal_json").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("organic_sprint_link_idx").on(table.linkId),
  index("organic_sprint_status_idx").on(table.status),
]);

export const organicRoadmapItems = pgTable("organic_roadmap_items", {
  id:        serial("id").primaryKey(),
  clusterId: integer("cluster_id").notNull().references(() => organicTopicClusters.id, { onDelete: "cascade" }),
  sprintId:  integer("sprint_id").references(() => organicSprints.id, { onDelete: "set null" }),
  title:     text("title").notNull(),
  type:      text("type").notNull().default("article"),
  status:    text("status").notNull().default("backlog"),
  startDate: timestamp("start_date", { mode: "date" }),
  dueDate:   timestamp("due_date", { mode: "date" }),
  owner:     text("owner").default("").notNull(),
  priority:  integer("priority").default(50).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
}, (table) => [
  index("organic_ri_cluster_idx").on(table.clusterId),
  index("organic_ri_sprint_idx").on(table.sprintId),
  index("organic_ri_status_idx").on(table.status),
]);

// ==================== PERMISSION_KEYS (paid-ads + seo + analytics) ====================

export const PERMISSION_KEYS = [
  "paidAds.dashboard",
  "paidAds.campaigns",
  "paidAds.tracking",
  "paidAds.payments",
  "seo.dashboard",
  "seo.gsc",
  "seo.audit",
  "seo.metatags",
  "seo.redirects",
  "seo.sitemap",
  "seo.robots",
  "seo.performance",
  "search.settings",
  "analytics.events",
  "analytics.funnels",
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

// ==================== TYPE EXPORTS ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type SearchIntelligenceLink = typeof searchIntelligenceLinks.$inferSelect;
export type NewSearchIntelligenceLink = typeof searchIntelligenceLinks.$inferInsert;

export type ApiCredential = typeof apiCredentials.$inferSelect;
export type NewApiCredential = typeof apiCredentials.$inferInsert;

export type SemrushKeywordDataRow = typeof semrushKeywordData.$inferSelect;
export type SemrushCompetitorDataRow = typeof semrushCompetitorData.$inferSelect;
export type SemrushDomainHistoryRow = typeof semrushDomainHistory.$inferSelect;

export type GscQueryMetric = typeof gscQueryMetrics.$inferSelect;
export type GscCoreWebVital = typeof gscCoreWebVitals.$inferSelect;
export type GscIndexCoverageRow = typeof gscIndexCoverage.$inferSelect;

export type SearchIntelligenceRule = typeof searchIntelligenceRules.$inferSelect;
export type NewSearchIntelligenceRule = typeof searchIntelligenceRules.$inferInsert;

export type OrganicVisibilitySnapshot = typeof organicVisibilitySnapshots.$inferSelect;
export type OrganicSerpFeatureRow = typeof organicSerpFeatures.$inferSelect;
export type OrganicSiteAuditRun = typeof organicSiteAuditRuns.$inferSelect;
export type OrganicSiteAuditIssue = typeof organicSiteAuditIssues.$inferSelect;
export type OrganicBacklinkRow = typeof organicBacklinks.$inferSelect;
export type OrganicBacklinkSnapshot = typeof organicBacklinkSnapshots.$inferSelect;
export type OrganicDisavowEntry = typeof organicDisavowEntries.$inferSelect;
export type OrganicMasterplanJob = typeof organicMasterplanJobs.$inferSelect;
export type OrganicKeywordUniverseRow = typeof organicKeywordUniverse.$inferSelect;
export type OrganicTopicCluster = typeof organicTopicClusters.$inferSelect;
export type OrganicSprint = typeof organicSprints.$inferSelect;
export type OrganicRoadmapItem = typeof organicRoadmapItems.$inferSelect;

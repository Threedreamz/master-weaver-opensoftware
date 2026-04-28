import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ==================== USERS (NextAuth + OpenMLM identity) ====================

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  externalAuthId: text("external_auth_id").unique(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "timestamp" }),
  displayName: text("display_name"),
  image: text("image"),
  primaryRole: text("primary_role", {
    enum: [
      "visitor",
      "customer",
      "loyalty_member",
      "partner_candidate",
      "verified_partner",
      "team_builder",
      "shop_operator",
      "admin",
    ],
  }).default("visitor").notNull(),
  status: text("status", { enum: ["active", "suspended", "banned"] }).default("active").notNull(),
  parentReferrerId: text("parent_referrer_id"),
  currentStageSlug: text("current_stage_slug"),
  tenantSlug: text("tenant_slug").default("etd").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [
  index("users_tenant_idx").on(t.tenantSlug),
  index("users_referrer_idx").on(t.parentReferrerId),
  index("users_role_idx").on(t.primaryRole),
]);

// NextAuth-required tables (kept minimal — used only if Drizzle adapter is wired later)

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (t) => [
  uniqueIndex("accounts_provider_idx").on(t.provider, t.providerAccountId),
]);

export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

// ==================== VALUE EVENTS (canonical source) ====================

export const valueEvents = sqliteTable("value_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  sourceKind: text("source_kind").notNull(),
  sourceRefId: text("source_ref_id").notNull(),
  status: text("status", { enum: ["pending", "confirmed", "reversed"] }).default("pending").notNull(),
  occurredAt: integer("occurred_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  confirmedAt: integer("confirmed_at", { mode: "timestamp" }),
  reversedAt: integer("reversed_at", { mode: "timestamp" }),
  reversalReason: text("reversal_reason"),
  valueAmountCents: integer("value_amount_cents").default(0).notNull(),
  valueCurrency: text("value_currency").default("EUR").notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  tenantSlug: text("tenant_slug").default("etd").notNull(),
}, (t) => [
  uniqueIndex("value_events_source_idx").on(t.tenantSlug, t.sourceKind, t.sourceRefId),
  index("value_events_user_status_idx").on(t.userId, t.status),
  index("value_events_type_status_idx").on(t.type, t.status),
]);

// ==================== LOYALTY POINTS LEDGER ====================

export const loyaltyPointsLedger = sqliteTable("loyalty_points_ledger", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  valueEventId: text("value_event_id").references(() => valueEvents.id),
  delta: integer("delta").notNull(),
  runningBalance: integer("running_balance").notNull(),
  kind: text("kind", { enum: ["earn", "spend", "adjust", "expire", "reverse"] }).notNull(),
  reason: text("reason"),
  occurredAt: integer("occurred_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [
  index("points_user_time_idx").on(t.userId, t.occurredAt),
]);

// ==================== REWARDS ====================

export const rewards = sqliteTable("rewards", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  costPoints: integer("cost_points").notNull(),
  kind: text("kind", { enum: ["voucher", "external_trigger", "coin_credit", "merchandise"] }).notNull(),
  externalProvider: text("external_provider"),
  externalPayload: text("external_payload", { mode: "json" }).$type<Record<string, unknown>>(),
  stockRemaining: integer("stock_remaining"),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  tenantSlug: text("tenant_slug").default("etd").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [
  index("rewards_tenant_active_idx").on(t.tenantSlug, t.isActive),
]);

// ==================== REWARD REDEMPTIONS ====================

export const rewardRedemptions = sqliteTable("reward_redemptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rewardId: text("reward_id").notNull().references(() => rewards.id),
  status: text("status", { enum: ["pending", "fulfilled", "failed", "refunded"] }).default("pending").notNull(),
  costPoints: integer("cost_points").notNull(),
  externalRefId: text("external_ref_id"),
  redeemedAt: integer("redeemed_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  fulfilledAt: integer("fulfilled_at", { mode: "timestamp" }),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
}, (t) => [
  index("redemptions_user_idx").on(t.userId),
  index("redemptions_reward_status_idx").on(t.rewardId, t.status),
]);

// ==================== AUDIT LOG (append-only) ====================

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  actorUserId: text("actor_user_id"),
  action: text("action").notNull(),
  entityKind: text("entity_kind").notNull(),
  entityId: text("entity_id").notNull(),
  beforeJson: text("before_json", { mode: "json" }).$type<Record<string, unknown>>(),
  afterJson: text("after_json", { mode: "json" }).$type<Record<string, unknown>>(),
  occurredAt: integer("occurred_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
}, (t) => [
  index("audit_entity_idx").on(t.entityKind, t.entityId),
  index("audit_actor_time_idx").on(t.actorUserId, t.occurredAt),
]);

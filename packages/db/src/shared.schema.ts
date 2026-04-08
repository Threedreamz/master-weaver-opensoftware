import { sqliteTable, text, integer, uniqueIndex, index, primaryKey } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ==================== USERS (NextAuth Compatible) ====================

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  emailVerified: integer("email_verified", { mode: "timestamp" }),
  username: text("username").unique(),
  displayName: text("display_name"),
  role: text("role", { enum: ["admin", "editor", "viewer", "guest"] }).default("viewer").notNull(),
  locale: text("locale", { enum: ["cs", "de", "en", "es", "fr", "it", "nl", "pl", "pt", "sv"] }).default("de").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("users_email_idx").on(table.email),
  index("users_role_idx").on(table.role),
]);

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
}, (table) => [
  uniqueIndex("accounts_provider_idx").on(table.provider, table.providerAccountId),
]);

export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

export const verificationTokens = sqliteTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.identifier, table.token] }),
]);

// ==================== RELATIONS ====================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

// ==================== INTEGRATION CONNECTIONS ====================

export const integrationConnections = sqliteTable("integration_connections", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  appName: text("app_name").notNull(),
  serviceName: text("service_name").notNull(),
  workspaceId: text("workspace_id"),
  credentials: text("credentials").notNull(), // encrypted JSON
  authType: text("auth_type", { enum: ["api_key", "oauth2", "basic_auth", "custom", "none"] }).notNull(),
  status: text("status", { enum: ["active", "disconnected", "error", "pending"] }).default("pending").notNull(),
  lastSyncAt: integer("last_sync_at", { mode: "timestamp" }),
  lastErrorAt: integer("last_error_at", { mode: "timestamp" }),
  lastErrorMessage: text("last_error_message"),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("ic_app_service_idx").on(table.appName, table.serviceName),
  index("ic_status_idx").on(table.status),
]);

export const integrationEvents = sqliteTable("integration_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  connectionId: text("connection_id").notNull().references(() => integrationConnections.id, { onDelete: "cascade" }),
  eventType: text("event_type", { enum: ["sync", "webhook", "error", "auth_refresh", "import", "export"] }).notNull(),
  direction: text("direction", { enum: ["inbound", "outbound", "bidirectional"] }),
  payload: text("payload", { mode: "json" }),
  status: text("status", { enum: ["success", "failure", "pending"] }).default("pending").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("ie_connection_idx").on(table.connectionId),
  index("ie_type_idx").on(table.eventType),
]);

export const integrationWebhooks = sqliteTable("integration_webhooks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  connectionId: text("connection_id").notNull().references(() => integrationConnections.id, { onDelete: "cascade" }),
  endpointPath: text("endpoint_path").notNull(),
  secret: text("secret").notNull(),
  events: text("events", { mode: "json" }).$type<string[]>(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("iw_connection_idx").on(table.connectionId),
]);

// ==================== INTEGRATION RELATIONS ====================

export const integrationConnectionsRelations = relations(integrationConnections, ({ many }) => ({
  events: many(integrationEvents),
  webhooks: many(integrationWebhooks),
}));

export const integrationEventsRelations = relations(integrationEvents, ({ one }) => ({
  connection: one(integrationConnections, { fields: [integrationEvents.connectionId], references: [integrationConnections.id] }),
}));

export const integrationWebhooksRelations = relations(integrationWebhooks, ({ one }) => ({
  connection: one(integrationConnections, { fields: [integrationWebhooks.connectionId], references: [integrationConnections.id] }),
}));

// ==================== TYPE EXPORTS ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type NewIntegrationConnection = typeof integrationConnections.$inferInsert;
export type IntegrationEvent = typeof integrationEvents.$inferSelect;
export type NewIntegrationEvent = typeof integrationEvents.$inferInsert;
export type IntegrationWebhook = typeof integrationWebhooks.$inferSelect;
export type NewIntegrationWebhook = typeof integrationWebhooks.$inferInsert;

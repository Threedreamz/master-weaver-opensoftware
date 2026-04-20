import { sqliteTable, text, integer, real, primaryKey, index, uniqueIndex } from "drizzle-orm/sqlite-core";
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
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  role: text("role", { enum: ["user", "editor", "reviewer", "publisher", "admin"] }).default("user").notNull(),
  passwordHash: text("password_hash"),
  locale: text("locale", { enum: ["de", "en"] }).default("de").notNull(),
  preferences: text("preferences"), // JSON
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("users_email_idx").on(table.email),
  index("users_role_idx").on(table.role),
]);

export const accounts = sqliteTable("accounts", {
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

export const sessions = sqliteTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

export const verificationTokens = sqliteTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.identifier, table.token] }),
]);

// ==================== SECURITY EVENTS ====================

export const securityEvents = sqliteTable("security_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id),
  eventType: text("event_type").notNull(),
  severity: text("severity", { enum: ["info", "warning", "critical"] }).default("info").notNull(),
  details: text("details"), // JSON
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("security_events_user_idx").on(table.userId),
  index("security_events_type_idx").on(table.eventType),
  index("security_events_created_idx").on(table.createdAt),
]);

// ==================== FLOWS ====================

export const flows = sqliteTable("flows", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  status: text("status", { enum: ["draft", "published", "archived"] }).default("draft").notNull(),
  settings: text("settings"), // JSON: FlowSettings
  displayRules: text("display_rules"), // JSON: DisplayRule[]
  aiPlan: text("ai_plan"),
  aiBriefing: text("ai_briefing"),
  createdBy: text("created_by").references(() => users.id),
  // Review/Approval workflow
  lastEditedBy: text("last_edited_by").references(() => users.id),
  lastEditedAt: integer("last_edited_at", { mode: "timestamp" }),
  reviewStatus: text("review_status", { enum: ["none", "in_review", "approved", "rejected"] }).default("none").notNull(),
  reviewNotes: text("review_notes"),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("flows_slug_idx").on(table.slug),
  index("flows_status_idx").on(table.status),
  index("flows_review_status_idx").on(table.reviewStatus),
]);

// ==================== FLOW VERSIONS ====================

export const flowVersions = sqliteTable("flow_versions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  flowId: text("flow_id").notNull().references(() => flows.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  snapshot: text("snapshot").notNull(), // JSON: complete serialized flow
  publishedAt: integer("published_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  publishedBy: text("published_by").references(() => users.id),
}, (table) => [
  uniqueIndex("flow_versions_unique").on(table.flowId, table.version),
]);

// ==================== FLOW STEPS (NODES) ====================

export const flowSteps = sqliteTable("flow_steps", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  flowId: text("flow_id").notNull().references(() => flows.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["start", "step", "end"] }).notNull(),
  label: text("label").notNull(),
  positionX: real("position_x").default(0).notNull(),
  positionY: real("position_y").default(0).notNull(),
  config: text("config"), // JSON: StepConfig
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("flow_steps_flow_idx").on(table.flowId),
]);

// ==================== STEP COMPONENTS ====================

export const stepComponents = sqliteTable("step_components", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  stepId: text("step_id").notNull().references(() => flowSteps.id, { onDelete: "cascade" }),
  componentType: text("component_type").notNull(),
  fieldKey: text("field_key").notNull(),
  label: text("label"),
  config: text("config").notNull(), // JSON: component-specific
  validation: text("validation"), // JSON: ValidationRule[]
  sortOrder: integer("sort_order").default(0).notNull(),
  required: integer("required", { mode: "boolean" }).default(false).notNull(),
  visibilityConditions: text("visibility_conditions"), // JSON: ComponentVisibilityCondition[]
  visibilityLogic: text("visibility_logic", { enum: ["AND", "OR"] }).default("AND"),
}, (table) => [
  index("step_components_step_idx").on(table.stepId),
]);

// ==================== FLOW EDGES (CONNECTIONS) ====================

export const flowEdges = sqliteTable("flow_edges", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  flowId: text("flow_id").notNull().references(() => flows.id, { onDelete: "cascade" }),
  sourceStepId: text("source_step_id").notNull().references(() => flowSteps.id, { onDelete: "cascade" }),
  targetStepId: text("target_step_id").notNull().references(() => flowSteps.id, { onDelete: "cascade" }),
  conditionType: text("condition_type", { enum: ["always", "equals", "not_equals", "contains", "not_contains", "gt", "lt", "gte", "lte", "regex", "is_empty", "is_not_empty"] }).default("always").notNull(),
  conditionFieldKey: text("condition_field_key"),
  conditionValue: text("condition_value"),
  label: text("label"),
  priority: integer("priority").default(0).notNull(),
}, (table) => [
  index("flow_edges_flow_idx").on(table.flowId),
  index("flow_edges_source_idx").on(table.sourceStepId),
]);

// ==================== SUBMISSIONS ====================

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  flowId: text("flow_id").notNull().references(() => flows.id),
  flowVersionId: text("flow_version_id").references(() => flowVersions.id),
  status: text("status", { enum: ["in_progress", "completed", "abandoned"] }).default("in_progress").notNull(),
  answers: text("answers").notNull(), // JSON: { [fieldKey]: value }
  metadata: text("metadata"), // JSON: SubmissionMetadata
  startedAt: integer("started_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  lastStepId: text("last_step_id"),
}, (table) => [
  index("submissions_flow_idx").on(table.flowId),
  index("submissions_status_idx").on(table.status),
  index("submissions_started_idx").on(table.startedAt),
]);

// ==================== WEBHOOKS ====================

export const webhooks = sqliteTable("webhooks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  flowId: text("flow_id").notNull().references(() => flows.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  secret: text("secret"),
  events: text("events").notNull().default('["submission.completed"]'),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("webhooks_flow_idx").on(table.flowId),
]);

// ==================== FLOW EVENTS (ANALYTICS) ====================

export const flowEvents = sqliteTable("flow_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  flowId: text("flow_id").notNull().references(() => flows.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["view", "step_view", "submission", "exit"] }).notNull(),
  stepId: text("step_id"),
  sessionId: text("session_id"),
  device: text("device"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("flow_events_flow_created_idx").on(table.flowId, table.createdAt),
  index("flow_events_session_idx").on(table.sessionId),
]);

// ==================== APP SETTINGS ====================

export const appSettings = sqliteTable("app_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// ==================== FLOW NOTIFICATIONS ====================

export const flowNotifications = sqliteTable("flow_notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  flowId: text("flow_id").notNull().references(() => flows.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["email", "slack", "auto_reply", "routing"] }).notNull(),
  config: text("config").notNull(), // JSON: { emails: string[], subject?: string }
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("flow_notifications_flow_idx").on(table.flowId),
]);

// ==================== FLOW COMMENTS ====================

export const flowComments = sqliteTable("flow_comments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  flowId: text("flow_id").notNull().references(() => flows.id, { onDelete: "cascade" }),
  stepId: text("step_id"), // null = flow-level comment
  componentId: text("component_id"), // null = step-level comment
  authorId: text("author_id").references(() => users.id),
  authorName: text("author_name").notNull(), // denormalized for display
  authorAvatar: text("author_avatar"),
  content: text("content").notNull(),
  resolved: integer("resolved", { mode: "boolean" }).default(false).notNull(),
  resolvedBy: text("resolved_by").references(() => users.id),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("flow_comments_flow_idx").on(table.flowId),
  index("flow_comments_step_idx").on(table.stepId),
  index("flow_comments_resolved_idx").on(table.resolved),
]);

// ==================== ASSETS ====================

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type", { enum: ["image", "icon", "video", "document", "other"] }).default("image").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  width: integer("width"),
  height: integer("height"),
  altText: text("alt_text"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("assets_type_idx").on(table.type),
  index("assets_uploaded_by_idx").on(table.uploadedBy),
]);

// ==================== ASSET REFERENCES ====================

export const assetReferences = sqliteTable("asset_references", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  flowId: text("flow_id").notNull().references(() => flows.id, { onDelete: "cascade" }),
  stepId: text("step_id"), // which step references the asset
  componentId: text("component_id"), // which component references the asset
  fieldKey: text("field_key"), // which config field references the asset
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("asset_refs_asset_idx").on(table.assetId),
  index("asset_refs_flow_idx").on(table.flowId),
]);

// ==================== UPLOADS (form-submission file uploads) ====================

export const uploads = sqliteTable("uploads", {
  id: text("id").primaryKey(),                // uuid
  flowId: text("flow_id"),                    // optional, for cleanup on flow delete
  submissionId: text("submission_id"),        // optional, set when attached to a submission
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storagePath: text("storage_path").notNull(),  // relative path under apps/openflow/.uploads/
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("uploads_flow_idx").on(table.flowId),
  index("uploads_submission_idx").on(table.submissionId),
]);

// ==================== QA FINDINGS ====================

export const qaFindings = sqliteTable("qa_findings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  flowId: text("flow_id").notNull().references(() => flows.id, { onDelete: "cascade" }),
  stepId: text("step_id"),
  componentId: text("component_id"),
  category: text("category", { enum: ["color", "typography", "spacing", "theme", "accessibility", "structure"] }).notNull(),
  severity: text("severity", { enum: ["error", "warning", "info"] }).default("warning").notNull(),
  message: text("message").notNull(),
  suggestion: text("suggestion"),
  dismissed: integer("dismissed", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("qa_findings_flow_idx").on(table.flowId),
  index("qa_findings_severity_idx").on(table.severity),
]);

// ==================== AI JOBS ====================

export const aiJobs = sqliteTable("ai_jobs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  flowId: text("flow_id").references(() => flows.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["generate_flow", "suggest_content", "optimize_step"] }).notNull(),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] }).default("pending").notNull(),
  input: text("input").notNull(), // JSON: briefing / context
  output: text("output"), // JSON: generated structure or suggestions
  error: text("error"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
}, (table) => [
  index("ai_jobs_flow_idx").on(table.flowId),
  index("ai_jobs_status_idx").on(table.status),
  index("ai_jobs_type_idx").on(table.type),
]);

// ==================== FLOW EDITS (Audit Trail) ====================

export const flowEdits = sqliteTable("flow_edits", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  flowId: text("flow_id").notNull().references(() => flows.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  userName: text("user_name"),
  userAvatar: text("user_avatar"),
  action: text("action", { enum: ["created", "edited", "published", "reviewed", "deleted", "settings_changed"] }).notNull(),
  summary: text("summary"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("flow_edits_flow_idx").on(table.flowId),
  index("flow_edits_user_idx").on(table.userId),
  index("flow_edits_created_idx").on(table.createdAt),
]);

// ==================== COMPONENT DEFINITIONS (seed data) ====================

export const componentDefinitions = sqliteTable("component_definitions", {
  type: text("type").primaryKey(),
  category: text("category", { enum: ["input", "choice", "advanced", "display", "layout"] }).notNull(),
  label: text("label").notNull(),
  icon: text("icon").notNull(),
  defaultConfig: text("default_config").notNull(), // JSON
  configSchema: text("config_schema").notNull(), // JSON
});

// ==================== RELATIONS ====================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  flows: many(flows),
  securityEvents: many(securityEvents),
}));

export const flowsRelations = relations(flows, ({ one, many }) => ({
  createdByUser: one(users, { fields: [flows.createdBy], references: [users.id] }),
  lastEditedByUser: one(users, { fields: [flows.lastEditedBy], references: [users.id] }),
  reviewedByUser: one(users, { fields: [flows.reviewedBy], references: [users.id] }),
  steps: many(flowSteps),
  edges: many(flowEdges),
  versions: many(flowVersions),
  submissions: many(submissions),
  webhooks: many(webhooks),
  events: many(flowEvents),
  notifications: many(flowNotifications),
  comments: many(flowComments),
  assetReferences: many(assetReferences),
  qaFindings: many(qaFindings),
  aiJobs: many(aiJobs),
  edits: many(flowEdits),
}));

export const flowEditsRelations = relations(flowEdits, ({ one }) => ({
  flow: one(flows, { fields: [flowEdits.flowId], references: [flows.id] }),
  user: one(users, { fields: [flowEdits.userId], references: [users.id] }),
}));

export const flowCommentsRelations = relations(flowComments, ({ one }) => ({
  flow: one(flows, { fields: [flowComments.flowId], references: [flows.id] }),
  author: one(users, { fields: [flowComments.authorId], references: [users.id] }),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  uploadedByUser: one(users, { fields: [assets.uploadedBy], references: [users.id] }),
  references: many(assetReferences),
}));

export const assetReferencesRelations = relations(assetReferences, ({ one }) => ({
  asset: one(assets, { fields: [assetReferences.assetId], references: [assets.id] }),
  flow: one(flows, { fields: [assetReferences.flowId], references: [flows.id] }),
}));

export const qaFindingsRelations = relations(qaFindings, ({ one }) => ({
  flow: one(flows, { fields: [qaFindings.flowId], references: [flows.id] }),
}));

export const aiJobsRelations = relations(aiJobs, ({ one }) => ({
  flow: one(flows, { fields: [aiJobs.flowId], references: [flows.id] }),
  createdByUser: one(users, { fields: [aiJobs.createdBy], references: [users.id] }),
}));

export const flowStepsRelations = relations(flowSteps, ({ one, many }) => ({
  flow: one(flows, { fields: [flowSteps.flowId], references: [flows.id] }),
  components: many(stepComponents),
}));

export const stepComponentsRelations = relations(stepComponents, ({ one }) => ({
  step: one(flowSteps, { fields: [stepComponents.stepId], references: [flowSteps.id] }),
}));

export const flowEdgesRelations = relations(flowEdges, ({ one }) => ({
  flow: one(flows, { fields: [flowEdges.flowId], references: [flows.id] }),
  sourceStep: one(flowSteps, { fields: [flowEdges.sourceStepId], references: [flowSteps.id] }),
  targetStep: one(flowSteps, { fields: [flowEdges.targetStepId], references: [flowSteps.id] }),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  flow: one(flows, { fields: [submissions.flowId], references: [flows.id] }),
  flowVersion: one(flowVersions, { fields: [submissions.flowVersionId], references: [flowVersions.id] }),
}));

export const webhooksRelations = relations(webhooks, ({ one }) => ({
  flow: one(flows, { fields: [webhooks.flowId], references: [flows.id] }),
}));

export const flowEventsRelations = relations(flowEvents, ({ one }) => ({
  flow: one(flows, { fields: [flowEvents.flowId], references: [flows.id] }),
}));

export const flowNotificationsRelations = relations(flowNotifications, ({ one }) => ({
  flow: one(flows, { fields: [flowNotifications.flowId], references: [flows.id] }),
}));

// ==================== PERMISSION SYSTEM ====================

export const PERMISSION_KEYS = [
  "flows.view",
  "flows.create",
  "flows.edit",
  "flows.delete",
  "flows.review",
  "flows.approve",
  "flows.publish",
  "submissions.view",
  "submissions.export",
  "themes.manage",
  "assets.manage",
  "comments.manage",
  "settings.manage",
  "users.manage",
  "ai.use",
] as const;

export const PERMISSION_LABELS: Record<string, string> = {
  "flows.view": "Flows ansehen",
  "flows.create": "Flows erstellen",
  "flows.edit": "Flows bearbeiten",
  "flows.delete": "Flows löschen",
  "flows.review": "Flows prüfen",
  "flows.approve": "Freigaben erteilen",
  "flows.publish": "Veröffentlichen",
  "submissions.view": "Einreichungen ansehen",
  "submissions.export": "Einreichungen exportieren",
  "themes.manage": "Themes verwalten",
  "assets.manage": "Assets verwalten",
  "comments.manage": "Kommentare verwalten",
  "settings.manage": "Einstellungen verwalten",
  "users.manage": "Rollen verwalten",
  "ai.use": "AI-Funktionen nutzen",
};

export type UserRole = "user" | "editor" | "reviewer" | "publisher" | "admin";
export type ReviewStatus = "none" | "in_review" | "approved" | "rejected";

export const ROLE_LABELS: Record<UserRole, string> = {
  user: "Betrachter",
  editor: "Editor",
  reviewer: "Reviewer",
  publisher: "Publisher",
  admin: "Admin",
};

export const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  user: ["flows.view", "submissions.view"],
  editor: ["flows.view", "flows.create", "flows.edit", "submissions.view", "assets.manage", "themes.manage", "comments.manage", "ai.use"],
  reviewer: ["flows.view", "flows.review", "submissions.view", "comments.manage"],
  publisher: ["flows.view", "flows.create", "flows.edit", "flows.approve", "flows.publish", "submissions.view", "submissions.export", "assets.manage", "themes.manage", "comments.manage", "ai.use"],
  admin: PERMISSION_KEYS as unknown as string[],
};

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

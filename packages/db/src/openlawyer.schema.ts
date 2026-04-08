import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./shared.schema";

// ==================== EXTERNAL REVIEWERS ====================

export const legalExternalReviewers = sqliteTable("legal_external_reviewers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  firmName: text("firm_name"),
  accessToken: text("access_token").notNull().unique(),
  tokenExpiresAt: integer("token_expires_at", { mode: "timestamp" }),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  lastAccessedAt: integer("last_accessed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ==================== LEGAL PROJECTS ====================

export const legalProjects = sqliteTable("legal_projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  website: text("website"),
  description: text("description"),
  jurisdiction: text("jurisdiction").default("DE").notNull(),
  countries: text("countries", { mode: "json" }).$type<string[]>().default([]),
  companyName: text("company_name").notNull(),
  companyAddress: text("company_address"),
  companyEmail: text("company_email"),
  companyPhone: text("company_phone"),
  companyRegister: text("company_register"),
  companyVatId: text("company_vat_id"),
  managingDirector: text("managing_director"),
  businessModel: text("business_model", { mode: "json" }).$type<{
    type: string;
    description: string;
    revenueStreams: string[];
  }>(),
  technologies: text("technologies", { mode: "json" }).$type<string[]>().default([]),
  paymentProviders: text("payment_providers", { mode: "json" }).$type<string[]>().default([]),
  trackingTools: text("tracking_tools", { mode: "json" }).$type<string[]>().default([]),
  newsletterTools: text("newsletter_tools", { mode: "json" }).$type<string[]>().default([]),
  hasUserAccounts: integer("has_user_accounts", { mode: "boolean" }).default(false),
  apiIntegrations: text("api_integrations", { mode: "json" }).$type<Array<{
    name: string;
    purpose: string;
    dataShared: string[];
  }>>(),
  affiliateNetworks: text("affiliate_networks", { mode: "json" }).$type<string[]>().default([]),
  status: text("status", { enum: ["active", "archived"] }).default("active").notNull(),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("lp_slug_idx").on(table.slug),
  index("lp_status_idx").on(table.status),
]);

// ==================== RISK ANALYSES ====================

export const legalRiskAnalyses = sqliteTable("legal_risk_analyses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => legalProjects.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  riskLevel: text("risk_level", { enum: ["high", "medium", "low"] }).notNull(),
  description: text("description"),
  recommendations: text("recommendations", { mode: "json" }).$type<string[]>(),
  requiredDocuments: text("required_documents", { mode: "json" }).$type<string[]>(),
  analyzedAt: integer("analyzed_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("lra_project_idx").on(table.projectId),
]);

// ==================== LEGAL DOCUMENTS ====================

export const legalDocuments = sqliteTable("legal_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => legalProjects.id, { onDelete: "cascade" }),
  documentType: text("document_type", {
    enum: ["impressum", "privacy", "terms", "cookies", "cancellation", "affiliate_disclosure", "disclaimer", "custom"],
  }).notNull(),
  title: text("title").notNull(),
  content: text("content"),
  locale: text("locale").default("de").notNull(),
  currentVersion: integer("current_version").default(1).notNull(),
  status: text("status", {
    enum: ["draft", "in_review", "changes_required", "approved", "published", "archived"],
  }).default("draft").notNull(),
  assignedReviewerId: integer("assigned_reviewer_id").references(() => legalExternalReviewers.id, { onDelete: "set null" }),
  publishedAt: integer("published_at", { mode: "timestamp" }),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("ld_project_idx").on(table.projectId),
  index("ld_status_idx").on(table.status),
  index("ld_type_locale_idx").on(table.projectId, table.documentType, table.locale),
]);

// ==================== DOCUMENT VERSIONS ====================

export const legalDocumentVersions = sqliteTable("legal_document_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: integer("document_id").notNull().references(() => legalDocuments.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  content: text("content"),
  changeNote: text("change_note"),
  generatedByAi: integer("generated_by_ai", { mode: "boolean" }).default(false),
  aiPromptUsed: text("ai_prompt_used"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("ldv_doc_idx").on(table.documentId),
  uniqueIndex("ldv_doc_version_idx").on(table.documentId, table.version),
]);

// ==================== REVIEW REQUESTS ====================

export const legalReviewRequests = sqliteTable("legal_review_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: integer("document_id").notNull().references(() => legalDocuments.id, { onDelete: "cascade" }),
  reviewerId: integer("reviewer_id").references(() => legalExternalReviewers.id, { onDelete: "set null" }),
  status: text("status", { enum: ["pending", "in_review", "changes_requested", "approved"] }).default("pending").notNull(),
  requestedAt: integer("requested_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  respondedAt: integer("responded_at", { mode: "timestamp" }),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => [
  index("lrr_doc_idx").on(table.documentId),
  index("lrr_reviewer_idx").on(table.reviewerId),
]);

// ==================== REVIEW COMMENTS ====================

export const legalReviewComments = sqliteTable("legal_review_comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reviewRequestId: integer("review_request_id").notNull().references(() => legalReviewRequests.id, { onDelete: "cascade" }),
  authorType: text("author_type", { enum: ["internal", "external"] }).notNull(),
  authorName: text("author_name"),
  authorEmail: text("author_email"),
  comment: text("comment").notNull(),
  lineReference: text("line_reference"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ==================== MESSAGES ====================

export const legalMessages = sqliteTable("legal_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: integer("document_id").notNull().references(() => legalDocuments.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  authorType: text("author_type", { enum: ["internal", "external"] }).notNull(),
  authorId: text("author_id"),
  authorName: text("author_name"),
  content: text("content").notNull(),
  attachments: text("attachments", { mode: "json" }).$type<string[]>(),
  read: integer("read", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("lm_doc_idx").on(table.documentId),
]);

// ==================== MONITORING SOURCES ====================

export const legalMonitoringSources = sqliteTable("legal_monitoring_sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sourceType: text("source_type", { enum: ["rss", "webpage"] }).notNull(),
  url: text("url").notNull(),
  checkIntervalHours: integer("check_interval_hours").default(24).notNull(),
  selectors: text("selectors", { mode: "json" }).$type<Record<string, string>>(),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp" }),
  lastContentHash: text("last_content_hash"),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ==================== MONITORING ALERTS ====================

export const legalMonitoringAlerts = sqliteTable("legal_monitoring_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceId: integer("source_id").notNull().references(() => legalMonitoringSources.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary"),
  content: text("content"),
  url: text("url"),
  severity: text("severity", { enum: ["info", "warning", "critical"] }).default("info").notNull(),
  status: text("status", { enum: ["new", "reviewed", "dismissed", "actioned"] }).default("new").notNull(),
  reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("lma_source_idx").on(table.sourceId),
  index("lma_status_idx").on(table.status),
]);

// ==================== TEMPLATES ====================

export const legalTemplates = sqliteTable("legal_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  documentType: text("document_type", {
    enum: ["impressum", "privacy", "terms", "cookies", "cancellation", "affiliate_disclosure", "disclaimer", "custom"],
  }).notNull(),
  locale: text("locale").default("de").notNull(),
  promptTemplate: text("prompt_template").notNull(),
  systemPrompt: text("system_prompt"),
  description: text("description"),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ==================== AUDIT LOG ====================

export const legalAuditLog = sqliteTable("legal_audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").references(() => legalProjects.id, { onDelete: "cascade" }),
  documentId: integer("document_id").references(() => legalDocuments.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  details: text("details", { mode: "json" }).$type<Record<string, unknown>>(),
  performedBy: text("performed_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("lal_project_idx").on(table.projectId),
  index("lal_action_idx").on(table.action),
]);

// ==================== RELATIONS ====================

export const legalProjectsRelations = relations(legalProjects, ({ many, one }) => ({
  documents: many(legalDocuments),
  riskAnalyses: many(legalRiskAnalyses),
  auditLog: many(legalAuditLog),
  creator: one(users, { fields: [legalProjects.createdBy], references: [users.id] }),
}));

export const legalDocumentsRelations = relations(legalDocuments, ({ one, many }) => ({
  project: one(legalProjects, { fields: [legalDocuments.projectId], references: [legalProjects.id] }),
  versions: many(legalDocumentVersions),
  reviewRequests: many(legalReviewRequests),
  messages: many(legalMessages),
  assignedReviewer: one(legalExternalReviewers, { fields: [legalDocuments.assignedReviewerId], references: [legalExternalReviewers.id] }),
}));

export const legalDocumentVersionsRelations = relations(legalDocumentVersions, ({ one }) => ({
  document: one(legalDocuments, { fields: [legalDocumentVersions.documentId], references: [legalDocuments.id] }),
}));

export const legalReviewRequestsRelations = relations(legalReviewRequests, ({ one, many }) => ({
  document: one(legalDocuments, { fields: [legalReviewRequests.documentId], references: [legalDocuments.id] }),
  reviewer: one(legalExternalReviewers, { fields: [legalReviewRequests.reviewerId], references: [legalExternalReviewers.id] }),
  comments: many(legalReviewComments),
}));

export const legalMonitoringAlertsRelations = relations(legalMonitoringAlerts, ({ one }) => ({
  source: one(legalMonitoringSources, { fields: [legalMonitoringAlerts.sourceId], references: [legalMonitoringSources.id] }),
}));

// ==================== TYPE EXPORTS ====================

export type LegalProject = typeof legalProjects.$inferSelect;
export type NewLegalProject = typeof legalProjects.$inferInsert;
export type LegalDocument = typeof legalDocuments.$inferSelect;
export type NewLegalDocument = typeof legalDocuments.$inferInsert;
export type LegalDocumentVersion = typeof legalDocumentVersions.$inferSelect;
export type LegalExternalReviewer = typeof legalExternalReviewers.$inferSelect;
export type LegalReviewRequest = typeof legalReviewRequests.$inferSelect;
export type LegalMonitoringAlert = typeof legalMonitoringAlerts.$inferSelect;
export type LegalTemplate = typeof legalTemplates.$inferSelect;

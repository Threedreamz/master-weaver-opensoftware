import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./shared.schema";

// ==================== EMAIL ACCOUNTS ====================

export const emailAccounts = sqliteTable("email_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  imapHost: text("imap_host"),
  imapPort: integer("imap_port").default(993),
  imapUser: text("imap_user"),
  imapPass: text("imap_pass"),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port").default(587),
  smtpUser: text("smtp_user"),
  smtpPass: text("smtp_pass"),
  isDefault: integer("is_default", { mode: "boolean" }).default(false).notNull(),
  syncEnabled: integer("sync_enabled", { mode: "boolean" }).default(true).notNull(),
  lastSyncUid: integer("last_sync_uid").default(0),
  lastSyncAt: integer("last_sync_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("email_accounts_email_idx").on(table.email),
]);

// ==================== EMAIL THREADS ====================

export const emailThreads = sqliteTable("email_threads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => emailAccounts.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  lastMessageAt: integer("last_message_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  messageCount: integer("message_count").default(1).notNull(),
  snippet: text("snippet"),
  isArchived: integer("is_archived", { mode: "boolean" }).default(false).notNull(),
  isStarred: integer("is_starred", { mode: "boolean" }).default(false).notNull(),
  isTrashed: integer("is_trashed", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("email_threads_last_msg_idx").on(table.lastMessageAt),
  index("email_threads_archived_idx").on(table.isArchived),
  index("email_threads_trashed_idx").on(table.isTrashed),
  index("email_threads_account_idx").on(table.accountId),
]);

// ==================== EMAIL MESSAGES ====================

export const emailMessages = sqliteTable("email_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  threadId: integer("thread_id").references(() => emailThreads.id, { onDelete: "cascade" }),
  messageId: text("message_id").unique(),
  inReplyTo: text("in_reply_to"),
  referencesHeader: text("references_header"),
  direction: text("direction", { enum: ["inbound", "outbound"] }).notNull(),
  status: text("status", { enum: ["received", "sent", "draft", "sending", "failed"] }).default("received").notNull(),
  fromAddress: text("from_address").notNull(),
  fromName: text("from_name"),
  toAddresses: text("to_addresses", { mode: "json" }).$type<{ email: string; name?: string }[]>().notNull(),
  ccAddresses: text("cc_addresses", { mode: "json" }).$type<{ email: string; name?: string }[]>(),
  bccAddresses: text("bcc_addresses", { mode: "json" }).$type<{ email: string; name?: string }[]>(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  hasAttachments: integer("has_attachments", { mode: "boolean" }).default(false).notNull(),
  isStarred: integer("is_starred", { mode: "boolean" }).default(false).notNull(),
  sentAt: integer("sent_at", { mode: "timestamp" }),
  sentByUserId: text("sent_by_user_id").references(() => users.id, { onDelete: "set null" }),
  imapUid: integer("imap_uid"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("email_messages_thread_idx").on(table.threadId),
  index("email_messages_direction_idx").on(table.direction),
  index("email_messages_status_idx").on(table.status),
  index("email_messages_from_idx").on(table.fromAddress),
  index("email_messages_sent_at_idx").on(table.sentAt),
  index("email_messages_imap_uid_idx").on(table.imapUid),
]);

// ==================== EMAIL READ STATUS ====================

export const emailReadStatus = sqliteTable("email_read_status", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  messageId: integer("message_id").notNull().references(() => emailMessages.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  readAt: integer("read_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
}, (table) => [
  uniqueIndex("email_read_user_msg_idx").on(table.userId, table.messageId),
  index("email_read_msg_idx").on(table.messageId),
]);

// ==================== EMAIL ATTACHMENTS ====================

export const emailAttachments = sqliteTable("email_attachments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  messageId: integer("message_id").notNull().references(() => emailMessages.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  storagePath: text("storage_path").notNull(),
  contentId: text("content_id"),
  isInline: integer("is_inline", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("email_attachments_msg_idx").on(table.messageId),
]);

// ==================== RELATIONS ====================

export const emailAccountsRelations = relations(emailAccounts, ({ many }) => ({
  threads: many(emailThreads),
}));

export const emailThreadsRelations = relations(emailThreads, ({ one, many }) => ({
  account: one(emailAccounts, { fields: [emailThreads.accountId], references: [emailAccounts.id] }),
  messages: many(emailMessages),
}));

export const emailMessagesRelations = relations(emailMessages, ({ one, many }) => ({
  thread: one(emailThreads, { fields: [emailMessages.threadId], references: [emailThreads.id] }),
  sentByUser: one(users, { fields: [emailMessages.sentByUserId], references: [users.id] }),
  attachments: many(emailAttachments),
  readStatuses: many(emailReadStatus),
}));

export const emailAttachmentsRelations = relations(emailAttachments, ({ one }) => ({
  message: one(emailMessages, { fields: [emailAttachments.messageId], references: [emailMessages.id] }),
}));

export const emailReadStatusRelations = relations(emailReadStatus, ({ one }) => ({
  message: one(emailMessages, { fields: [emailReadStatus.messageId], references: [emailMessages.id] }),
  user: one(users, { fields: [emailReadStatus.userId], references: [users.id] }),
}));

// ==================== TYPE EXPORTS ====================

export type EmailAccount = typeof emailAccounts.$inferSelect;
export type NewEmailAccount = typeof emailAccounts.$inferInsert;
export type EmailThread = typeof emailThreads.$inferSelect;
export type NewEmailThread = typeof emailThreads.$inferInsert;
export type EmailMessage = typeof emailMessages.$inferSelect;
export type NewEmailMessage = typeof emailMessages.$inferInsert;
export type EmailAttachment = typeof emailAttachments.$inferSelect;
export type NewEmailAttachment = typeof emailAttachments.$inferInsert;

import { sql } from "drizzle-orm";
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const workspaces = pgTable("workspaces", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 200 }),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const orgs = pgTable("orgs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id", { length: 64 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const orgMembers = pgTable("org_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid("org_id").notNull(),
  userId: uuid("user_id").notNull(),
  role: varchar("role", { length: 32 }).notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid("org_id").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: varchar("role", { length: 32 }).notNull().default("member"),
  token: varchar("token", { length: 128 }).notNull().unique(),
  invitedBy: uuid("invited_by").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid("org_id").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  kind: varchar("kind", { length: 16 }).notNull().default("public"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const channelMembers = pgTable("channel_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: uuid("channel_id").notNull(),
  userId: uuid("user_id").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: uuid("channel_id").notNull(),
  authorId: uuid("author_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  editedAt: timestamp("edited_at", { withTimezone: true }),
});

export const meetings = pgTable("meetings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid("org_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  recordingUrl: text("recording_url"),
  transcriptId: uuid("transcript_id"),
});

export const meetingRecordings = pgTable("meeting_recordings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: uuid("meeting_id").notNull(),
  storageUrl: text("storage_url").notNull(),
  mimeType: varchar("mime_type", { length: 80 }).notNull(),
  durationMs: text("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const meetingTranscripts = pgTable("meeting_transcripts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: uuid("meeting_id").notNull(),
  fullText: text("full_text").notNull(),
  segments: jsonb("segments").notNull().default(sql`'[]'::jsonb`),
  provider: varchar("provider", { length: 32 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const extractedTasks = pgTable("extracted_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: uuid("meeting_id").notNull(),
  orgId: uuid("org_id").notNull(),
  assigneeEmail: varchar("assignee_email", { length: 320 }),
  title: text("title").notNull(),
  deadline: timestamp("deadline", { withTimezone: true }),
  priority: varchar("priority", { length: 16 }).notNull().default("normal"),
  webhookSent: boolean("webhook_sent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid("org_id").notNull(),
  actorId: uuid("actor_id"),
  action: varchar("action", { length: 120 }).notNull(),
  target: varchar("target", { length: 200 }).notNull(),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid("org_id").notNull(),
  userId: uuid("user_id").notNull(),
  kind: varchar("kind", { length: 80 }).notNull(),
  payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const gdprExports = pgTable("gdpr_exports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid("org_id").notNull(),
  requestedBy: uuid("requested_by").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  downloadUrl: text("download_url"),
  requestedAt: timestamp("requested_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const versionHistory = pgTable("version_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid("org_id").notNull(),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  diff: jsonb("diff").notNull().default(sql`'{}'::jsonb`),
  editorId: uuid("editor_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid("org_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull().default(""),
  status: varchar("status", { length: 32 }).notNull().default("open"),
  priority: varchar("priority", { length: 16 }).notNull().default("normal"),
  assigneeId: uuid("assignee_id"),
  externalRef: varchar("external_ref", { length: 200 }),
  guestEmail: varchar("guest_email", { length: 320 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const guestSessions = pgTable("guest_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  guestToken: varchar("guest_token", { length: 256 }).notNull().unique(),
  orderId: varchar("order_id", { length: 200 }).notNull(),
  guestEmail: varchar("guest_email", { length: 320 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  joinedCallId: uuid("joined_call_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const callRecordings = pgTable("call_recordings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: uuid("meeting_id").notNull(),
  r2Url: text("r2_url").notNull(),
  gobdLockedAt: timestamp("gobd_locked_at", { withTimezone: true }),
  durationMs: varchar("duration_ms", { length: 32 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

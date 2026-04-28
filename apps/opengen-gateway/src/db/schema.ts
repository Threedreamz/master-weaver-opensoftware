import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const genJobs = sqliteTable("gen_jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  inputType: text("input_type").notNull(),
  inputPayload: text("input_payload").notNull(),
  providerJobId: text("provider_job_id"),
  status: text("status").notNull().default("queued"),
  outputR2Key: text("output_r2_key"),
  outputGlbUrl: text("output_glb_url"),
  outputTriangleCount: integer("output_triangle_count"),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export type GenJob = typeof genJobs.$inferSelect;
export type NewGenJob = typeof genJobs.$inferInsert;

/**
 * Per-user-class and per-provider usage counters. Two scopes are tracked
 * via the same table:
 *   userId="*"  scope="provider" → global per-provider counter (Layer 2 cap)
 *   userId=<u>  scope="user"     → per-user counter (Layer 1 cap)
 *
 * Composite uniqueness: (scope, user_id, provider, period, period_key).
 */
export const quotaUsage = sqliteTable(
  "quota_usage",
  {
    id: text("id").primaryKey(),
    scope: text("scope").notNull(), // "user" | "provider"
    userId: text("user_id").notNull(), // "*" for provider-scope rows
    userClass: text("user_class").notNull().default(""),
    provider: text("provider").notNull(),
    period: text("period").notNull(), // "day" | "month"
    periodKey: text("period_key").notNull(), // "YYYY-MM-DD" or "YYYY-MM"
    count: integer("count").notNull().default(0),
    costCents: integer("cost_cents").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("quota_usage_unique_idx").on(
      t.scope,
      t.userId,
      t.provider,
      t.period,
      t.periodKey,
    ),
  ],
);

export type QuotaUsage = typeof quotaUsage.$inferSelect;
export type NewQuotaUsage = typeof quotaUsage.$inferInsert;

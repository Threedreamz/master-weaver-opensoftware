import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const imgJobs = sqliteTable("img_jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  inputType: text("input_type").notNull(),
  inputPayload: text("input_payload").notNull(),
  providerJobId: text("provider_job_id"),
  status: text("status").notNull().default("queued"),
  outputR2Key: text("output_r2_key"),
  outputImageUrl: text("output_image_url"),
  outputWidth: integer("output_width"),
  outputHeight: integer("output_height"),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export type ImgJob = typeof imgJobs.$inferSelect;
export type NewImgJob = typeof imgJobs.$inferInsert;

export const quotaUsage = sqliteTable(
  "quota_usage",
  {
    id: text("id").primaryKey(),
    scope: text("scope").notNull(),
    userId: text("user_id").notNull(),
    userClass: text("user_class").notNull().default(""),
    provider: text("provider").notNull(),
    period: text("period").notNull(),
    periodKey: text("period_key").notNull(),
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

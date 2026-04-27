import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
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

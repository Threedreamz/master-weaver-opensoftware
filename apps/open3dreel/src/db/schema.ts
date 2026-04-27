import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Reel jobs — one row per generated video.
//
// V1 flow: client renders model in browser via Three.js + MediaRecorder,
// POSTs the resulting WebM blob to /api/jobs/[id]/upload-output, server
// stores it under $REELS_DIR/<id>.<ext>. The output is served back via
// /api/jobs/[id]/output (streaming from the volume).
export const reelJobs = sqliteTable(
  "reel_jobs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    // Anonymous in V1; OIDC user-id added later.
    userId: text("user_id"),

    // Source model — the file never reaches the server, but we keep the
    // filename + format for analytics + debugging.
    modelFilename: text("model_filename").notNull(),
    modelFormat: text("model_format", { enum: ["stl", "obj", "gltf", "glb"] }).notNull(),

    // Render settings.
    durationS: integer("duration_s").notNull().default(15),
    rotation: text("rotation", { enum: ["turntable", "orbit", "oscillate"] })
      .notNull()
      .default("turntable"),
    lighting: text("lighting", { enum: ["product", "studio", "dramatic", "neon"] })
      .notNull()
      .default("product"),
    aspect: text("aspect", { enum: ["9:16", "1:1", "16:9"] })
      .notNull()
      .default("9:16"),
    bgColor: text("bg_color").notNull().default("#0a0a0f"),
    musicTrackUrl: text("music_track_url"),
    watermarkEnabled: integer("watermark_enabled", { mode: "boolean" }).notNull().default(true),
    zoom: text("zoom", { enum: ["near", "medium", "far"] }).notNull().default("medium"),

    // Status: pending → rendering → uploading → complete | failed.
    status: text("status", {
      enum: ["pending", "rendering", "uploading", "complete", "failed"],
    })
      .notNull()
      .default("pending"),

    // Output location on the Railway volume + served URL is /api/jobs/<id>/output.
    outputPath: text("output_path"),
    outputMimeType: text("output_mime_type"),
    outputSizeBytes: integer("output_size_bytes"),

    error: text("error"),
    startedAt: integer("started_at", { mode: "timestamp" }),
    finishedAt: integer("finished_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (t) => [
    index("reel_jobs_user_idx").on(t.userId, t.createdAt),
    index("reel_jobs_status_idx").on(t.status, t.createdAt),
  ],
);

export type ReelJob = typeof reelJobs.$inferSelect;
export type NewReelJob = typeof reelJobs.$inferInsert;

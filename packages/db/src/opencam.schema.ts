import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ==================== M1: CAM CORE ====================

export const opencamProjects = sqliteTable("opencam_projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  // Stock setup — bbox + material tag. Kept JSON-encoded so M2 can add
  // stock-from-mesh without a schema migration.
  stockBboxJson: text("stock_bbox_json", { mode: "json" }).$type<{
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
    material?: string;
  } | null>(),
  // Hash of the part geometry pulled from opencad — lets us detect drift
  // when the opencad source project updates.
  partGeometryHash: text("part_geometry_hash"),
  linkedOpencadProjectId: text("linked_opencad_project_id"),
  linkedOpencadVersionId: text("linked_opencad_version_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
}, (t) => [
  index("opencam_projects_user_id_idx").on(t.userId),
  index("opencam_projects_linked_idx").on(t.linkedOpencadProjectId),
  index("opencam_projects_deleted_at_idx").on(t.deletedAt),
]);

export const opencamTools = sqliteTable("opencam_tools", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  kind: text("kind", {
    enum: ["flat", "ball", "bull", "drill", "chamfer", "vbit", "tap"],
  }).notNull(),
  diameterMm: real("diameter_mm").notNull(),
  fluteCount: integer("flute_count").notNull(),
  lengthMm: real("length_mm").notNull(),
  material: text("material"),
  shopId: text("shop_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [
  index("opencam_tools_user_idx").on(t.userId),
  index("opencam_tools_kind_idx").on(t.kind),
]);

export const opencamOperations = sqliteTable("opencam_operations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => opencamProjects.id, { onDelete: "cascade" }),
  kind: text("kind", {
    enum: ["face", "contour", "pocket", "drill", "adaptive", "3d-parallel"],
  }).notNull(),
  toolId: text("tool_id").references(() => opencamTools.id),
  feedMmMin: real("feed_mm_min").notNull(),
  spindleRpm: real("spindle_rpm").notNull(),
  stepoverMm: real("stepover_mm"),
  stepdownMm: real("stepdown_mm"),
  paramsJson: text("params_json", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  // Cached toolpath — regenerated on every paramsJson change.
  toolpathJson: text("toolpath_json", { mode: "json" }).$type<{
    polylines: Array<Array<{ x: number; y: number; z: number }>>;
    estimatedDurationSec: number;
    bbox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
  } | null>(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [
  index("opencam_ops_project_idx").on(t.projectId),
  index("opencam_ops_tool_idx").on(t.toolId),
  index("opencam_ops_order_idx").on(t.projectId, t.sortOrder),
]);

export const opencamPosts = sqliteTable("opencam_posts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id"),  // null = global/built-in post
  name: text("name").notNull(),
  dialect: text("dialect", {
    enum: ["grbl", "marlin", "fanuc", "linuxcnc", "haas", "mach3"],
  }).notNull(),
  // Template string with {x}/{y}/{z}/{feed}/{rpm}/{tool} placeholders.
  templateGcode: text("template_gcode").notNull(),
  // Flag for built-in / seeded posts — not user-editable.
  builtIn: integer("built_in", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [
  index("opencam_posts_user_idx").on(t.userId),
  index("opencam_posts_dialect_idx").on(t.dialect),
]);

export const opencamGcode = sqliteTable("opencam_gcode", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => opencamProjects.id, { onDelete: "cascade" }),
  postId: text("post_id").notNull().references(() => opencamPosts.id),
  lineCount: integer("line_count").notNull(),
  estimatedDurationSec: real("estimated_duration_sec").notNull(),
  // Storage key for the rendered G-Code blob. In M1 we just inline into a
  // text column; M2 moves to object storage and fills this with an R2 key.
  storageKey: text("storage_key"),
  gcodeText: text("gcode_text"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [
  index("opencam_gcode_project_idx").on(t.projectId),
  index("opencam_gcode_post_idx").on(t.postId),
]);

// ==================== RELATIONS ====================

export const opencamProjectsRelations = relations(opencamProjects, ({ many }) => ({
  operations: many(opencamOperations),
  gcode: many(opencamGcode),
}));

export const opencamOperationsRelations = relations(opencamOperations, ({ one }) => ({
  project: one(opencamProjects, { fields: [opencamOperations.projectId], references: [opencamProjects.id] }),
  tool: one(opencamTools, { fields: [opencamOperations.toolId], references: [opencamTools.id] }),
}));

export const opencamGcodeRelations = relations(opencamGcode, ({ one }) => ({
  project: one(opencamProjects, { fields: [opencamGcode.projectId], references: [opencamProjects.id] }),
  post: one(opencamPosts, { fields: [opencamGcode.postId], references: [opencamPosts.id] }),
}));

// ==================== TYPE EXPORTS ====================

export type OpencamProject = typeof opencamProjects.$inferSelect;
export type NewOpencamProject = typeof opencamProjects.$inferInsert;
export type OpencamTool = typeof opencamTools.$inferSelect;
export type NewOpencamTool = typeof opencamTools.$inferInsert;
export type OpencamOperation = typeof opencamOperations.$inferSelect;
export type NewOpencamOperation = typeof opencamOperations.$inferInsert;
export type OpencamOperationKind = OpencamOperation["kind"];
export type OpencamPost = typeof opencamPosts.$inferSelect;
export type NewOpencamPost = typeof opencamPosts.$inferInsert;
export type OpencamPostDialect = OpencamPost["dialect"];
export type OpencamGcode = typeof opencamGcode.$inferSelect;
export type NewOpencamGcode = typeof opencamGcode.$inferInsert;

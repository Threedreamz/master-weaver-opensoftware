import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ==================== M1: CAD CORE ====================

export const opencadProjects = sqliteTable("opencad_projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
}, (t) => [
  index("opencad_projects_user_id_idx").on(t.userId),
  index("opencad_projects_deleted_at_idx").on(t.deletedAt),
]);

export const opencadProjectVersions = sqliteTable("opencad_project_versions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => opencadProjects.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  parentVersionId: text("parent_version_id"),
  label: text("label"),
  featureTreeJson: text("feature_tree_json", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [
  index("opencad_pv_project_id_idx").on(t.projectId),
  index("opencad_pv_parent_idx").on(t.parentVersionId),
]);

export const opencadSketches = sqliteTable("opencad_sketches", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => opencadProjects.id, { onDelete: "cascade" }),
  planeRef: text("plane_ref").notNull(),
  constraintsJson: text("constraints_json", { mode: "json" }).$type<Array<Record<string, unknown>>>().notNull(),
  entitiesJson: text("entities_json", { mode: "json" }).$type<Array<Record<string, unknown>>>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [index("opencad_sketches_project_id_idx").on(t.projectId)]);

export const opencadFeatures = sqliteTable("opencad_features", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => opencadProjects.id, { onDelete: "cascade" }),
  kind: text("kind", {
    enum: [
      // primitives
      "box", "cylinder", "sphere", "cone", "torus", "pyramid",
      // solid ops
      "extrude", "revolve", "sweep", "loft", "cut",
      "shell", "draft", "hole", "thread",
      // modifiers
      "fillet", "chamfer", "transform",
      // patterns
      "mirror", "pattern-linear", "pattern-circular",
      // grouping
      "group",
      // booleans
      "boolean", "boolean-union", "boolean-subtract", "boolean-intersect",
      // sketch feature (wraps a sketch in the tree)
      "sketch",
      // imports
      "import",
    ],
  }).notNull(),
  paramsJson: text("params_json", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  parentIds: text("parent_ids", { mode: "json" }).$type<string[]>().notNull(),
  outputGeometryHash: text("output_geometry_hash"),
  order: integer("order").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [
  index("opencad_features_project_id_idx").on(t.projectId),
  index("opencad_features_geom_hash_idx").on(t.outputGeometryHash),
  index("opencad_features_order_idx").on(t.projectId, t.order),
]);

export const opencadImportedBodies = sqliteTable("opencad_imported_bodies", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => opencadProjects.id, { onDelete: "cascade" }),
  sourceFormat: text("source_format", { enum: ["step", "iges", "stl", "obj", "3mf", "brep"] }).notNull(),
  originalFilename: text("original_filename").notNull(),
  storageKey: text("storage_key").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [index("opencad_imported_project_idx").on(t.projectId)]);

// ==================== M2: ASSEMBLIES ====================

export const opencadAssemblies = sqliteTable("opencad_assemblies", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => opencadProjects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  treeJson: text("tree_json").notNull(),          // AssemblyTree {parts, instances}
  solvedPosesJson: text("solved_poses_json"),     // last-known good solve result
  motionStudyJson: text("motion_study_json"),     // optional MotionStudy
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [index("opencad_asm_project_idx").on(t.projectId)]);

export const opencadDrawings = sqliteTable("opencad_drawings", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => opencadProjects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sheetWidthMm: real("sheet_width_mm").notNull().default(297),  // A4 landscape default
  sheetHeightMm: real("sheet_height_mm").notNull().default(210),
  sheetTitle: text("sheet_title").notNull(),
  sheetAuthor: text("sheet_author"),
  sheetRevision: text("sheet_revision"),
  viewsJson: text("views_json").notNull(),        // ProjectionResult[] + layout (position/scale)
  dimensionsJson: text("dimensions_json").notNull(), // Dimension[] serialized
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [index("opencad_drawings_project_idx").on(t.projectId)]);

export const opencadAssemblyParts = sqliteTable("opencad_assembly_parts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  assemblyId: text("assembly_id").notNull().references(() => opencadAssemblies.id, { onDelete: "cascade" }),
  partProjectId: text("part_project_id").notNull().references(() => opencadProjects.id),
  instanceName: text("instance_name").notNull(),
  transformJson: text("transform_json", { mode: "json" }).$type<{
    translate: [number, number, number];
    rotate: [number, number, number, number];
    scale?: [number, number, number];
  }>().notNull(),
}, (t) => [index("opencad_asm_parts_asm_idx").on(t.assemblyId)]);

export const opencadMates = sqliteTable("opencad_mates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  assemblyId: text("assembly_id").notNull().references(() => opencadAssemblies.id, { onDelete: "cascade" }),
  partAId: text("part_a_id").notNull().references(() => opencadAssemblyParts.id, { onDelete: "cascade" }),
  partBId: text("part_b_id").notNull().references(() => opencadAssemblyParts.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["coincident", "concentric", "angle", "distance", "tangent"] }).notNull(),
  paramsJson: text("params_json", { mode: "json" }).$type<Record<string, unknown>>(),
}, (t) => [index("opencad_mates_asm_idx").on(t.assemblyId)]);

// ==================== M3: CAM ====================

export const opencadTools = sqliteTable("opencad_tools", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  diameter: real("diameter").notNull(),
  flutes: integer("flutes").notNull(),
  type: text("type", { enum: ["flat", "ball", "vbit", "drill", "chamfer"] }).notNull(),
  feedRate: real("feed_rate"),
  spindleRpm: integer("spindle_rpm"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [index("opencad_tools_user_idx").on(t.userId)]);

export const opencadOperations = sqliteTable("opencad_operations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => opencadProjects.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["profile", "pocket", "drill", "adaptive"] }).notNull(),
  toolId: text("tool_id").references(() => opencadTools.id),
  stockJson: text("stock_json", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  paramsJson: text("params_json", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  toolpathJson: text("toolpath_json", { mode: "json" }).$type<Record<string, unknown>>(),
  gcodeKey: text("gcode_key"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [
  index("opencad_ops_project_idx").on(t.projectId),
  index("opencad_ops_tool_idx").on(t.toolId),
]);

export const opencadGcodePosts = sqliteTable("opencad_gcode_posts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  dialect: text("dialect", { enum: ["linuxcnc", "mach3", "grbl"] }).notNull(),
  configJson: text("config_json", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [index("opencad_posts_user_idx").on(t.userId)]);

// ==================== RELATIONS ====================

export const opencadProjectsRelations = relations(opencadProjects, ({ many }) => ({
  versions: many(opencadProjectVersions),
  sketches: many(opencadSketches),
  features: many(opencadFeatures),
  importedBodies: many(opencadImportedBodies),
  assemblies: many(opencadAssemblies),
  operations: many(opencadOperations),
  drawings: many(opencadDrawings),
}));

export const opencadDrawingsRelations = relations(opencadDrawings, ({ one }) => ({
  project: one(opencadProjects, { fields: [opencadDrawings.projectId], references: [opencadProjects.id] }),
}));

export const opencadAssembliesRelations = relations(opencadAssemblies, ({ one, many }) => ({
  project: one(opencadProjects, { fields: [opencadAssemblies.projectId], references: [opencadProjects.id] }),
  parts: many(opencadAssemblyParts),
  mates: many(opencadMates),
}));

export const opencadOperationsRelations = relations(opencadOperations, ({ one }) => ({
  project: one(opencadProjects, { fields: [opencadOperations.projectId], references: [opencadProjects.id] }),
  tool: one(opencadTools, { fields: [opencadOperations.toolId], references: [opencadTools.id] }),
}));

// ==================== TYPE EXPORTS ====================

export type OpencadProject = typeof opencadProjects.$inferSelect;
export type NewOpencadProject = typeof opencadProjects.$inferInsert;
export type OpencadFeature = typeof opencadFeatures.$inferSelect;
export type OpencadFeatureKind = OpencadFeature["kind"];
export type OpencadOperation = typeof opencadOperations.$inferSelect;
export type OpencadOperationKind = OpencadOperation["kind"];
export type OpencadDrawing = typeof opencadDrawings.$inferSelect;
export type OpencadDrawingInsert = typeof opencadDrawings.$inferInsert;
export type OpencadAssembly = typeof opencadAssemblies.$inferSelect;
export type OpencadAssemblyInsert = typeof opencadAssemblies.$inferInsert;

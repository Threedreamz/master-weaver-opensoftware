import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ==================== M1: SIMULATION CORE ====================

export const opensimulationProjects = sqliteTable("opensimulation_projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
}, (t) => [
  index("opensim_projects_user_id_idx").on(t.userId),
  index("opensim_projects_deleted_at_idx").on(t.deletedAt),
]);

export const opensimulationRuns = sqliteTable("opensimulation_runs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => opensimulationProjects.id, { onDelete: "cascade" }),
  domain: text("domain", {
    enum: ["kinematic-fwd", "kinematic-ik", "fea-static", "thermal-steady", "cleaning"],
  }).notNull(),
  status: text("status", {
    enum: ["pending", "running", "done", "failed"],
  }).notNull(),
  triggeredBy: text("triggered_by", {
    enum: ["session", "api-key", "odyn-device", "opencad", "opencam"],
  }).notNull(),
  inputJson: text("input_json", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  resultJson: text("result_json", { mode: "json" }).$type<Record<string, unknown> | null>(),
  durationMs: integer("duration_ms"),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [
  index("opensim_runs_project_id_idx").on(t.projectId),
  index("opensim_runs_status_idx").on(t.status),
  index("opensim_runs_domain_idx").on(t.domain),
  index("opensim_runs_created_at_idx").on(t.createdAt),
]);

export const opensimulationMeshes = sqliteTable("opensimulation_meshes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => opensimulationProjects.id, { onDelete: "cascade" }),
  geometryHash: text("geometry_hash").notNull(),
  kind: text("kind", { enum: ["tri", "tet"] }).notNull(),
  vertexCount: integer("vertex_count").notNull(),
  elementCount: integer("element_count").notNull(),
  storageKey: text("storage_key").notNull(),
  source: text("source", { enum: ["opencad", "manual", "upload"] }).notNull(),
  sourceRef: text("source_ref"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [
  index("opensim_meshes_project_id_idx").on(t.projectId),
  uniqueIndex("opensim_meshes_hash_uq").on(t.geometryHash),
]);

export const opensimulationMaterials = sqliteTable("opensimulation_materials", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  density: real("density").notNull(),
  youngModulus: real("young_modulus").notNull(),
  poisson: real("poisson").notNull(),
  thermalConductivity: real("thermal_conductivity").notNull(),
  specificHeat: real("specific_heat").notNull(),
  yieldStrength: real("yield_strength").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [
  index("opensim_materials_user_id_idx").on(t.userId),
]);

export const opensimulationBoundaryConditions = sqliteTable("opensimulation_boundary_conditions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  runId: text("run_id").notNull().references(() => opensimulationRuns.id, { onDelete: "cascade" }),
  kind: text("kind", {
    enum: ["fix", "load", "pressure", "temperature", "heat_flux", "velocity"],
  }).notNull(),
  anchorPointsJson: text("anchor_points_json", { mode: "json" }).$type<number[]>().notNull(),
  magnitudeJson: text("magnitude_json", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => [
  index("opensim_bc_run_id_idx").on(t.runId),
]);

// ==================== TYPE EXPORTS ====================

export type OpenSimulationProject = typeof opensimulationProjects.$inferSelect;
export type OpenSimulationRun = typeof opensimulationRuns.$inferSelect;
export type OpenSimulationMesh = typeof opensimulationMeshes.$inferSelect;
export type OpenSimulationMaterial = typeof opensimulationMaterials.$inferSelect;
export type OpenSimulationBoundaryCondition = typeof opensimulationBoundaryConditions.$inferSelect;

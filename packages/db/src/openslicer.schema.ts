import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ==================== SLICER MODELS ====================

export const slicerModels = sqliteTable("slicer_models", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  filename: text("filename").notNull(),
  fileFormat: text("file_format", { enum: ["stl", "3mf", "obj", "step", "scad"] }),
  filePath: text("file_path").notNull(),
  fileSizeBytes: integer("file_size_bytes"),
  fileHash: text("file_hash"),
  boundingBoxX: real("bounding_box_x"),
  boundingBoxY: real("bounding_box_y"),
  boundingBoxZ: real("bounding_box_z"),
  triangleCount: integer("triangle_count"),
  volumeCm3: real("volume_cm3"),
  surfaceAreaCm2: real("surface_area_cm2"),
  isManifold: integer("is_manifold", { mode: "boolean" }),
  vertexCount: integer("vertex_count"),
  meshAnalyzed: integer("mesh_analyzed", { mode: "boolean" }).default(false),
  thumbnailPath: text("thumbnail_path"),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  description: text("description"),
  uploadedBy: text("uploaded_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("slicer_models_file_format_idx").on(table.fileFormat),
  index("slicer_models_mesh_analyzed_idx").on(table.meshAnalyzed),
  index("slicer_models_uploaded_by_idx").on(table.uploadedBy),
]);

// ==================== SLICER PROFILES ====================

export const slicerProfiles = sqliteTable("slicer_profiles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  technology: text("technology", { enum: ["fdm", "sla", "sls"] }),
  slicerEngine: text("slicer_engine", { enum: ["prusaslicer", "orcaslicer", "chitubox", "lychee", "internal"] }),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>(),
  rawConfigText: text("raw_config_text"),
  layerHeight: real("layer_height"),
  nozzleDiameter: real("nozzle_diameter"),
  infillDensity: real("infill_density"),
  supportEnabled: integer("support_enabled", { mode: "boolean" }),
  exposureTime: real("exposure_time"),
  bottomExposureTime: real("bottom_exposure_time"),
  laserPower: real("laser_power"),
  scanSpeed: real("scan_speed"),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("slicer_profiles_technology_idx").on(table.technology),
  index("slicer_profiles_slicer_engine_idx").on(table.slicerEngine),
  index("slicer_profiles_is_default_idx").on(table.isDefault),
]);

// ==================== SLICER PRINTER PROFILES ====================

export const slicerPrinterProfiles = sqliteTable("slicer_printer_profiles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  vendor: text("vendor"),
  model: text("model"),
  bedSizeX: real("bed_size_x"),
  bedSizeY: real("bed_size_y"),
  bedSizeZ: real("bed_size_z"),
  nozzleDiameter: real("nozzle_diameter").default(0.4),
  nozzleCount: integer("nozzle_count").default(1),
  firmwareFlavor: text("firmware_flavor", { enum: ["marlin", "klipper", "bambu", "reprap"] }),
  maxAccelX: integer("max_accel_x"),
  maxAccelY: integer("max_accel_y"),
  maxSpeedX: integer("max_speed_x"),
  maxSpeedY: integer("max_speed_y"),
  startGcode: text("start_gcode"),
  endGcode: text("end_gcode"),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("slicer_printer_profiles_is_default_idx").on(table.isDefault),
]);

// ==================== SLICER FILAMENT PROFILES ====================

export const slicerFilamentProfiles = sqliteTable("slicer_filament_profiles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  materialType: text("material_type", { enum: ["PLA", "PETG", "ABS", "TPU", "ASA", "PA", "PC"] }),
  nozzleTemp: integer("nozzle_temp").default(200),
  nozzleTempFirstLayer: integer("nozzle_temp_first_layer"),
  bedTemp: integer("bed_temp").default(60),
  fanSpeedMin: integer("fan_speed_min").default(0),
  fanSpeedMax: integer("fan_speed_max").default(100),
  flowRatio: real("flow_ratio").default(1.0),
  filamentDensity: real("filament_density").default(1.24),
  filamentCostPerKg: real("filament_cost_per_kg"),
  retractLength: real("retract_length").default(0.8),
  retractSpeed: integer("retract_speed").default(30),
  maxVolumetricSpeed: real("max_volumetric_speed"),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("slicer_filament_profiles_material_type_idx").on(table.materialType),
  index("slicer_filament_profiles_is_default_idx").on(table.isDefault),
]);

// ==================== SLICER PROCESS PROFILES ====================

export const slicerProcessProfiles = sqliteTable("slicer_process_profiles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  layerHeight: real("layer_height").default(0.2),
  firstLayerHeight: real("first_layer_height").default(0.2),
  wallCount: integer("wall_count").default(3),
  topLayers: integer("top_layers").default(4),
  bottomLayers: integer("bottom_layers").default(4),
  infillDensity: integer("infill_density").default(20),
  infillPattern: text("infill_pattern", { enum: ["rectilinear", "grid", "triangles", "cubic", "gyroid", "honeycomb", "lightning"] }),
  supportType: text("support_type", { enum: ["none", "normal", "tree", "organic"] }),
  supportThreshold: integer("support_threshold").default(45),
  supportOnBuildPlateOnly: integer("support_on_build_plate_only", { mode: "boolean" }).default(false),
  bridgeSpeed: integer("bridge_speed").default(25),
  ironingEnabled: integer("ironing_enabled", { mode: "boolean" }).default(false),
  fuzzySkinEnabled: integer("fuzzy_skin_enabled", { mode: "boolean" }).default(false),
  adaptiveLayerHeight: integer("adaptive_layer_height", { mode: "boolean" }).default(false),
  printSpeedPerimeter: integer("print_speed_perimeter").default(45),
  printSpeedInfill: integer("print_speed_infill").default(80),
  printSpeedTravel: integer("print_speed_travel").default(150),
  seamPosition: text("seam_position", { enum: ["nearest", "aligned", "random", "rear"] }),
  brimWidth: real("brim_width").default(0),
  skirtDistance: real("skirt_distance").default(6),
  skirtLoops: integer("skirt_loops").default(1),
  disableFanFirstLayers: integer("disable_fan_first_layers").default(1),
  spiralVaseMode: integer("spiral_vase_mode").default(0),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("slicer_process_profiles_is_default_idx").on(table.isDefault),
]);

// ==================== SLICER HISTORY ====================

export const slicerHistory = sqliteTable("slicer_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // model_id FK dropped: volume-reset / partial-seed races were firing FK
  // constraints at insert even when getModelById returned truthy (proof:
  // defensive pre-check passed, structured 500 still showed FK fired). The
  // column + index are kept for joins, but ownership is soft-validated at
  // the route layer (getModelById → 404 if missing) instead of at the DB.
  modelId: text("model_id"),
  // profile_id is POLYMORPHIC: references either slicer_profiles.id (legacy) OR
  // slicer_process_profiles.id (current). The slice route (src/app/api/slice/route.ts)
  // falls through from getProfileById → getProcessProfileById and passes whichever
  // UUID matched into createHistory. Enforcing an FK to slicer_profiles breaks the
  // process-profile path with SQLITE_CONSTRAINT: FOREIGN KEY constraint failed.
  // Keep the column + index for query performance; drop the FK.
  profileId: text("profile_id"),
  status: text("status", { enum: ["pending", "slicing", "completed", "failed"] }).default("pending").notNull(),
  outputFilePath: text("output_file_path"),
  estimatedTime: integer("estimated_time"),
  estimatedMaterial: real("estimated_material"),
  layerCount: integer("layer_count"),
  slicerEngine: text("slicer_engine"),
  technology: text("technology"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("slicer_history_model_id_idx").on(table.modelId),
  index("slicer_history_profile_id_idx").on(table.profileId),
  index("slicer_history_status_idx").on(table.status),
]);

// ==================== SLICER GCODES ====================

export const slicerGcodes = sqliteTable("slicer_gcodes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  historyId: text("history_id").references(() => slicerHistory.id),
  filePath: text("file_path").notNull(),
  fileSizeBytes: integer("file_size_bytes"),
  metadata: text("metadata", { mode: "json" }).$type<{ time?: number; material?: number; layers?: number }>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("slicer_gcodes_history_id_idx").on(table.historyId),
]);

// ==================== SLICER CALIBRATION PRINTS ====================

export const slicerCalibrationPrints = sqliteTable("slicer_calibration_prints", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  farmSessionId: text("farm_session_id").notNull(),
  procedureType: text("procedure_type", { enum: ["btmt", "xy_scaling", "z_scaling", "diagnostic"] }).notNull(),
  historyId: text("history_id").references(() => slicerHistory.id),
  calibrationModelPath: text("calibration_model_path"),
  sliceProfileOverrides: text("slice_profile_overrides", { mode: "json" }).$type<Record<string, unknown>>(),
  status: text("status", { enum: ["pending", "slicing", "sliced", "sent", "failed"] }).default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("slicer_cal_prints_farm_session_idx").on(table.farmSessionId),
  index("slicer_cal_prints_procedure_idx").on(table.procedureType),
]);

// ==================== RELATIONS ====================

export const slicerModelsRelations = relations(slicerModels, ({ many }) => ({
  history: many(slicerHistory),
}));

export const slicerProfilesRelations = relations(slicerProfiles, ({ many }) => ({
  history: many(slicerHistory),
}));

export const slicerHistoryRelations = relations(slicerHistory, ({ one, many }) => ({
  model: one(slicerModels, {
    fields: [slicerHistory.modelId],
    references: [slicerModels.id],
  }),
  profile: one(slicerProfiles, {
    fields: [slicerHistory.profileId],
    references: [slicerProfiles.id],
  }),
  gcodes: many(slicerGcodes),
}));

export const slicerGcodesRelations = relations(slicerGcodes, ({ one }) => ({
  history: one(slicerHistory, {
    fields: [slicerGcodes.historyId],
    references: [slicerHistory.id],
  }),
}));

export const slicerCalibrationPrintsRelations = relations(slicerCalibrationPrints, ({ one }) => ({
  history: one(slicerHistory, {
    fields: [slicerCalibrationPrints.historyId],
    references: [slicerHistory.id],
  }),
}));

// ==================== TYPE EXPORTS ====================

export type SlicerCalibrationPrint = typeof slicerCalibrationPrints.$inferSelect;
export type NewSlicerCalibrationPrint = typeof slicerCalibrationPrints.$inferInsert;

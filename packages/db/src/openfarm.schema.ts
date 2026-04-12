import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ==================== FARM PRINTERS ====================

export const farmPrinters = sqliteTable("farm_printers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  technology: text("technology", { enum: ["fdm", "sla", "sls"] }).notNull(),
  make: text("make"),
  model: text("model"),
  protocol: text("protocol", { enum: ["moonraker", "octoprint", "bambu_mqtt", "bambu_cloud", "formlabs_local", "formlabs_cloud", "sls4all", "manual"] }).notNull(),
  ipAddress: text("ip_address"),
  port: integer("port"),
  apiKey: text("api_key"),
  accessToken: text("access_token"),
  serialNumber: text("serial_number"),
  buildVolumeX: real("build_volume_x"),
  buildVolumeY: real("build_volume_y"),
  buildVolumeZ: real("build_volume_z"),
  nozzleDiameter: real("nozzle_diameter"),
  hasHeatedBed: integer("has_heated_bed", { mode: "boolean" }),
  hasEnclosure: integer("has_enclosure", { mode: "boolean" }),
  xyResolution: real("xy_resolution"),
  laserPower: real("laser_power"),
  totalPrintHours: real("total_print_hours").default(0),
  totalPrintCount: integer("total_print_count").default(0),
  status: text("status", { enum: ["online", "offline", "printing", "paused", "error", "maintenance"] }).default("offline").notNull(),
  currentJobId: text("current_job_id"),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }),
  notes: text("notes"),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_printers_technology_idx").on(table.technology),
  index("farm_printers_status_idx").on(table.status),
  index("farm_printers_protocol_idx").on(table.protocol),
]);

// ==================== FARM MATERIALS ====================

export const farmMaterials = sqliteTable("farm_materials", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  technology: text("technology", { enum: ["fdm", "sla", "sls"] }).notNull(),
  type: text("type").notNull(),
  manufacturer: text("manufacturer"),
  color: text("color"),
  colorHex: text("color_hex"),
  totalQuantity: real("total_quantity"),
  usedQuantity: real("used_quantity").default(0),
  unit: text("unit", { enum: ["g", "ml", "kg", "l"] }).default("g").notNull(),
  costPerUnit: real("cost_per_unit"),
  diameter: real("diameter"),
  printTempMin: integer("print_temp_min"),
  printTempMax: integer("print_temp_max"),
  bedTempMin: integer("bed_temp_min"),
  bedTempMax: integer("bed_temp_max"),
  wavelength: integer("wavelength"),
  exposureTime: real("exposure_time"),
  density: real("density"),
  spoolmanSpoolId: integer("spoolman_spool_id"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_materials_technology_idx").on(table.technology),
  index("farm_materials_type_idx").on(table.type),
]);

// ==================== FARM MODELS ====================

export const farmModels = sqliteTable("farm_models", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  filename: text("filename").notNull(),
  fileFormat: text("file_format", { enum: ["stl", "3mf", "obj", "step"] }).notNull(),
  filePath: text("file_path").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  fileHash: text("file_hash"),
  boundingBoxX: real("bounding_box_x"),
  boundingBoxY: real("bounding_box_y"),
  boundingBoxZ: real("bounding_box_z"),
  triangleCount: integer("triangle_count"),
  volumeCm3: real("volume_cm3"),
  thumbnailPath: text("thumbnail_path"),
  meshAnalyzed: integer("mesh_analyzed", { mode: "boolean" }).default(false),
  vertexCount: integer("vertex_count"),
  isManifold: integer("is_manifold", { mode: "boolean" }),
  surfaceAreaCm2: real("surface_area_cm2"),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  description: text("description"),
  uploadedBy: text("uploaded_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_models_format_idx").on(table.fileFormat),
  index("farm_models_hash_idx").on(table.fileHash),
]);

// ==================== FARM SLICER PROFILES ====================

export const farmSlicerProfiles = sqliteTable("farm_slicer_profiles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  technology: text("technology", { enum: ["fdm", "sla", "sls"] }).notNull(),
  slicerEngine: text("slicer_engine", { enum: ["prusaslicer", "orcaslicer", "bambu_studio", "preform", "chitubox", "lychee", "sls4all", "custom"] }).notNull(),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  rawConfigText: text("raw_config_text"),
  layerHeight: real("layer_height"),
  nozzleDiameter: real("nozzle_diameter"),
  infillDensity: integer("infill_density"),
  supportEnabled: integer("support_enabled", { mode: "boolean" }),
  exposureTime: real("exposure_time"),
  bottomExposureTime: real("bottom_exposure_time"),
  laserPower: real("laser_power"),
  scanSpeed: real("scan_speed"),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  materialId: text("material_id"),
  printerId: text("printer_id"),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_slicer_profiles_technology_idx").on(table.technology),
  index("farm_slicer_profiles_engine_idx").on(table.slicerEngine),
]);

// ==================== FARM BATCH JOBS ====================

export const farmBatchJobs = sqliteTable("farm_batch_jobs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  technology: text("technology", { enum: ["fdm", "sla", "sls"] }).notNull(),
  modelId: text("model_id").notNull().references(() => farmModels.id),
  parameterMatrix: text("parameter_matrix", { mode: "json" }).$type<Record<string, unknown[]>>().notNull(),
  status: text("status", { enum: ["pending", "running", "completed", "partially_failed", "failed", "cancelled"] }).default("pending").notNull(),
  totalJobs: integer("total_jobs").default(0).notNull(),
  completedJobs: integer("completed_jobs").default(0).notNull(),
  failedJobs: integer("failed_jobs").default(0).notNull(),
  createdBy: text("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_batch_jobs_status_idx").on(table.status),
]);

// ==================== FARM PRINT JOBS ====================

export const farmPrintJobs = sqliteTable("farm_print_jobs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  modelId: text("model_id").notNull().references(() => farmModels.id),
  printerId: text("printer_id").references(() => farmPrinters.id),
  profileId: text("profile_id").references(() => farmSlicerProfiles.id),
  materialId: text("material_id").references(() => farmMaterials.id),
  batchJobId: text("batch_job_id").references(() => farmBatchJobs.id, { onDelete: "set null" }),
  calibrationSessionId: text("calibration_session_id"),
  status: text("status", { enum: [
    "queued", "slicing", "post_processing", "ready",
    "sending", "printing", "paused",
    "washing", "curing",
    "cooling", "depowdering",
    "completed", "failed", "cancelled",
  ] }).default("queued").notNull(),
  priority: integer("priority").default(0).notNull(),
  outputFilePath: text("output_file_path"),
  estimatedPrintTime: integer("estimated_print_time"),
  estimatedMaterialUsage: real("estimated_material_usage"),
  actualMaterialUsage: real("actual_material_usage"),
  slicingParams: text("slicing_params", { mode: "json" }).$type<Record<string, unknown>>(),
  externalJobId: text("external_job_id"),
  queuedAt: integer("queued_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  slicingStartedAt: integer("slicing_started_at", { mode: "timestamp" }),
  slicingCompletedAt: integer("slicing_completed_at", { mode: "timestamp" }),
  printStartedAt: integer("print_started_at", { mode: "timestamp" }),
  printCompletedAt: integer("print_completed_at", { mode: "timestamp" }),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  progressPercent: integer("progress_percent").default(0),
  currentLayer: integer("current_layer"),
  totalLayers: integer("total_layers"),
  createdBy: text("created_by"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_print_jobs_status_idx").on(table.status),
  index("farm_print_jobs_printer_idx").on(table.printerId),
  index("farm_print_jobs_model_idx").on(table.modelId),
  index("farm_print_jobs_batch_idx").on(table.batchJobId),
]);

// ==================== FARM JOB LOGS ====================

export const farmJobLogs = sqliteTable("farm_job_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: text("job_id").notNull().references(() => farmPrintJobs.id, { onDelete: "cascade" }),
  level: text("level", { enum: ["info", "warning", "error", "debug"] }).default("info").notNull(),
  message: text("message").notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_job_logs_job_idx").on(table.jobId),
  index("farm_job_logs_level_idx").on(table.level),
]);

// ==================== FARM SPOOLMAN SYNC ====================

export const farmSpoolmanSync = sqliteTable("farm_spoolman_sync", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  materialId: text("material_id").notNull().references(() => farmMaterials.id, { onDelete: "cascade" }),
  spoolmanSpoolId: integer("spoolman_spool_id").notNull(),
  lastSyncAt: integer("last_sync_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_spoolman_sync_material_idx").on(table.materialId),
]);

// ==================== FARM NOTIFICATIONS ====================

export const farmNotifications = sqliteTable("farm_notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text("type", { enum: ["print_done", "material_change", "part_removal", "maintenance_required", "error_check", "post_processing", "printer_assigned", "feasibility_warning", "sls_pack_ready"] }).notNull(),
  severity: text("severity", { enum: ["info", "warning", "critical"] }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  printerId: text("printer_id").references(() => farmPrinters.id, { onDelete: "set null" }),
  jobId: text("job_id").references(() => farmPrintJobs.id, { onDelete: "set null" }),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  assignedTo: text("assigned_to"),
  readAt: integer("read_at", { mode: "timestamp" }),
  dismissedAt: integer("dismissed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_notifications_type_idx").on(table.type),
  index("farm_notifications_severity_idx").on(table.severity),
  index("farm_notifications_assigned_to_idx").on(table.assignedTo),
  index("farm_notifications_created_at_idx").on(table.createdAt),
]);

// ==================== FARM NOTIFICATION PREFERENCES ====================

export const farmNotificationPreferences = sqliteTable("farm_notification_preferences", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  notificationType: text("notification_type").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).default(true).notNull(),
  channels: text("channels", { mode: "json" }).$type<string[]>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_notification_preferences_user_idx").on(table.userId),
]);

// ==================== FARM PRINTER METRICS ====================

export const farmPrinterMetrics = sqliteTable("farm_printer_metrics", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  printerId: text("printer_id").notNull().references(() => farmPrinters.id, { onDelete: "cascade" }),
  metricType: text("metric_type", { enum: ["temperature_hotend", "temperature_bed", "temperature_chamber", "utilization", "uptime"] }).notNull(),
  value: real("value").notNull(),
  recordedAt: integer("recorded_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_printer_metrics_printer_idx").on(table.printerId),
  index("farm_printer_metrics_type_idx").on(table.metricType),
  index("farm_printer_metrics_recorded_at_idx").on(table.recordedAt),
]);

// ==================== FARM FEASIBILITY CHECKS ====================

export const farmFeasibilityChecks = sqliteTable("farm_feasibility_checks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  modelId: text("model_id").notNull().references(() => farmModels.id, { onDelete: "cascade" }),
  technology: text("technology", { enum: ["fdm", "sla", "sls"] }).notNull(),
  overallScore: integer("overall_score").notNull(),
  verdict: text("verdict", { enum: ["printable", "printable_with_issues", "needs_rework", "needs_redesign"] }).notNull(),
  issues: text("issues", { mode: "json" }).$type<Array<{ type: string; severity: string; description: string; affectedArea?: { x: number; y: number; z: number } }>>(),
  metrics: text("metrics", { mode: "json" }).$type<Record<string, unknown>>(),
  analyzedAt: integer("analyzed_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  analysisVersion: text("analysis_version"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_feasibility_checks_model_idx").on(table.modelId),
  index("farm_feasibility_checks_technology_idx").on(table.technology),
  index("farm_feasibility_checks_verdict_idx").on(table.verdict),
]);

// ==================== FARM ORIENTATIONS ====================

export const farmOrientations = sqliteTable("farm_orientations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  modelId: text("model_id").notNull().references(() => farmModels.id, { onDelete: "cascade" }),
  technology: text("technology", { enum: ["fdm", "sla", "sls"] }).notNull(),
  rotationX: real("rotation_x").notNull(),
  rotationY: real("rotation_y").notNull(),
  rotationZ: real("rotation_z").notNull(),
  supportVolumeCm3: real("support_volume_cm3"),
  printTimeEstimate: integer("print_time_estimate"),
  surfaceQualityScore: integer("surface_quality_score"),
  isSelected: integer("is_selected", { mode: "boolean" }).default(false),
  cosmeticSurfaces: text("cosmetic_surfaces", { mode: "json" }).$type<number[]>(),
  thumbnailPath: text("thumbnail_path"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_orientations_model_idx").on(table.modelId),
  index("farm_orientations_technology_idx").on(table.technology),
  index("farm_orientations_is_selected_idx").on(table.isSelected),
]);

// ==================== FARM ASSIGNMENT RULES ====================

export const farmAssignmentRules = sqliteTable("farm_assignment_rules", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  priority: integer("priority").default(0).notNull(),
  conditions: text("conditions", { mode: "json" }).$type<Record<string, unknown>>(),
  preferredPrinterIds: text("preferred_printer_ids", { mode: "json" }).$type<string[]>(),
  enabled: integer("enabled", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_assignment_rules_enabled_idx").on(table.enabled),
  index("farm_assignment_rules_priority_idx").on(table.priority),
]);

// ==================== FARM ASSIGNMENT LOGS ====================

export const farmAssignmentLogs = sqliteTable("farm_assignment_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: text("job_id").notNull().references(() => farmPrintJobs.id, { onDelete: "cascade" }),
  printerId: text("printer_id").references(() => farmPrinters.id, { onDelete: "set null" }),
  score: real("score").notNull(),
  reason: text("reason").notNull(),
  factors: text("factors", { mode: "json" }).$type<Record<string, number>>(),
  accepted: integer("accepted", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_assignment_logs_job_idx").on(table.jobId),
  index("farm_assignment_logs_printer_idx").on(table.printerId),
]);

// ==================== FARM MAINTENANCE TASKS ====================

export const farmMaintenanceTasks = sqliteTable("farm_maintenance_tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  printerId: text("printer_id").notNull().references(() => farmPrinters.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", { enum: ["routine", "preventive", "corrective", "calibration"] }).notNull(),
  intervalHours: integer("interval_hours"),
  intervalPrints: integer("interval_prints"),
  status: text("status", { enum: ["planned", "due", "overdue", "in_progress", "completed", "skipped"] }).default("planned").notNull(),
  dueAt: integer("due_at", { mode: "timestamp" }),
  lastCompletedAt: integer("last_completed_at", { mode: "timestamp" }),
  completedBy: text("completed_by"),
  completionNotes: text("completion_notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_maintenance_tasks_printer_idx").on(table.printerId),
  index("farm_maintenance_tasks_status_idx").on(table.status),
  index("farm_maintenance_tasks_due_at_idx").on(table.dueAt),
]);

// ==================== FARM SPARE PARTS ====================

export const farmSpareParts = sqliteTable("farm_spare_parts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  partNumber: text("part_number"),
  category: text("category"),
  compatiblePrinterIds: text("compatible_printer_ids", { mode: "json" }).$type<string[]>(),
  quantity: integer("quantity").default(0).notNull(),
  minQuantity: integer("min_quantity").default(1).notNull(),
  costPerUnit: real("cost_per_unit"),
  supplier: text("supplier"),
  supplierUrl: text("supplier_url"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_spare_parts_category_idx").on(table.category),
]);

// ==================== FARM MAINTENANCE PARTS (JUNCTION) ====================

export const farmMaintenanceParts = sqliteTable("farm_maintenance_parts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  maintenanceTaskId: text("maintenance_task_id").notNull().references(() => farmMaintenanceTasks.id, { onDelete: "cascade" }),
  sparePartId: text("spare_part_id").notNull().references(() => farmSpareParts.id, { onDelete: "cascade" }),
  quantityUsed: integer("quantity_used").default(1).notNull(),
}, (table) => [
  index("farm_maintenance_parts_task_idx").on(table.maintenanceTaskId),
  index("farm_maintenance_parts_part_idx").on(table.sparePartId),
]);

// ==================== FARM PACKING JOBS ====================

export const farmPackingJobs = sqliteTable("farm_packing_jobs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  printerId: text("printer_id").notNull().references(() => farmPrinters.id),
  name: text("name").notNull(),
  buildVolumeX: real("build_volume_x").notNull(),
  buildVolumeY: real("build_volume_y").notNull(),
  buildVolumeZ: real("build_volume_z").notNull(),
  status: text("status", { enum: ["draft", "packing", "packed", "approved", "printing", "completed", "failed"] }).default("draft").notNull(),
  utilizationPercent: real("utilization_percent"),
  totalParts: integer("total_parts").default(0).notNull(),
  packedParts: integer("packed_parts").default(0).notNull(),
  packingResult: text("packing_result", { mode: "json" }).$type<Array<{ modelId: string; position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number } }>>(),
  estimatedPrintTime: integer("estimated_print_time"),
  estimatedCost: real("estimated_cost"),
  createdBy: text("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_packing_jobs_printer_idx").on(table.printerId),
  index("farm_packing_jobs_status_idx").on(table.status),
]);

// ==================== FARM PACKING ITEMS ====================

export const farmPackingItems = sqliteTable("farm_packing_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  packingJobId: text("packing_job_id").notNull().references(() => farmPackingJobs.id, { onDelete: "cascade" }),
  modelId: text("model_id").notNull().references(() => farmModels.id),
  printJobId: text("print_job_id").references(() => farmPrintJobs.id, { onDelete: "set null" }),
  quantity: integer("quantity").default(1).notNull(),
  positionX: real("position_x"),
  positionY: real("position_y"),
  positionZ: real("position_z"),
  rotationX: real("rotation_x"),
  rotationY: real("rotation_y"),
  rotationZ: real("rotation_z"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_packing_items_packing_job_idx").on(table.packingJobId),
  index("farm_packing_items_model_idx").on(table.modelId),
]);

// ==================== FARM CALIBRATION PROCEDURES ====================

export const farmCalibrationProcedures = sqliteTable("farm_calibration_procedures", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tier: text("tier", { enum: ["core", "mechanical", "maintenance", "service", "software"] }).notNull(),
  technology: text("technology", { enum: ["fdm", "sla", "sls"] }).notNull(),
  description: text("description"),
  firmwareMinVersion: text("firmware_min_version"),
  requiresPrint: integer("requires_print", { mode: "boolean" }).default(false),
  estimatedDurationMinutes: integer("estimated_duration_minutes"),
  intervalHours: integer("interval_hours"),
  intervalPrints: integer("interval_prints"),
  instructions: text("instructions", { mode: "json" }).$type<Array<{ stepNumber: number; title: string; description: string; type: string; durationMinutes?: number }>>(),
  calibrationModelPath: text("calibration_model_path"),
  sortOrder: integer("sort_order").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_cal_procedures_tier_idx").on(table.tier),
  index("farm_cal_procedures_technology_idx").on(table.technology),
]);

// ==================== FARM CALIBRATION SESSIONS ====================

export const farmCalibrationSessions = sqliteTable("farm_calibration_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  procedureId: text("procedure_id").notNull().references(() => farmCalibrationProcedures.id),
  printerId: text("printer_id").notNull().references(() => farmPrinters.id, { onDelete: "cascade" }),
  materialId: text("material_id").references(() => farmMaterials.id),
  status: text("status", { enum: [
    "initiated", "printing", "cooling", "measuring", "calculating",
    "review", "applying", "applied", "verifying", "verified",
    "completed", "failed", "cancelled",
  ] }).default("initiated").notNull(),
  printJobId: text("print_job_id").references(() => farmPrintJobs.id),
  verificationJobId: text("verification_job_id").references(() => farmPrintJobs.id),
  initiatedBy: text("initiated_by"),
  notes: text("notes"),
  printerHoursAtCalibration: real("printer_hours_at_calibration"),
  printerCountAtCalibration: integer("printer_count_at_calibration"),
  startedAt: integer("started_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_cal_sessions_printer_idx").on(table.printerId),
  index("farm_cal_sessions_procedure_idx").on(table.procedureId),
  index("farm_cal_sessions_status_idx").on(table.status),
  index("farm_cal_sessions_material_idx").on(table.materialId),
]);

// ==================== FARM CALIBRATION MEASUREMENTS ====================

export const farmCalibrationMeasurements = sqliteTable("farm_calibration_measurements", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id").notNull().references(() => farmCalibrationSessions.id, { onDelete: "cascade" }),
  measurementType: text("measurement_type", { enum: [
    "btmt_offset", "xy_point", "z_height", "diagnostic_grade",
  ] }).notNull(),
  axis: text("axis"),
  pointIndex: integer("point_index"),
  nominalValue: real("nominal_value"),
  measuredValue: real("measured_value").notNull(),
  unit: text("unit", { enum: ["mm", "celsius", "percent", "grade"] }).default("mm"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_cal_measurements_session_idx").on(table.sessionId),
  index("farm_cal_measurements_type_idx").on(table.measurementType),
]);

// ==================== FARM CALIBRATION RESULTS ====================

export const farmCalibrationResults = sqliteTable("farm_calibration_results", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id").notNull().references(() => farmCalibrationSessions.id, { onDelete: "cascade" }),
  resultType: text("result_type", { enum: [
    "bed_temp_offset", "x_scale_percent", "y_scale_percent",
    "z_scale_factor", "diagnostic_report",
  ] }).notNull(),
  value: real("value"),
  valueJson: text("value_json", { mode: "json" }).$type<Record<string, unknown>>(),
  confidence: real("confidence"),
  previousValue: real("previous_value"),
  applied: integer("applied", { mode: "boolean" }).default(false),
  appliedAt: integer("applied_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("farm_cal_results_session_idx").on(table.sessionId),
  index("farm_cal_results_type_idx").on(table.resultType),
]);

// ==================== RELATIONS ====================

export const farmPrintersRelations = relations(farmPrinters, ({ many }) => ({
  printJobs: many(farmPrintJobs),
  notifications: many(farmNotifications),
  metrics: many(farmPrinterMetrics),
  maintenanceTasks: many(farmMaintenanceTasks),
  calibrationSessions: many(farmCalibrationSessions),
}));

export const farmModelsRelations = relations(farmModels, ({ many }) => ({
  printJobs: many(farmPrintJobs),
  batchJobs: many(farmBatchJobs),
  feasibilityChecks: many(farmFeasibilityChecks),
  orientations: many(farmOrientations),
}));

export const farmMaterialsRelations = relations(farmMaterials, ({ many }) => ({
  printJobs: many(farmPrintJobs),
  slicerProfiles: many(farmSlicerProfiles),
  spoolmanSyncs: many(farmSpoolmanSync),
}));

export const farmSlicerProfilesRelations = relations(farmSlicerProfiles, ({ one, many }) => ({
  material: one(farmMaterials, { fields: [farmSlicerProfiles.materialId], references: [farmMaterials.id] }),
  printer: one(farmPrinters, { fields: [farmSlicerProfiles.printerId], references: [farmPrinters.id] }),
  printJobs: many(farmPrintJobs),
}));

export const farmBatchJobsRelations = relations(farmBatchJobs, ({ one, many }) => ({
  model: one(farmModels, { fields: [farmBatchJobs.modelId], references: [farmModels.id] }),
  printJobs: many(farmPrintJobs),
}));

export const farmPrintJobsRelations = relations(farmPrintJobs, ({ one, many }) => ({
  model: one(farmModels, { fields: [farmPrintJobs.modelId], references: [farmModels.id] }),
  printer: one(farmPrinters, { fields: [farmPrintJobs.printerId], references: [farmPrinters.id] }),
  profile: one(farmSlicerProfiles, { fields: [farmPrintJobs.profileId], references: [farmSlicerProfiles.id] }),
  material: one(farmMaterials, { fields: [farmPrintJobs.materialId], references: [farmMaterials.id] }),
  batchJob: one(farmBatchJobs, { fields: [farmPrintJobs.batchJobId], references: [farmBatchJobs.id] }),
  logs: many(farmJobLogs),
  notifications: many(farmNotifications),
}));

export const farmJobLogsRelations = relations(farmJobLogs, ({ one }) => ({
  job: one(farmPrintJobs, { fields: [farmJobLogs.jobId], references: [farmPrintJobs.id] }),
}));

export const farmSpoolmanSyncRelations = relations(farmSpoolmanSync, ({ one }) => ({
  material: one(farmMaterials, { fields: [farmSpoolmanSync.materialId], references: [farmMaterials.id] }),
}));

export const farmNotificationsRelations = relations(farmNotifications, ({ one }) => ({
  printer: one(farmPrinters, { fields: [farmNotifications.printerId], references: [farmPrinters.id] }),
  job: one(farmPrintJobs, { fields: [farmNotifications.jobId], references: [farmPrintJobs.id] }),
}));

export const farmPrinterMetricsRelations = relations(farmPrinterMetrics, ({ one }) => ({
  printer: one(farmPrinters, { fields: [farmPrinterMetrics.printerId], references: [farmPrinters.id] }),
}));

export const farmFeasibilityChecksRelations = relations(farmFeasibilityChecks, ({ one }) => ({
  model: one(farmModels, { fields: [farmFeasibilityChecks.modelId], references: [farmModels.id] }),
}));

export const farmOrientationsRelations = relations(farmOrientations, ({ one }) => ({
  model: one(farmModels, { fields: [farmOrientations.modelId], references: [farmModels.id] }),
}));

export const farmAssignmentRulesRelations = relations(farmAssignmentRules, () => ({}));

export const farmAssignmentLogsRelations = relations(farmAssignmentLogs, ({ one }) => ({
  job: one(farmPrintJobs, { fields: [farmAssignmentLogs.jobId], references: [farmPrintJobs.id] }),
  printer: one(farmPrinters, { fields: [farmAssignmentLogs.printerId], references: [farmPrinters.id] }),
}));

export const farmMaintenanceTasksRelations = relations(farmMaintenanceTasks, ({ one, many }) => ({
  printer: one(farmPrinters, { fields: [farmMaintenanceTasks.printerId], references: [farmPrinters.id] }),
  parts: many(farmMaintenanceParts),
}));

export const farmSparePartsRelations = relations(farmSpareParts, ({ many }) => ({
  maintenanceParts: many(farmMaintenanceParts),
}));

export const farmMaintenancePartsRelations = relations(farmMaintenanceParts, ({ one }) => ({
  task: one(farmMaintenanceTasks, { fields: [farmMaintenanceParts.maintenanceTaskId], references: [farmMaintenanceTasks.id] }),
  part: one(farmSpareParts, { fields: [farmMaintenanceParts.sparePartId], references: [farmSpareParts.id] }),
}));

export const farmPackingJobsRelations = relations(farmPackingJobs, ({ one, many }) => ({
  printer: one(farmPrinters, { fields: [farmPackingJobs.printerId], references: [farmPrinters.id] }),
  items: many(farmPackingItems),
}));

export const farmPackingItemsRelations = relations(farmPackingItems, ({ one }) => ({
  packingJob: one(farmPackingJobs, { fields: [farmPackingItems.packingJobId], references: [farmPackingJobs.id] }),
  model: one(farmModels, { fields: [farmPackingItems.modelId], references: [farmModels.id] }),
  printJob: one(farmPrintJobs, { fields: [farmPackingItems.printJobId], references: [farmPrintJobs.id] }),
}));

export const farmCalibrationProceduresRelations = relations(farmCalibrationProcedures, ({ many }) => ({
  sessions: many(farmCalibrationSessions),
}));

export const farmCalibrationSessionsRelations = relations(farmCalibrationSessions, ({ one, many }) => ({
  procedure: one(farmCalibrationProcedures, { fields: [farmCalibrationSessions.procedureId], references: [farmCalibrationProcedures.id] }),
  printer: one(farmPrinters, { fields: [farmCalibrationSessions.printerId], references: [farmPrinters.id] }),
  material: one(farmMaterials, { fields: [farmCalibrationSessions.materialId], references: [farmMaterials.id] }),
  printJob: one(farmPrintJobs, { fields: [farmCalibrationSessions.printJobId], references: [farmPrintJobs.id] }),
  verificationJob: one(farmPrintJobs, { fields: [farmCalibrationSessions.verificationJobId], references: [farmPrintJobs.id] }),
  measurements: many(farmCalibrationMeasurements),
  results: many(farmCalibrationResults),
}));

export const farmCalibrationMeasurementsRelations = relations(farmCalibrationMeasurements, ({ one }) => ({
  session: one(farmCalibrationSessions, { fields: [farmCalibrationMeasurements.sessionId], references: [farmCalibrationSessions.id] }),
}));

export const farmCalibrationResultsRelations = relations(farmCalibrationResults, ({ one }) => ({
  session: one(farmCalibrationSessions, { fields: [farmCalibrationResults.sessionId], references: [farmCalibrationSessions.id] }),
}));

// ==================== TYPE EXPORTS ====================

export type FarmPrinter = typeof farmPrinters.$inferSelect;
export type NewFarmPrinter = typeof farmPrinters.$inferInsert;

export type FarmMaterial = typeof farmMaterials.$inferSelect;
export type NewFarmMaterial = typeof farmMaterials.$inferInsert;

export type FarmModel = typeof farmModels.$inferSelect;
export type NewFarmModel = typeof farmModels.$inferInsert;

export type FarmSlicerProfile = typeof farmSlicerProfiles.$inferSelect;
export type NewFarmSlicerProfile = typeof farmSlicerProfiles.$inferInsert;

export type FarmBatchJob = typeof farmBatchJobs.$inferSelect;
export type NewFarmBatchJob = typeof farmBatchJobs.$inferInsert;

export type FarmPrintJob = typeof farmPrintJobs.$inferSelect;
export type NewFarmPrintJob = typeof farmPrintJobs.$inferInsert;

export type FarmJobLog = typeof farmJobLogs.$inferSelect;
export type NewFarmJobLog = typeof farmJobLogs.$inferInsert;

export type FarmSpoolmanSync = typeof farmSpoolmanSync.$inferSelect;
export type NewFarmSpoolmanSync = typeof farmSpoolmanSync.$inferInsert;

export type FarmNotification = typeof farmNotifications.$inferSelect;
export type NewFarmNotification = typeof farmNotifications.$inferInsert;

export type FarmNotificationPreference = typeof farmNotificationPreferences.$inferSelect;
export type NewFarmNotificationPreference = typeof farmNotificationPreferences.$inferInsert;

export type FarmPrinterMetric = typeof farmPrinterMetrics.$inferSelect;
export type NewFarmPrinterMetric = typeof farmPrinterMetrics.$inferInsert;

export type FarmFeasibilityCheck = typeof farmFeasibilityChecks.$inferSelect;
export type NewFarmFeasibilityCheck = typeof farmFeasibilityChecks.$inferInsert;

export type FarmOrientation = typeof farmOrientations.$inferSelect;
export type NewFarmOrientation = typeof farmOrientations.$inferInsert;

export type FarmAssignmentRule = typeof farmAssignmentRules.$inferSelect;
export type NewFarmAssignmentRule = typeof farmAssignmentRules.$inferInsert;

export type FarmAssignmentLog = typeof farmAssignmentLogs.$inferSelect;
export type NewFarmAssignmentLog = typeof farmAssignmentLogs.$inferInsert;

export type FarmMaintenanceTask = typeof farmMaintenanceTasks.$inferSelect;
export type NewFarmMaintenanceTask = typeof farmMaintenanceTasks.$inferInsert;

export type FarmSparePart = typeof farmSpareParts.$inferSelect;
export type NewFarmSparePart = typeof farmSpareParts.$inferInsert;

export type FarmMaintenancePart = typeof farmMaintenanceParts.$inferSelect;
export type NewFarmMaintenancePart = typeof farmMaintenanceParts.$inferInsert;

export type FarmPackingJob = typeof farmPackingJobs.$inferSelect;
export type NewFarmPackingJob = typeof farmPackingJobs.$inferInsert;

export type FarmPackingItem = typeof farmPackingItems.$inferSelect;
export type NewFarmPackingItem = typeof farmPackingItems.$inferInsert;

export type FarmCalibrationProcedure = typeof farmCalibrationProcedures.$inferSelect;
export type NewFarmCalibrationProcedure = typeof farmCalibrationProcedures.$inferInsert;

export type FarmCalibrationSession = typeof farmCalibrationSessions.$inferSelect;
export type NewFarmCalibrationSession = typeof farmCalibrationSessions.$inferInsert;

export type FarmCalibrationMeasurement = typeof farmCalibrationMeasurements.$inferSelect;
export type NewFarmCalibrationMeasurement = typeof farmCalibrationMeasurements.$inferInsert;

export type FarmCalibrationResult = typeof farmCalibrationResults.$inferSelect;
export type NewFarmCalibrationResult = typeof farmCalibrationResults.$inferInsert;

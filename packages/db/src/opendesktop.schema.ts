import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./shared.schema";

// ==================== BUILDINGS ====================

export const deskBuildings = sqliteTable("desk_buildings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  address: text("address"),
  description: text("description"),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ==================== ZONES ====================

export const deskZones = sqliteTable("desk_zones", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id").notNull().references(() => deskBuildings.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", { enum: ["room", "floor", "area", "hall"] }).default("room").notNull(),
  floor: integer("floor"),
  capacity: integer("capacity"),
  description: text("description"),
  color: text("color"),
  sortOrder: integer("sort_order").default(0),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_zones_building_idx").on(table.buildingId),
  index("desk_zones_type_idx").on(table.type),
]);

// ==================== WORKSTATIONS ====================

export const deskWorkstations = sqliteTable("desk_workstations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  zoneId: text("zone_id").notNull().references(() => deskZones.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type", { enum: ["scanning", "cad", "printing", "quality_check", "packaging", "assembly", "office", "general"] }).default("general").notNull(),
  status: text("status", { enum: ["active", "inactive", "maintenance", "reserved"] }).default("active").notNull(),
  assignedUserId: text("assigned_user_id").references(() => users.id),
  description: text("description"),
  positionX: real("position_x"),
  positionY: real("position_y"),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>(),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  imageUrl: text("image_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_ws_zone_idx").on(table.zoneId),
  index("desk_ws_type_idx").on(table.type),
  index("desk_ws_status_idx").on(table.status),
  index("desk_ws_user_idx").on(table.assignedUserId),
]);

// ==================== EQUIPMENT ====================

export const deskEquipment = sqliteTable("desk_equipment", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workstationId: text("workstation_id").notNull().references(() => deskWorkstations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category", { enum: ["computer", "monitor", "scanner_3d", "printer_3d", "tool", "measurement", "safety", "furniture", "other"] }).default("other").notNull(),
  serialNumber: text("serial_number"),
  inventoryArticleId: integer("inventory_article_id"),
  farmPrinterId: text("farm_printer_id"),
  status: text("status", { enum: ["operational", "broken", "maintenance", "retired"] }).default("operational").notNull(),
  purchaseDate: integer("purchase_date", { mode: "timestamp" }),
  warrantyUntil: integer("warranty_until", { mode: "timestamp" }),
  notes: text("notes"),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_equip_ws_idx").on(table.workstationId),
  index("desk_equip_cat_idx").on(table.category),
  index("desk_equip_status_idx").on(table.status),
]);

// ==================== WORKFLOWS ====================

export const deskWorkflows = sqliteTable("desk_workflows", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  workstationType: text("workstation_type", { enum: ["scanning", "cad", "printing", "quality_check", "packaging", "assembly", "office", "general", "any"] }).default("any").notNull(),
  status: text("status", { enum: ["draft", "active", "archived"] }).default("draft").notNull(),
  version: integer("version").default(1).notNull(),
  createdBy: text("created_by").references(() => users.id),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_wf_type_idx").on(table.workstationType),
  index("desk_wf_status_idx").on(table.status),
]);

// ==================== WORKFLOW STEPS ====================

export const deskWorkflowSteps = sqliteTable("desk_workflow_steps", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workflowId: text("workflow_id").notNull().references(() => deskWorkflows.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", { enum: ["manual", "automated", "approval", "checkpoint", "integration"] }).default("manual").notNull(),
  sortOrder: integer("sort_order").notNull(),
  estimatedMinutes: integer("estimated_minutes"),
  requiredRole: text("required_role"),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>(),
  integrationApp: text("integration_app"),
  integrationAction: text("integration_action"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_wfs_workflow_idx").on(table.workflowId),
]);

// ==================== WORKFLOW STEP CONDITIONS ====================

export const deskWorkflowStepConditions = sqliteTable("desk_workflow_step_conditions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  fromStepId: text("from_step_id").notNull().references(() => deskWorkflowSteps.id, { onDelete: "cascade" }),
  toStepId: text("to_step_id").notNull().references(() => deskWorkflowSteps.id, { onDelete: "cascade" }),
  conditionType: text("condition_type", { enum: ["always", "approval_required", "checklist_complete", "integration_success", "custom"] }).default("always").notNull(),
  conditionConfig: text("condition_config", { mode: "json" }).$type<Record<string, unknown>>(),
  sortOrder: integer("sort_order").default(0),
}, (table) => [
  index("desk_wfsc_from_idx").on(table.fromStepId),
]);

// ==================== WORKFLOW RUNS ====================

export const deskWorkflowRuns = sqliteTable("desk_workflow_runs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workflowId: text("workflow_id").notNull().references(() => deskWorkflows.id),
  workstationId: text("workstation_id").notNull().references(() => deskWorkstations.id),
  operatorId: text("operator_id").references(() => users.id),
  currentStepId: text("current_step_id").references(() => deskWorkflowSteps.id),
  status: text("status", { enum: ["running", "paused", "completed", "failed", "cancelled"] }).default("running").notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  notes: text("notes"),
  context: text("context", { mode: "json" }).$type<Record<string, unknown>>(),
}, (table) => [
  index("desk_wfr_workflow_idx").on(table.workflowId),
  index("desk_wfr_ws_idx").on(table.workstationId),
  index("desk_wfr_status_idx").on(table.status),
  index("desk_wfr_operator_idx").on(table.operatorId),
]);

// ==================== WORKFLOW RUN STEPS ====================

export const deskWorkflowRunSteps = sqliteTable("desk_workflow_run_steps", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  runId: text("run_id").notNull().references(() => deskWorkflowRuns.id, { onDelete: "cascade" }),
  stepId: text("step_id").notNull().references(() => deskWorkflowSteps.id),
  status: text("status", { enum: ["pending", "in_progress", "completed", "skipped", "failed"] }).default("pending").notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  operatorId: text("operator_id").references(() => users.id),
  result: text("result", { mode: "json" }).$type<Record<string, unknown>>(),
  notes: text("notes"),
}, (table) => [
  index("desk_wfrs_run_idx").on(table.runId),
  index("desk_wfrs_step_idx").on(table.stepId),
  index("desk_wfrs_status_idx").on(table.status),
]);

// ==================== INVENTORY LINKS ====================

export const deskInventoryLinks = sqliteTable("desk_inventory_links", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workstationId: text("workstation_id").notNull().references(() => deskWorkstations.id, { onDelete: "cascade" }),
  inventoryArticleId: integer("inventory_article_id").notNull(),
  artikelnummer: text("artikelnummer"),
  bezeichnung: text("bezeichnung"),
  quantity: real("quantity"),
  minQuantity: real("min_quantity"),
  locationType: text("location_type", { enum: ["storage_box", "tool_crate", "supply_bin", "output_tray"] }).default("storage_box").notNull(),
  position: text("position"),
  lastSyncAt: integer("last_sync_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_invlink_ws_idx").on(table.workstationId),
  index("desk_invlink_art_idx").on(table.inventoryArticleId),
]);

// ==================== PRINTER LINKS ====================

export const deskPrinterLinks = sqliteTable("desk_printer_links", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workstationId: text("workstation_id").notNull().references(() => deskWorkstations.id, { onDelete: "cascade" }),
  farmPrinterId: text("farm_printer_id").notNull(),
  printerName: text("printer_name"),
  isPrimary: integer("is_primary", { mode: "boolean" }).default(false),
  notes: text("notes"),
  lastSyncAt: integer("last_sync_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_prtlink_ws_idx").on(table.workstationId),
  index("desk_prtlink_printer_idx").on(table.farmPrinterId),
]);

// ==================== ISSUES ====================

export const deskIssues = sqliteTable("desk_issues", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workstationId: text("workstation_id").notNull().references(() => deskWorkstations.id),
  equipmentId: text("equipment_id").references(() => deskEquipment.id),
  reportedBy: text("reported_by").references(() => users.id),
  assignedTo: text("assigned_to").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority", { enum: ["low", "medium", "high", "critical"] }).default("medium").notNull(),
  status: text("status", { enum: ["open", "in_progress", "resolved", "closed"] }).default("open").notNull(),
  category: text("category", { enum: ["hardware", "software", "environment", "safety", "other"] }).default("other").notNull(),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  resolution: text("resolution"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_issues_ws_idx").on(table.workstationId),
  index("desk_issues_status_idx").on(table.status),
  index("desk_issues_priority_idx").on(table.priority),
  index("desk_issues_assigned_idx").on(table.assignedTo),
]);

// ==================== MODULES (Process Units) ====================

export const deskModules = sqliteTable("desk_modules", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  color: text("color"),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_modules_slug_idx").on(table.slug),
]);

export const deskModuleStatuses = sqliteTable("desk_module_statuses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  moduleId: text("module_id").notNull().references(() => deskModules.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  color: text("color"),
  isFinal: integer("is_final", { mode: "boolean" }).default(false).notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_modstat_module_idx").on(table.moduleId),
]);

export const deskModuleFields = sqliteTable("desk_module_fields", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  moduleId: text("module_id").notNull().references(() => deskModules.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  fieldType: text("field_type", { enum: ["text", "number", "date", "select", "checkbox", "textarea", "file", "url"] }).notNull(),
  required: integer("required", { mode: "boolean" }).default(false).notNull(),
  options: text("options", { mode: "json" }).$type<string[]>(),
  defaultValue: text("default_value"),
  visibilityRules: text("visibility_rules", { mode: "json" }).$type<Record<string, unknown>>(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_modfield_module_idx").on(table.moduleId),
]);

// ==================== VORGAENGE (Cases/Jobs) ====================

export const deskVorgaenge = sqliteTable("desk_vorgaenge", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  globalId: text("global_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority", { enum: ["low", "medium", "high", "critical"] }).default("medium").notNull(),
  deadline: integer("deadline", { mode: "timestamp" }),
  globalStatus: text("global_status", { enum: ["entwurf", "aktiv", "pausiert", "abgeschlossen", "storniert"] }).default("entwurf").notNull(),
  currentModuleId: text("current_module_id").references(() => deskModules.id),
  flowId: text("flow_id").references(() => deskFlows.id),
  currentFlowNodeId: text("current_flow_node_id"),
  customData: text("custom_data", { mode: "json" }).$type<Record<string, unknown>>(),
  createdBy: text("created_by").references(() => users.id),
  assignedTo: text("assigned_to").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_vg_status_idx").on(table.globalStatus),
  index("desk_vg_module_idx").on(table.currentModuleId),
  index("desk_vg_flow_idx").on(table.flowId),
  index("desk_vg_assigned_idx").on(table.assignedTo),
  index("desk_vg_priority_idx").on(table.priority),
]);

export const deskVorgangHistory = sqliteTable("desk_vorgang_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  vorgangId: text("vorgang_id").notNull().references(() => deskVorgaenge.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  moduleId: text("module_id").references(() => deskModules.id),
  oldStatus: text("old_status"),
  newStatus: text("new_status"),
  oldData: text("old_data", { mode: "json" }).$type<Record<string, unknown>>(),
  newData: text("new_data", { mode: "json" }).$type<Record<string, unknown>>(),
  comment: text("comment"),
  userId: text("user_id").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_vghist_vorgang_idx").on(table.vorgangId),
  index("desk_vghist_created_idx").on(table.createdAt),
]);

export const deskVorgangComments = sqliteTable("desk_vorgang_comments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  vorgangId: text("vorgang_id").notNull().references(() => deskVorgaenge.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id),
  content: text("content").notNull(),
  parentCommentId: text("parent_comment_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_vgcomm_vorgang_idx").on(table.vorgangId),
]);

export const deskVorgangFiles = sqliteTable("desk_vorgang_files", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  vorgangId: text("vorgang_id").notNull().references(() => deskVorgaenge.id, { onDelete: "cascade" }),
  moduleId: text("module_id").references(() => deskModules.id),
  filename: text("filename").notNull(),
  storedName: text("stored_name").notNull(),
  contentType: text("content_type"),
  fileSize: integer("file_size"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_vgfile_vorgang_idx").on(table.vorgangId),
]);

export const deskVorgangModules = sqliteTable("desk_vorgang_modules", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  vorgangId: text("vorgang_id").notNull().references(() => deskVorgaenge.id, { onDelete: "cascade" }),
  moduleId: text("module_id").notNull().references(() => deskModules.id),
  moduleStatusId: text("module_status_id").references(() => deskModuleStatuses.id),
  enteredAt: integer("entered_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  exitedAt: integer("exited_at", { mode: "timestamp" }),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  customData: text("custom_data", { mode: "json" }).$type<Record<string, unknown>>(),
}, (table) => [
  index("desk_vgmod_vorgang_idx").on(table.vorgangId),
  index("desk_vgmod_module_idx").on(table.moduleId),
  index("desk_vgmod_active_idx").on(table.isActive),
]);

// ==================== FLOWS (Process Definitions) ====================

export const deskFlows = sqliteTable("desk_flows", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: ["draft", "live", "archived"] }).default("draft").notNull(),
  version: integer("version").default(1).notNull(),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>(),
  createdBy: text("created_by").references(() => users.id),
  publishedAt: integer("published_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_flows_status_idx").on(table.status),
]);

export const deskFlowNodes = sqliteTable("desk_flow_nodes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  flowId: text("flow_id").notNull().references(() => deskFlows.id, { onDelete: "cascade" }),
  moduleId: text("module_id").notNull().references(() => deskModules.id),
  label: text("label"),
  positionX: real("position_x").default(0).notNull(),
  positionY: real("position_y").default(0).notNull(),
  isStart: integer("is_start", { mode: "boolean" }).default(false).notNull(),
  isEnd: integer("is_end", { mode: "boolean" }).default(false).notNull(),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_flnode_flow_idx").on(table.flowId),
  index("desk_flnode_module_idx").on(table.moduleId),
]);

export const deskFlowEdges = sqliteTable("desk_flow_edges", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  flowId: text("flow_id").notNull().references(() => deskFlows.id, { onDelete: "cascade" }),
  fromNodeId: text("from_node_id").notNull().references(() => deskFlowNodes.id, { onDelete: "cascade" }),
  toNodeId: text("to_node_id").notNull().references(() => deskFlowNodes.id, { onDelete: "cascade" }),
  label: text("label"),
  condition: text("condition", { mode: "json" }).$type<Record<string, unknown>>(),
  priority: integer("priority").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_fledge_flow_idx").on(table.flowId),
  index("desk_fledge_from_idx").on(table.fromNodeId),
  index("desk_fledge_to_idx").on(table.toNodeId),
]);

// ==================== TASKS ====================

export const deskTasks = sqliteTable("desk_tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  vorgangId: text("vorgang_id").references(() => deskVorgaenge.id, { onDelete: "cascade" }),
  moduleId: text("module_id").references(() => deskModules.id),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: text("assigned_to").references(() => users.id),
  assignedRole: text("assigned_role"),
  deadline: integer("deadline", { mode: "timestamp" }),
  priority: text("priority", { enum: ["low", "medium", "high", "critical"] }).default("medium").notNull(),
  status: text("status", { enum: ["offen", "in_bearbeitung", "erledigt", "storniert"] }).default("offen").notNull(),
  blocksAdvance: integer("blocks_advance", { mode: "boolean" }).default(false).notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("desk_tasks_vorgang_idx").on(table.vorgangId),
  index("desk_tasks_module_idx").on(table.moduleId),
  index("desk_tasks_assigned_idx").on(table.assignedTo),
  index("desk_tasks_status_idx").on(table.status),
]);

// ==================== RELATIONS ====================

export const deskBuildingsRelations = relations(deskBuildings, ({ many }) => ({
  zones: many(deskZones),
}));

export const deskZonesRelations = relations(deskZones, ({ one, many }) => ({
  building: one(deskBuildings, { fields: [deskZones.buildingId], references: [deskBuildings.id] }),
  workstations: many(deskWorkstations),
}));

export const deskWorkstationsRelations = relations(deskWorkstations, ({ one, many }) => ({
  zone: one(deskZones, { fields: [deskWorkstations.zoneId], references: [deskZones.id] }),
  assignedUser: one(users, { fields: [deskWorkstations.assignedUserId], references: [users.id] }),
  equipment: many(deskEquipment),
  inventoryLinks: many(deskInventoryLinks),
  printerLinks: many(deskPrinterLinks),
  issues: many(deskIssues),
  workflowRuns: many(deskWorkflowRuns),
}));

export const deskEquipmentRelations = relations(deskEquipment, ({ one }) => ({
  workstation: one(deskWorkstations, { fields: [deskEquipment.workstationId], references: [deskWorkstations.id] }),
}));

export const deskWorkflowsRelations = relations(deskWorkflows, ({ one, many }) => ({
  creator: one(users, { fields: [deskWorkflows.createdBy], references: [users.id] }),
  steps: many(deskWorkflowSteps),
  runs: many(deskWorkflowRuns),
}));

export const deskWorkflowStepsRelations = relations(deskWorkflowSteps, ({ one, many }) => ({
  workflow: one(deskWorkflows, { fields: [deskWorkflowSteps.workflowId], references: [deskWorkflows.id] }),
  conditionsFrom: many(deskWorkflowStepConditions, { relationName: "fromStep" }),
  runSteps: many(deskWorkflowRunSteps),
}));

export const deskWorkflowStepConditionsRelations = relations(deskWorkflowStepConditions, ({ one }) => ({
  fromStep: one(deskWorkflowSteps, { fields: [deskWorkflowStepConditions.fromStepId], references: [deskWorkflowSteps.id], relationName: "fromStep" }),
  toStep: one(deskWorkflowSteps, { fields: [deskWorkflowStepConditions.toStepId], references: [deskWorkflowSteps.id], relationName: "toStep" }),
}));

export const deskWorkflowRunsRelations = relations(deskWorkflowRuns, ({ one, many }) => ({
  workflow: one(deskWorkflows, { fields: [deskWorkflowRuns.workflowId], references: [deskWorkflows.id] }),
  workstation: one(deskWorkstations, { fields: [deskWorkflowRuns.workstationId], references: [deskWorkstations.id] }),
  operator: one(users, { fields: [deskWorkflowRuns.operatorId], references: [users.id] }),
  currentStep: one(deskWorkflowSteps, { fields: [deskWorkflowRuns.currentStepId], references: [deskWorkflowSteps.id] }),
  runSteps: many(deskWorkflowRunSteps),
}));

export const deskWorkflowRunStepsRelations = relations(deskWorkflowRunSteps, ({ one }) => ({
  run: one(deskWorkflowRuns, { fields: [deskWorkflowRunSteps.runId], references: [deskWorkflowRuns.id] }),
  step: one(deskWorkflowSteps, { fields: [deskWorkflowRunSteps.stepId], references: [deskWorkflowSteps.id] }),
  operator: one(users, { fields: [deskWorkflowRunSteps.operatorId], references: [users.id] }),
}));

export const deskInventoryLinksRelations = relations(deskInventoryLinks, ({ one }) => ({
  workstation: one(deskWorkstations, { fields: [deskInventoryLinks.workstationId], references: [deskWorkstations.id] }),
}));

export const deskPrinterLinksRelations = relations(deskPrinterLinks, ({ one }) => ({
  workstation: one(deskWorkstations, { fields: [deskPrinterLinks.workstationId], references: [deskWorkstations.id] }),
}));

export const deskIssuesRelations = relations(deskIssues, ({ one }) => ({
  workstation: one(deskWorkstations, { fields: [deskIssues.workstationId], references: [deskWorkstations.id] }),
  equipment: one(deskEquipment, { fields: [deskIssues.equipmentId], references: [deskEquipment.id] }),
  reporter: one(users, { fields: [deskIssues.reportedBy], references: [users.id] }),
  assignee: one(users, { fields: [deskIssues.assignedTo], references: [users.id] }),
}));

// --- Module relations ---

export const deskModulesRelations = relations(deskModules, ({ many }) => ({
  statuses: many(deskModuleStatuses),
  fields: many(deskModuleFields),
  flowNodes: many(deskFlowNodes),
  vorgangModules: many(deskVorgangModules),
  tasks: many(deskTasks),
}));

export const deskModuleStatusesRelations = relations(deskModuleStatuses, ({ one }) => ({
  module: one(deskModules, { fields: [deskModuleStatuses.moduleId], references: [deskModules.id] }),
}));

export const deskModuleFieldsRelations = relations(deskModuleFields, ({ one }) => ({
  module: one(deskModules, { fields: [deskModuleFields.moduleId], references: [deskModules.id] }),
}));

// --- Vorgang relations ---

export const deskVorgaengeRelations = relations(deskVorgaenge, ({ one, many }) => ({
  currentModule: one(deskModules, { fields: [deskVorgaenge.currentModuleId], references: [deskModules.id] }),
  flow: one(deskFlows, { fields: [deskVorgaenge.flowId], references: [deskFlows.id] }),
  creator: one(users, { fields: [deskVorgaenge.createdBy], references: [users.id], relationName: "vorgangCreator" }),
  assignee: one(users, { fields: [deskVorgaenge.assignedTo], references: [users.id], relationName: "vorgangAssignee" }),
  history: many(deskVorgangHistory),
  comments: many(deskVorgangComments),
  files: many(deskVorgangFiles),
  modules: many(deskVorgangModules),
  tasks: many(deskTasks),
}));

export const deskVorgangHistoryRelations = relations(deskVorgangHistory, ({ one }) => ({
  vorgang: one(deskVorgaenge, { fields: [deskVorgangHistory.vorgangId], references: [deskVorgaenge.id] }),
  module: one(deskModules, { fields: [deskVorgangHistory.moduleId], references: [deskModules.id] }),
  user: one(users, { fields: [deskVorgangHistory.userId], references: [users.id] }),
}));

export const deskVorgangCommentsRelations = relations(deskVorgangComments, ({ one }) => ({
  vorgang: one(deskVorgaenge, { fields: [deskVorgangComments.vorgangId], references: [deskVorgaenge.id] }),
  user: one(users, { fields: [deskVorgangComments.userId], references: [users.id] }),
}));

export const deskVorgangFilesRelations = relations(deskVorgangFiles, ({ one }) => ({
  vorgang: one(deskVorgaenge, { fields: [deskVorgangFiles.vorgangId], references: [deskVorgaenge.id] }),
  module: one(deskModules, { fields: [deskVorgangFiles.moduleId], references: [deskModules.id] }),
  uploader: one(users, { fields: [deskVorgangFiles.uploadedBy], references: [users.id] }),
}));

export const deskVorgangModulesRelations = relations(deskVorgangModules, ({ one }) => ({
  vorgang: one(deskVorgaenge, { fields: [deskVorgangModules.vorgangId], references: [deskVorgaenge.id] }),
  module: one(deskModules, { fields: [deskVorgangModules.moduleId], references: [deskModules.id] }),
  moduleStatus: one(deskModuleStatuses, { fields: [deskVorgangModules.moduleStatusId], references: [deskModuleStatuses.id] }),
}));

// --- Flow relations ---

export const deskFlowsRelations = relations(deskFlows, ({ one, many }) => ({
  creator: one(users, { fields: [deskFlows.createdBy], references: [users.id] }),
  nodes: many(deskFlowNodes),
  edges: many(deskFlowEdges),
  vorgaenge: many(deskVorgaenge),
}));

export const deskFlowNodesRelations = relations(deskFlowNodes, ({ one, many }) => ({
  flow: one(deskFlows, { fields: [deskFlowNodes.flowId], references: [deskFlows.id] }),
  module: one(deskModules, { fields: [deskFlowNodes.moduleId], references: [deskModules.id] }),
  edgesFrom: many(deskFlowEdges, { relationName: "edgeFrom" }),
  edgesTo: many(deskFlowEdges, { relationName: "edgeTo" }),
}));

export const deskFlowEdgesRelations = relations(deskFlowEdges, ({ one }) => ({
  flow: one(deskFlows, { fields: [deskFlowEdges.flowId], references: [deskFlows.id] }),
  fromNode: one(deskFlowNodes, { fields: [deskFlowEdges.fromNodeId], references: [deskFlowNodes.id], relationName: "edgeFrom" }),
  toNode: one(deskFlowNodes, { fields: [deskFlowEdges.toNodeId], references: [deskFlowNodes.id], relationName: "edgeTo" }),
}));

// --- Task relations ---

export const deskTasksRelations = relations(deskTasks, ({ one }) => ({
  vorgang: one(deskVorgaenge, { fields: [deskTasks.vorgangId], references: [deskVorgaenge.id] }),
  module: one(deskModules, { fields: [deskTasks.moduleId], references: [deskModules.id] }),
  assignee: one(users, { fields: [deskTasks.assignedTo], references: [users.id] }),
  creator: one(users, { fields: [deskTasks.createdBy], references: [users.id] }),
}));

// ==================== TYPE EXPORTS ====================

export type DeskBuilding = typeof deskBuildings.$inferSelect;
export type NewDeskBuilding = typeof deskBuildings.$inferInsert;

export type DeskZone = typeof deskZones.$inferSelect;
export type NewDeskZone = typeof deskZones.$inferInsert;

export type DeskWorkstation = typeof deskWorkstations.$inferSelect;
export type NewDeskWorkstation = typeof deskWorkstations.$inferInsert;

export type DeskEquipment = typeof deskEquipment.$inferSelect;
export type NewDeskEquipment = typeof deskEquipment.$inferInsert;

export type DeskWorkflow = typeof deskWorkflows.$inferSelect;
export type NewDeskWorkflow = typeof deskWorkflows.$inferInsert;

export type DeskWorkflowStep = typeof deskWorkflowSteps.$inferSelect;
export type NewDeskWorkflowStep = typeof deskWorkflowSteps.$inferInsert;

export type DeskWorkflowStepCondition = typeof deskWorkflowStepConditions.$inferSelect;
export type NewDeskWorkflowStepCondition = typeof deskWorkflowStepConditions.$inferInsert;

export type DeskWorkflowRun = typeof deskWorkflowRuns.$inferSelect;
export type NewDeskWorkflowRun = typeof deskWorkflowRuns.$inferInsert;

export type DeskWorkflowRunStep = typeof deskWorkflowRunSteps.$inferSelect;
export type NewDeskWorkflowRunStep = typeof deskWorkflowRunSteps.$inferInsert;

export type DeskInventoryLink = typeof deskInventoryLinks.$inferSelect;
export type NewDeskInventoryLink = typeof deskInventoryLinks.$inferInsert;

export type DeskPrinterLink = typeof deskPrinterLinks.$inferSelect;
export type NewDeskPrinterLink = typeof deskPrinterLinks.$inferInsert;

export type DeskIssue = typeof deskIssues.$inferSelect;
export type NewDeskIssue = typeof deskIssues.$inferInsert;

export type DeskModule = typeof deskModules.$inferSelect;
export type NewDeskModule = typeof deskModules.$inferInsert;

export type DeskModuleStatus = typeof deskModuleStatuses.$inferSelect;
export type NewDeskModuleStatus = typeof deskModuleStatuses.$inferInsert;

export type DeskModuleField = typeof deskModuleFields.$inferSelect;
export type NewDeskModuleField = typeof deskModuleFields.$inferInsert;

export type DeskVorgang = typeof deskVorgaenge.$inferSelect;
export type NewDeskVorgang = typeof deskVorgaenge.$inferInsert;

export type DeskVorgangHistory = typeof deskVorgangHistory.$inferSelect;
export type NewDeskVorgangHistory = typeof deskVorgangHistory.$inferInsert;

export type DeskVorgangComment = typeof deskVorgangComments.$inferSelect;
export type NewDeskVorgangComment = typeof deskVorgangComments.$inferInsert;

export type DeskVorgangFile = typeof deskVorgangFiles.$inferSelect;
export type NewDeskVorgangFile = typeof deskVorgangFiles.$inferInsert;

export type DeskVorgangModule = typeof deskVorgangModules.$inferSelect;
export type NewDeskVorgangModule = typeof deskVorgangModules.$inferInsert;

export type DeskFlow = typeof deskFlows.$inferSelect;
export type NewDeskFlow = typeof deskFlows.$inferInsert;

export type DeskFlowNode = typeof deskFlowNodes.$inferSelect;
export type NewDeskFlowNode = typeof deskFlowNodes.$inferInsert;

export type DeskFlowEdge = typeof deskFlowEdges.$inferSelect;
export type NewDeskFlowEdge = typeof deskFlowEdges.$inferInsert;

export type DeskTask = typeof deskTasks.$inferSelect;
export type NewDeskTask = typeof deskTasks.$inferInsert;

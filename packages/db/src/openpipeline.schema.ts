import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ==================== PIPELINES (Hauptpipelines + Sub-Pipelines) ====================

export const pipPipelines = sqliteTable("pip_pipelines", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  beschreibung: text("beschreibung"),
  ecosystemId: text("ecosystem_id"),
  elternPipelineId: text("eltern_pipeline_id"),
  templateId: text("template_id"),
  typ: text("typ", { enum: ["projekt", "geschaeft", "prozess", "vorlage"] }).notNull().default("projekt"),
  status: text("status", { enum: ["entwurf", "aktiv", "pausiert", "abgeschlossen", "archiviert"] }).notNull().default("entwurf"),
  farbe: text("farbe"),
  icon: text("icon"),
  sortierung: integer("sortierung").default(0),
  teamsChannelId: text("teams_channel_id"),
  bountyProjektId: text("bounty_projekt_id"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  erstelltVon: text("erstellt_von"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pip_pipelines_eltern_idx").on(table.elternPipelineId),
  index("pip_pipelines_status_idx").on(table.status),
  index("pip_pipelines_ecosystem_idx").on(table.ecosystemId),
]);

// ==================== STUFEN (Pipeline Stages / Listen) ====================

export const pipStufen = sqliteTable("pip_stufen", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pipelineId: text("pipeline_id").notNull().references(() => pipPipelines.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  beschreibung: text("beschreibung"),
  position: integer("position").notNull().default(0),
  farbe: text("farbe"),
  wipLimit: integer("wip_limit"),
  subPipelineId: text("sub_pipeline_id"),
  autoAssignUserId: text("auto_assign_user_id"),
  autoAssignArbeitsplatzId: text("auto_assign_arbeitsplatz_id"),
  istEndStufe: integer("ist_end_stufe", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pip_stufen_pipeline_idx").on(table.pipelineId),
  index("pip_stufen_position_idx").on(table.pipelineId, table.position),
]);

// ==================== KARTEN (Cards) ====================

export const pipKarten = sqliteTable("pip_karten", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pipelineId: text("pipeline_id").notNull().references(() => pipPipelines.id, { onDelete: "cascade" }),
  stufeId: text("stufe_id").notNull().references(() => pipStufen.id),
  titel: text("titel").notNull(),
  beschreibung: text("beschreibung"),
  prioritaet: text("prioritaet", { enum: ["kritisch", "hoch", "mittel", "niedrig"] }).notNull().default("mittel"),
  status: text("status", { enum: ["offen", "in_arbeit", "blockiert", "erledigt", "abgebrochen"] }).notNull().default("offen"),
  position: integer("position").notNull().default(0),
  zugewiesenAn: text("zugewiesen_an"),
  arbeitsplatzId: text("arbeitsplatz_id"),
  geschaetztStunden: real("geschaetzt_stunden"),
  tatsaechlichStunden: real("tatsaechlich_stunden"),
  faelligAm: integer("faellig_am", { mode: "timestamp" }),
  erledigtAm: integer("erledigt_am", { mode: "timestamp" }),
  teamsTicketId: text("teams_ticket_id"),
  bountyAufgabeId: text("bounty_aufgabe_id"),
  actionItemId: text("action_item_id"),
  quelle: text("quelle", { enum: ["manuell", "pipeline_generator", "teams_sync", "business_core", "vorlage", "api"] }).notNull().default("manuell"),
  quelleReferenz: text("quelle_referenz"),
  labels: text("labels", { mode: "json" }).$type<string[]>(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pip_karten_pipeline_idx").on(table.pipelineId),
  index("pip_karten_stufe_idx").on(table.stufeId),
  index("pip_karten_zugewiesen_idx").on(table.zugewiesenAn),
  index("pip_karten_status_idx").on(table.status),
  index("pip_karten_teams_idx").on(table.teamsTicketId),
  index("pip_karten_bounty_idx").on(table.bountyAufgabeId),
]);

// ==================== KARTEN-HISTORIE (Card Movement History) ====================

export const pipKartenHistorie = sqliteTable("pip_karten_historie", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  karteId: text("karte_id").notNull().references(() => pipKarten.id, { onDelete: "cascade" }),
  aktion: text("aktion", { enum: ["erstellt", "verschoben", "zugewiesen", "status_geaendert", "bearbeitet", "kommentar", "sync"] }).notNull(),
  vonStufeId: text("von_stufe_id"),
  nachStufeId: text("nach_stufe_id"),
  vonStatus: text("von_status"),
  nachStatus: text("nach_status"),
  userId: text("user_id"),
  kommentar: text("kommentar"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pip_historie_karte_idx").on(table.karteId),
  index("pip_historie_aktion_idx").on(table.aktion),
]);

// ==================== CHECKLISTEN ====================

export const pipChecklisten = sqliteTable("pip_checklisten", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  karteId: text("karte_id").notNull().references(() => pipKarten.id, { onDelete: "cascade" }),
  titel: text("titel").notNull(),
  erledigt: integer("erledigt", { mode: "boolean" }).default(false).notNull(),
  position: integer("position").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pip_checklisten_karte_idx").on(table.karteId),
]);

// ==================== VORLAGEN (Templates) ====================

export interface VorlageStufe {
  name: string;
  position: number;
  farbe?: string;
  wipLimit?: number;
  istEndStufe?: boolean;
}

export interface VorlageKarte {
  titel: string;
  beschreibung?: string;
  stufeIndex: number;
  prioritaet?: string;
  checkliste?: string[];
}

export const pipVorlagen = sqliteTable("pip_vorlagen", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  beschreibung: text("beschreibung"),
  kategorie: text("kategorie", { enum: ["geschaeft", "projekt", "prozess", "custom"] }).notNull().default("custom"),
  ecosystemId: text("ecosystem_id"),
  stufen: text("stufen", { mode: "json" }).$type<VorlageStufe[]>(),
  standardKarten: text("standard_karten", { mode: "json" }).$type<VorlageKarte[]>(),
  istSystem: integer("ist_system", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ==================== SYNC-LOG ====================

export const pipSyncLog = sqliteTable("pip_sync_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  richtung: text("richtung", { enum: ["eingehend", "ausgehend"] }).notNull(),
  quelle: text("quelle", { enum: ["teams", "openbounty", "opendesktop", "business_core"] }).notNull(),
  entitaetTyp: text("entitaet_typ", { enum: ["karte", "pipeline", "stufe"] }).notNull(),
  entitaetId: text("entitaet_id").notNull(),
  externeId: text("externe_id"),
  aktion: text("aktion", { enum: ["erstellt", "aktualisiert", "geloescht", "verschoben"] }).notNull(),
  payload: text("payload", { mode: "json" }),
  status: text("status", { enum: ["erfolg", "fehler", "ausstehend"] }).notNull().default("ausstehend"),
  fehlerDetails: text("fehler_details"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pip_sync_quelle_idx").on(table.quelle),
  index("pip_sync_entitaet_idx").on(table.entitaetTyp, table.entitaetId),
]);

// ==================== AUTOMATISIERUNGEN ====================

export interface AutomationBedingung {
  stufeId?: string;
  status?: string;
  prioritaet?: string;
}

export interface AutomationAktion {
  typ: "benachrichtigen" | "zuweisen" | "verschieben" | "webhook" | "devtools";
  parameter: Record<string, unknown>;
}

export const pipAutomatisierungen = sqliteTable("pip_automatisierungen", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pipelineId: text("pipeline_id").notNull().references(() => pipPipelines.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ausloeser: text("ausloeser", { enum: ["karte_verschoben", "karte_erstellt", "karte_erledigt", "stufe_voll", "zeitbasiert"] }).notNull(),
  bedingungen: text("bedingungen", { mode: "json" }).$type<AutomationBedingung>(),
  aktionen: text("aktionen", { mode: "json" }).$type<AutomationAktion[]>(),
  aktiv: integer("aktiv", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pip_auto_pipeline_idx").on(table.pipelineId),
]);

// ==================== RELATIONS ====================

export const pipPipelinesRelations = relations(pipPipelines, ({ one, many }) => ({
  elternPipeline: one(pipPipelines, { fields: [pipPipelines.elternPipelineId], references: [pipPipelines.id], relationName: "eltern" }),
  subPipelines: many(pipPipelines, { relationName: "eltern" }),
  stufen: many(pipStufen),
  karten: many(pipKarten),
  automatisierungen: many(pipAutomatisierungen),
}));

export const pipStufenRelations = relations(pipStufen, ({ one, many }) => ({
  pipeline: one(pipPipelines, { fields: [pipStufen.pipelineId], references: [pipPipelines.id] }),
  subPipeline: one(pipPipelines, { fields: [pipStufen.subPipelineId], references: [pipPipelines.id] }),
  karten: many(pipKarten),
}));

export const pipKartenRelations = relations(pipKarten, ({ one, many }) => ({
  pipeline: one(pipPipelines, { fields: [pipKarten.pipelineId], references: [pipPipelines.id] }),
  stufe: one(pipStufen, { fields: [pipKarten.stufeId], references: [pipStufen.id] }),
  historie: many(pipKartenHistorie),
  checklisten: many(pipChecklisten),
}));

export const pipKartenHistorieRelations = relations(pipKartenHistorie, ({ one }) => ({
  karte: one(pipKarten, { fields: [pipKartenHistorie.karteId], references: [pipKarten.id] }),
}));

export const pipChecklistenRelations = relations(pipChecklisten, ({ one }) => ({
  karte: one(pipKarten, { fields: [pipChecklisten.karteId], references: [pipKarten.id] }),
}));

export const pipAutomatisierungenRelations = relations(pipAutomatisierungen, ({ one }) => ({
  pipeline: one(pipPipelines, { fields: [pipAutomatisierungen.pipelineId], references: [pipPipelines.id] }),
}));

// ==================== TYPE EXPORTS ====================

export type Pipeline = typeof pipPipelines.$inferSelect;
export type NewPipeline = typeof pipPipelines.$inferInsert;
export type Stufe = typeof pipStufen.$inferSelect;
export type NewStufe = typeof pipStufen.$inferInsert;
export type Karte = typeof pipKarten.$inferSelect;
export type NewKarte = typeof pipKarten.$inferInsert;
export type KarteHistorie = typeof pipKartenHistorie.$inferSelect;
export type ChecklistenItem = typeof pipChecklisten.$inferSelect;
export type Vorlage = typeof pipVorlagen.$inferSelect;
export type NewVorlage = typeof pipVorlagen.$inferInsert;
export type SyncLogEntry = typeof pipSyncLog.$inferSelect;
export type Automatisierung = typeof pipAutomatisierungen.$inferSelect;

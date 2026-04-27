import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
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
  istVorlage: integer("ist_vorlage", { mode: "boolean" }).default(false).notNull(),
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

// ==================== MITGLIEDER (Pipeline Members / Access Control) ====================

export const pipMitglieder = sqliteTable("pip_mitglieder", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pipelineId: text("pipeline_id").notNull().references(() => pipPipelines.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  name: text("name"),
  rolle: text("rolle", { enum: ["vorgesetzter", "zuarbeiter"] }).notNull().default("zuarbeiter"),
  vertrauensLevel: integer("vertrauens_level").notNull().default(1),
  zugewieseneStufen: text("zugewiesene_stufen", { mode: "json" }).$type<string[] | null>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pip_mitglieder_pipeline_idx").on(table.pipelineId),
  index("pip_mitglieder_user_idx").on(table.userId),
  index("pip_mitglieder_pipeline_user_idx").on(table.pipelineId, table.userId),
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

// ==================== LISTENBESCHREIBUNG (Stage Descriptions) ====================

export interface OnboardingItem {
  titel: string;
  typ: "theorie" | "praxis" | "vormachen" | "korrektur";
  erledigt: boolean;
}

export const pipListenbeschreibung = sqliteTable("pip_listenbeschreibung", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  stufeId: text("stufe_id").notNull().references(() => pipStufen.id, { onDelete: "cascade" }),
  was: text("was").notNull(),
  warum: text("warum"),
  wie: text("wie"),
  videoUrl: text("video_url"),
  videoTitel: text("video_titel"),
  istEngpass: integer("ist_engpass", { mode: "boolean" }).default(false).notNull(),
  verantwortlicherUserId: text("verantwortlicher_user_id"),
  onboardingCheckliste: text("onboarding_checkliste", { mode: "json" }).$type<OnboardingItem[]>(),
  erstelltVon: text("erstellt_von"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  uniqueIndex("pip_listenbeschreibung_stufe_idx").on(table.stufeId),
]);

// ==================== LABELS ====================

export const pipLabels = sqliteTable("pip_labels", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pipelineId: text("pipeline_id").notNull().references(() => pipPipelines.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  farbe: text("farbe").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pip_labels_pipeline_idx").on(table.pipelineId),
]);

export const pipKartenLabels = sqliteTable("pip_karten_labels", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  karteId: text("karte_id").notNull().references(() => pipKarten.id, { onDelete: "cascade" }),
  labelId: text("label_id").notNull().references(() => pipLabels.id, { onDelete: "cascade" }),
}, (table) => [
  uniqueIndex("pip_karten_labels_unique_idx").on(table.karteId, table.labelId),
]);

// ==================== KARTEN-MITGLIEDER (Multiple Members per Card) ====================

export const pipKartenMitglieder = sqliteTable("pip_karten_mitglieder", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  karteId: text("karte_id").notNull().references(() => pipKarten.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  rolle: text("rolle", { enum: ["verantwortlich", "mitarbeiter"] }).notNull().default("mitarbeiter"),
  zugewiesenAm: integer("zugewiesen_am", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  uniqueIndex("pip_karten_mitglieder_unique_idx").on(table.karteId, table.userId),
  index("pip_karten_mitglieder_user_idx").on(table.userId),
]);

// ==================== KOMMENTARE (Rich-Text Comments) ====================

export const pipKommentare = sqliteTable("pip_kommentare", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  karteId: text("karte_id").notNull().references(() => pipKarten.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  inhalt: text("inhalt").notNull(),
  erwaehnteUser: text("erwaehnte_user", { mode: "json" }).$type<string[]>(),
  bearbeitetAm: integer("bearbeitet_am", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pip_kommentare_karte_idx").on(table.karteId),
  index("pip_kommentare_user_idx").on(table.userId),
]);

// ==================== CUSTOM FIELDS ====================

export const pipCustomFieldDefinitionen = sqliteTable("pip_custom_field_definitionen", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pipelineId: text("pipeline_id").notNull().references(() => pipPipelines.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  typ: text("typ", { enum: ["text", "zahl", "dropdown", "checkbox"] }).notNull(),
  optionen: text("optionen", { mode: "json" }).$type<string[]>(),
  istPrio: integer("ist_prio", { mode: "boolean" }).default(false).notNull(),
  position: integer("position").notNull().default(0),
  pflichtfeld: integer("pflichtfeld", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pip_cf_def_pipeline_idx").on(table.pipelineId),
]);

export const pipCustomFieldWerte = sqliteTable("pip_custom_field_werte", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  karteId: text("karte_id").notNull().references(() => pipKarten.id, { onDelete: "cascade" }),
  feldId: text("feld_id").notNull().references(() => pipCustomFieldDefinitionen.id, { onDelete: "cascade" }),
  wert: text("wert"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  uniqueIndex("pip_cf_werte_unique_idx").on(table.karteId, table.feldId),
  index("pip_cf_werte_karte_idx").on(table.karteId),
]);

// ==================== ANHAENGE (File Attachments) ====================

export const pipAnhaenge = sqliteTable("pip_anhaenge", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  karteId: text("karte_id").notNull().references(() => pipKarten.id, { onDelete: "cascade" }),
  dateiname: text("dateiname").notNull(),
  originalname: text("originalname").notNull(),
  groesse: integer("groesse").notNull(),
  mimetype: text("mimetype").notNull(),
  pfad: text("pfad").notNull(),
  hochgeladenVon: text("hochgeladen_von"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pip_anhaenge_karte_idx").on(table.karteId),
]);

// ==================== BENACHRICHTIGUNGEN (In-App Notifications) ====================

export const pipBenachrichtigungen = sqliteTable("pip_benachrichtigungen", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  typ: text("typ", { enum: ["zugewiesen", "kommentar", "faellig", "verschoben", "erwaehnt"] }).notNull(),
  karteId: text("karte_id").references(() => pipKarten.id, { onDelete: "cascade" }),
  pipelineId: text("pipeline_id").references(() => pipPipelines.id, { onDelete: "cascade" }),
  titel: text("titel").notNull(),
  nachricht: text("nachricht"),
  gelesen: integer("gelesen", { mode: "boolean" }).default(false).notNull(),
  link: text("link"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pip_benachrichtigungen_user_idx").on(table.userId, table.gelesen, table.createdAt),
]);

// ==================== FILTER-PRESETS ====================

export const pipFilterPresets = sqliteTable("pip_filter_presets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pipelineId: text("pipeline_id").notNull().references(() => pipPipelines.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  erstelltVon: text("erstellt_von").notNull(),
  istGlobal: integer("ist_global", { mode: "boolean" }).default(false).notNull(),
  filter: text("filter", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pip_filter_presets_pipeline_idx").on(table.pipelineId),
]);

// ==================== AUTOMATION-LOG ====================

export const pipAutomationLog = sqliteTable("pip_automation_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  automatisierungId: text("automatisierung_id").notNull().references(() => pipAutomatisierungen.id, { onDelete: "cascade" }),
  karteId: text("karte_id"),
  ergebnis: text("ergebnis", { enum: ["erfolg", "fehler"] }).notNull(),
  details: text("details", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pip_automation_log_auto_idx").on(table.automatisierungId),
]);

// ==================== RELATIONS ====================

export const pipPipelinesRelations = relations(pipPipelines, ({ one, many }) => ({
  elternPipeline: one(pipPipelines, { fields: [pipPipelines.elternPipelineId], references: [pipPipelines.id], relationName: "eltern" }),
  subPipelines: many(pipPipelines, { relationName: "eltern" }),
  stufen: many(pipStufen),
  karten: many(pipKarten),
  mitglieder: many(pipMitglieder),
  automatisierungen: many(pipAutomatisierungen),
  labels: many(pipLabels),
  customFieldDefinitionen: many(pipCustomFieldDefinitionen),
  filterPresets: many(pipFilterPresets),
}));

export const pipStufenRelations = relations(pipStufen, ({ one, many }) => ({
  pipeline: one(pipPipelines, { fields: [pipStufen.pipelineId], references: [pipPipelines.id] }),
  subPipeline: one(pipPipelines, { fields: [pipStufen.subPipelineId], references: [pipPipelines.id] }),
  karten: many(pipKarten),
  beschreibung: one(pipListenbeschreibung, { fields: [pipStufen.id], references: [pipListenbeschreibung.stufeId] }),
}));

export const pipKartenRelations = relations(pipKarten, ({ one, many }) => ({
  pipeline: one(pipPipelines, { fields: [pipKarten.pipelineId], references: [pipPipelines.id] }),
  stufe: one(pipStufen, { fields: [pipKarten.stufeId], references: [pipStufen.id] }),
  historie: many(pipKartenHistorie),
  checklisten: many(pipChecklisten),
  kartenLabels: many(pipKartenLabels),
  kartenMitglieder: many(pipKartenMitglieder),
  kommentare: many(pipKommentare),
  customFieldWerte: many(pipCustomFieldWerte),
  anhaenge: many(pipAnhaenge),
}));

export const pipKartenHistorieRelations = relations(pipKartenHistorie, ({ one }) => ({
  karte: one(pipKarten, { fields: [pipKartenHistorie.karteId], references: [pipKarten.id] }),
}));

export const pipChecklistenRelations = relations(pipChecklisten, ({ one }) => ({
  karte: one(pipKarten, { fields: [pipChecklisten.karteId], references: [pipKarten.id] }),
}));

export const pipMitgliederRelations = relations(pipMitglieder, ({ one }) => ({
  pipeline: one(pipPipelines, { fields: [pipMitglieder.pipelineId], references: [pipPipelines.id] }),
}));

export const pipAutomatisierungenRelations = relations(pipAutomatisierungen, ({ one, many }) => ({
  pipeline: one(pipPipelines, { fields: [pipAutomatisierungen.pipelineId], references: [pipPipelines.id] }),
  logs: many(pipAutomationLog),
}));

export const pipListenbeschreibungRelations = relations(pipListenbeschreibung, ({ one }) => ({
  stufe: one(pipStufen, { fields: [pipListenbeschreibung.stufeId], references: [pipStufen.id] }),
}));

export const pipLabelsRelations = relations(pipLabels, ({ one, many }) => ({
  pipeline: one(pipPipelines, { fields: [pipLabels.pipelineId], references: [pipPipelines.id] }),
  kartenLabels: many(pipKartenLabels),
}));

export const pipKartenLabelsRelations = relations(pipKartenLabels, ({ one }) => ({
  karte: one(pipKarten, { fields: [pipKartenLabels.karteId], references: [pipKarten.id] }),
  label: one(pipLabels, { fields: [pipKartenLabels.labelId], references: [pipLabels.id] }),
}));

export const pipKartenMitgliederRelations = relations(pipKartenMitglieder, ({ one }) => ({
  karte: one(pipKarten, { fields: [pipKartenMitglieder.karteId], references: [pipKarten.id] }),
}));

export const pipKommentareRelations = relations(pipKommentare, ({ one }) => ({
  karte: one(pipKarten, { fields: [pipKommentare.karteId], references: [pipKarten.id] }),
}));

export const pipCustomFieldDefinitionenRelations = relations(pipCustomFieldDefinitionen, ({ one, many }) => ({
  pipeline: one(pipPipelines, { fields: [pipCustomFieldDefinitionen.pipelineId], references: [pipPipelines.id] }),
  werte: many(pipCustomFieldWerte),
}));

export const pipCustomFieldWerteRelations = relations(pipCustomFieldWerte, ({ one }) => ({
  karte: one(pipKarten, { fields: [pipCustomFieldWerte.karteId], references: [pipKarten.id] }),
  definition: one(pipCustomFieldDefinitionen, { fields: [pipCustomFieldWerte.feldId], references: [pipCustomFieldDefinitionen.id] }),
}));

export const pipAnhaengeRelations = relations(pipAnhaenge, ({ one }) => ({
  karte: one(pipKarten, { fields: [pipAnhaenge.karteId], references: [pipKarten.id] }),
}));

export const pipFilterPresetsRelations = relations(pipFilterPresets, ({ one }) => ({
  pipeline: one(pipPipelines, { fields: [pipFilterPresets.pipelineId], references: [pipPipelines.id] }),
}));

export const pipAutomationLogRelations = relations(pipAutomationLog, ({ one }) => ({
  automatisierung: one(pipAutomatisierungen, { fields: [pipAutomationLog.automatisierungId], references: [pipAutomatisierungen.id] }),
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
export type PipelineMitglied = typeof pipMitglieder.$inferSelect;
export type NewPipelineMitglied = typeof pipMitglieder.$inferInsert;
export type Listenbeschreibung = typeof pipListenbeschreibung.$inferSelect;
export type NewListenbeschreibung = typeof pipListenbeschreibung.$inferInsert;
export type Label = typeof pipLabels.$inferSelect;
export type NewLabel = typeof pipLabels.$inferInsert;
export type KarteLabel = typeof pipKartenLabels.$inferSelect;
export type KarteMitglied = typeof pipKartenMitglieder.$inferSelect;
export type Kommentar = typeof pipKommentare.$inferSelect;
export type NewKommentar = typeof pipKommentare.$inferInsert;
export type CustomFieldDefinition = typeof pipCustomFieldDefinitionen.$inferSelect;
export type NewCustomFieldDefinition = typeof pipCustomFieldDefinitionen.$inferInsert;
export type CustomFieldWert = typeof pipCustomFieldWerte.$inferSelect;
export type Anhang = typeof pipAnhaenge.$inferSelect;
export type Benachrichtigung = typeof pipBenachrichtigungen.$inferSelect;
export type FilterPreset = typeof pipFilterPresets.$inferSelect;
export type AutomationLogEntry = typeof pipAutomationLog.$inferSelect;

// ==================== CANONICAL EVENTS (Wave 3 C5) ====================
// Cross-module event bus. Publishers POST @opensoftware/openpipeline-client
// events to openpipeline's /api/events; rows land here; the dispatcher fans
// them out to rows in pip_canonical_subscribers.

export const pipCanonicalEvents = sqliteTable("pip_canonical_events", {
  /** Event id supplied by the publisher (UUID). Unique by design. */
  id: text("id").primaryKey(),
  type: text("type").notNull(),           // e.g. "customer.created"
  source: text("source").notNull(),       // e.g. "openaccounting"
  workspaceId: text("workspace_id"),
  correlationId: text("correlation_id"),
  occurredAt: text("occurred_at").notNull(), // ISO-8601 from the publisher
  receivedAt: integer("received_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  payload: text("payload", { mode: "json" }).notNull(),
  /** received -> dispatched when all subscribers return 2xx. "partial" when some failed. */
  status: text("status", { enum: ["received", "dispatched", "partial", "failed"] }).notNull().default("received"),
  dispatchResults: text("dispatch_results", { mode: "json" }).$type<Array<{ subscriberId: string; ok: boolean; error?: string }>>(),
}, (table) => [
  index("pip_canon_events_type_idx").on(table.type),
  index("pip_canon_events_source_idx").on(table.source),
  index("pip_canon_events_workspace_idx").on(table.workspaceId),
  index("pip_canon_events_received_at_idx").on(table.receivedAt),
]);

export const pipCanonicalSubscribers = sqliteTable("pip_canonical_subscribers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  /** Display name, e.g. "openmailer:customer.created". */
  name: text("name").notNull(),
  /** Exact event type this subscriber receives, e.g. "customer.created". */
  eventType: text("event_type").notNull(),
  /** HTTP URL that receives POSTs with the full canonical event body. */
  webhookUrl: text("webhook_url").notNull(),
  /** Shared secret sent as X-OPENPIPELINE-Signature. Optional. */
  secret: text("secret"),
  /** Soft-disable without deleting. */
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  index("pip_canon_subs_type_idx").on(table.eventType),
  index("pip_canon_subs_enabled_idx").on(table.enabled),
]);

export type CanonicalEventRow = typeof pipCanonicalEvents.$inferSelect;
export type NewCanonicalEventRow = typeof pipCanonicalEvents.$inferInsert;
export type CanonicalSubscriber = typeof pipCanonicalSubscribers.$inferSelect;
export type NewCanonicalSubscriber = typeof pipCanonicalSubscribers.$inferInsert;

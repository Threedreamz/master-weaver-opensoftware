import { sqliteTable, text, integer, real, index, primaryKey } from "drizzle-orm/sqlite-core";

// ==================== ARBEITSPLÄTZE (WORKSTATIONS) ====================

export const zleArbeitsplaetze = sqliteTable("zle_arbeitsplaetze", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  standort: text("standort"),
  typ: text("typ", { enum: ["maschine", "desktop", "remote", "mobil"] }).notNull(),
  profilId: text("profil_id").notNull(),
  ecosystemId: text("ecosystem_id"),
  maschinenTyp: text("maschinen_typ"),
  konfiguration: text("konfiguration", { mode: "json" }).$type<ArbeitsplatzKonfiguration>(),
  dokumentation: text("dokumentation", { mode: "json" }).$type<ArbeitsplatzDokumentation[]>(),
  autoLogoutMinuten: integer("auto_logout_minuten").notNull().default(480),
  aktiv: integer("aktiv", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const zleArbeitsplatzSessions = sqliteTable("zle_arbeitsplatz_sessions", {
  id: text("id").primaryKey(),
  arbeitsplatzId: text("arbeitsplatz_id").notNull().references(() => zleArbeitsplaetze.id),
  userId: text("user_id").notNull(),
  loginZeit: integer("login_zeit", { mode: "timestamp" }).notNull(),
  logoutZeit: integer("logout_zeit", { mode: "timestamp" }),
  logoutTyp: text("logout_typ", { enum: ["manuell", "auto", "admin", "inaktivitaet"] }),
  dauer: integer("dauer"),
  notizen: text("notizen"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ==================== ZEITERFASSUNG (TIME TRACKING) ====================

export const zleProjekte = sqliteTable("zle_projekte", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kunde: text("kunde"),
  ecosystemId: text("ecosystem_id"),
  beschreibung: text("beschreibung"),
  budgetStunden: real("budget_stunden"),
  stundensatz: real("stundensatz"),
  abrechenbar: integer("abrechenbar", { mode: "boolean" }).notNull().default(true),
  status: text("status", { enum: ["aktiv", "pausiert", "abgeschlossen", "archiviert"] }).notNull().default("aktiv"),
  color: text("color"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const zleAufgaben = sqliteTable("zle_aufgaben", {
  id: text("id").primaryKey(),
  projektId: text("projekt_id").references(() => zleProjekte.id),
  userId: text("user_id"),
  titel: text("titel").notNull(),
  beschreibung: text("beschreibung"),
  prioritaet: text("prioritaet", { enum: ["hoch", "mittel", "niedrig"] }).notNull().default("mittel"),
  status: text("status", { enum: ["offen", "in_arbeit", "erledigt", "abgebrochen"] }).notNull().default("offen"),
  geschaetztStunden: real("geschaetzt_stunden"),
  tatsaechlichStunden: real("tatsaechlich_stunden"),
  quelle: text("quelle", { enum: ["manuell", "meeting_transkript", "git_issue", "import"] }).notNull().default("manuell"),
  quelleReferenz: text("quelle_referenz"),
  arbeitsplatzId: text("arbeitsplatz_id").references(() => zleArbeitsplaetze.id),
  faelligAm: integer("faellig_am", { mode: "timestamp" }),
  erledigtAm: integer("erledigt_am", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const zleZeiteintraege = sqliteTable("zle_zeiteintraege", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  projektId: text("projekt_id").references(() => zleProjekte.id),
  aufgabeId: text("aufgabe_id").references(() => zleAufgaben.id),
  startzeit: integer("startzeit", { mode: "timestamp" }).notNull(),
  endzeit: integer("endzeit", { mode: "timestamp" }),
  dauer: integer("dauer"),
  beschreibung: text("beschreibung"),
  abrechenbar: integer("abrechenbar", { mode: "boolean" }).notNull().default(true),
  typ: text("typ", { enum: ["arbeitsplatz", "meeting", "manuell", "pause"] }).notNull(),
  quelle: text("quelle", { enum: ["arbeitsplatz_session", "meetily", "teams", "manuell", "api"] }).notNull(),
  quelleId: text("quelle_id"),
  arbeitsplatzId: text("arbeitsplatz_id").references(() => zleArbeitsplaetze.id),
  geloescht: integer("geloescht", { mode: "boolean" }).notNull().default(false),
  externalId: text("external_id"),
  externalSystem: text("external_system"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => [
  index("idx_zeiteintraege_user_start").on(table.userId, table.startzeit),
  index("idx_zeiteintraege_projekt").on(table.projektId),
  index("idx_zeiteintraege_aufgabe").on(table.aufgabeId),
  index("idx_zeiteintraege_startzeit").on(table.startzeit),
]);

export const zlePausen = sqliteTable("zle_pausen", {
  id: text("id").primaryKey(),
  zeiteintrageId: text("zeiteintrage_id").notNull().references(() => zleZeiteintraege.id),
  startzeit: integer("startzeit", { mode: "timestamp" }).notNull(),
  endzeit: integer("endzeit", { mode: "timestamp" }),
  typ: text("typ", { enum: ["pflichtpause", "freiwillig"] }).notNull().default("freiwillig"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const zleArbeitsvertraege = sqliteTable("zle_arbeitsvertraege", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  wochenstunden: real("wochenstunden").notNull(),
  tagstunden: real("tagstunden").notNull().default(8),
  urlaubstage: integer("urlaubstage").notNull().default(30),
  gueltigAb: text("gueltig_ab").notNull(),
  gueltigBis: text("gueltig_bis"),
  ueberstundenRegelung: text("ueberstunden_regelung", { enum: ["keine", "abfeiern", "auszahlen", "beides"] }).notNull().default("beides"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ==================== MEETINGS ====================

export const zleMeetingZeiteintraege = sqliteTable("zle_meeting_zeiteintraege", {
  id: text("id").primaryKey(),
  zeiteintrageId: text("zeiteintrage_id").notNull().references(() => zleZeiteintraege.id),
  meetingQuelle: text("meeting_quelle", { enum: ["meetily", "teams"] }).notNull(),
  meetingRaumId: text("meeting_raum_id").notNull(),
  meetingTitel: text("meeting_titel"),
  teilnehmerAnzahl: integer("teilnehmer_anzahl"),
  hatTranskript: integer("hat_transkript", { mode: "boolean" }).notNull().default(false),
  hatAufzeichnung: integer("hat_aufzeichnung", { mode: "boolean" }).notNull().default(false),
  zusammenfassungStatus: text("zusammenfassung_status", { enum: ["ausstehend", "generiert", "fehler"] }).notNull().default("ausstehend"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const zleMeetingTodos = sqliteTable("zle_meeting_todos", {
  id: text("id").primaryKey(),
  meetingZeiteintrageId: text("meeting_zeiteintrage_id").notNull().references(() => zleMeetingZeiteintraege.id),
  aufgabeId: text("aufgabe_id").notNull().references(() => zleAufgaben.id),
  transkriptAbschnitt: text("transkript_abschnitt"),
  konfidenz: real("konfidenz"),
  bestaetigtVon: text("bestaetigt_von"),
  bestaetigtAm: integer("bestaetigt_am", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const zleMeetingDokumentation = sqliteTable("zle_meeting_dokumentation", {
  id: text("id").primaryKey(),
  meetingZeiteintrageId: text("meeting_zeiteintrage_id").notNull().references(() => zleMeetingZeiteintraege.id),
  titel: text("titel").notNull(),
  inhalt: text("inhalt").notNull(),
  typ: text("typ", { enum: ["zusammenfassung", "entscheidung", "aktionspunkt", "protokoll"] }).notNull(),
  llmProvider: text("llm_provider"),
  llmModel: text("llm_model"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ==================== LEISTUNG (PERFORMANCE) ====================

export const zleLeistungen = sqliteTable("zle_leistungen", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  projektId: text("projekt_id").references(() => zleProjekte.id),
  aufgabeId: text("aufgabe_id").references(() => zleAufgaben.id),
  typ: text("typ", { enum: ["commit", "pr", "deployment", "review", "todo_erledigt", "meeting_teilnahme", "dokumentation", "custom"] }).notNull(),
  titel: text("titel").notNull(),
  beschreibung: text("beschreibung"),
  referenz: text("referenz"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  arbeitsplatzSessionId: text("arbeitsplatz_session_id").references(() => zleArbeitsplatzSessions.id),
  erfasstAm: integer("erfasst_am", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => [
  index("idx_leistungen_user").on(table.userId),
  index("idx_leistungen_projekt").on(table.projektId),
  index("idx_leistungen_typ").on(table.typ),
  index("idx_leistungen_erfasst").on(table.erfasstAm),
]);

export const zleProofOfWorkScores = sqliteTable("zle_proof_of_work_scores", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  datum: text("datum").notNull(),
  arbeitsstunden: real("arbeitsstunden").notNull().default(0),
  meetingStunden: real("meeting_stunden").notNull().default(0),
  leistungenAnzahl: integer("leistungen_anzahl").notNull().default(0),
  todosErledigt: integer("todos_erledigt").notNull().default(0),
  commitsAnzahl: integer("commits_anzahl").notNull().default(0),
  score: integer("score").notNull().default(0),
  details: text("details", { mode: "json" }).$type<ProofOfWorkDetails>(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => [
  index("idx_pow_user_datum").on(table.userId, table.datum),
]);

// ==================== COMPLIANCE ====================

export const zleAuditLog = sqliteTable("zle_audit_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  aktion: text("aktion", { enum: ["erstellt", "geaendert", "geloescht", "genehmigt", "exportiert", "sync"] }).notNull(),
  entitaetTyp: text("entitaet_typ").notNull(),
  entitaetId: text("entitaet_id").notNull(),
  vorher: text("vorher", { mode: "json" }).$type<Record<string, unknown>>(),
  nachher: text("nachher", { mode: "json" }).$type<Record<string, unknown>>(),
  ipAdresse: text("ip_adresse"),
  userAgent: text("user_agent"),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const zleComplianceWarnungen = sqliteTable("zle_compliance_warnungen", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  typ: text("typ", { enum: ["max_arbeitszeit", "fehlende_pause", "sonntagsarbeit", "feiertagsarbeit", "ruhezeit"] }).notNull(),
  datum: text("datum").notNull(),
  details: text("details", { mode: "json" }).$type<Record<string, unknown>>(),
  bestaetigtVon: text("bestaetigt_von"),
  bestaetigtAm: integer("bestaetigt_am", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ==================== MITARBEITER (EMPLOYEES) ====================

export const zleMitarbeiter = sqliteTable("zle_mitarbeiter", {
  id: text("id").primaryKey(),
  openpayrollId: integer("openpayroll_id").unique(),
  personalnummer: text("personalnummer").unique().notNull(),
  vorname: text("vorname").notNull(),
  nachname: text("nachname").notNull(),
  email: text("email"),
  status: text("status", { enum: ["aktiv", "inaktiv", "ausgeschieden"] }).notNull().default("aktiv"),
  bundesland: text("bundesland").default("NW"),
  wochenstunden: real("wochenstunden"),
  tagstunden: real("tagstunden").default(8),
  stundenlohn: real("stundenlohn"),
  bruttoGehalt: real("brutto_gehalt"),
  hatAktivenVertrag: integer("hat_aktiven_vertrag", { mode: "boolean" }).notNull().default(false),
  syncedAt: integer("synced_at", { mode: "timestamp" }),
  syncHash: text("sync_hash"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => [
  index("idx_mitarbeiter_personalnummer").on(table.personalnummer),
  index("idx_mitarbeiter_status").on(table.status),
]);

export const zleTeams = sqliteTable("zle_teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  beschreibung: text("beschreibung"),
  leiterId: text("leiter_id").references(() => zleMitarbeiter.id),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const zleTeamMitglieder = sqliteTable("zle_team_mitglieder", {
  teamId: text("team_id").notNull().references(() => zleTeams.id),
  mitarbeiterId: text("mitarbeiter_id").notNull().references(() => zleMitarbeiter.id),
  rolle: text("rolle", { enum: ["mitglied", "leiter", "stellvertreter"] }).notNull().default("mitglied"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => [
  primaryKey({ columns: [table.teamId, table.mitarbeiterId] }),
]);

// ==================== INTERFACES ====================

export interface ArbeitsplatzKonfiguration {
  widgets: string[];
  todoKategorien: string[];
  eventQuellen: string[];
  extras?: Record<string, unknown>;
}

export interface ArbeitsplatzDokumentation {
  titel: string;
  url?: string;
  inhalt?: string;
  typ: "anleitung" | "sicherheit" | "wartung" | "notizen";
}

export interface ProofOfWorkDetails {
  todoScore: number;
  gitScore: number;
  meetingScore: number;
  dokuScore: number;
  praesenzScore: number;
}

// ==================== TYPE EXPORTS ====================

export type ZleArbeitsplatz = typeof zleArbeitsplaetze.$inferSelect;
export type NewZleArbeitsplatz = typeof zleArbeitsplaetze.$inferInsert;
export type ZleArbeitsplatzSession = typeof zleArbeitsplatzSessions.$inferSelect;
export type NewZleArbeitsplatzSession = typeof zleArbeitsplatzSessions.$inferInsert;
export type ZleProjekt = typeof zleProjekte.$inferSelect;
export type NewZleProjekt = typeof zleProjekte.$inferInsert;
export type ZleAufgabe = typeof zleAufgaben.$inferSelect;
export type NewZleAufgabe = typeof zleAufgaben.$inferInsert;
export type ZleZeiteintrag = typeof zleZeiteintraege.$inferSelect;
export type NewZleZeiteintrag = typeof zleZeiteintraege.$inferInsert;
export type ZlePause = typeof zlePausen.$inferSelect;
export type NewZlePause = typeof zlePausen.$inferInsert;
export type ZleArbeitsvertrag = typeof zleArbeitsvertraege.$inferSelect;
export type NewZleArbeitsvertrag = typeof zleArbeitsvertraege.$inferInsert;
export type ZleMeetingZeiteintrag = typeof zleMeetingZeiteintraege.$inferSelect;
export type NewZleMeetingZeiteintrag = typeof zleMeetingZeiteintraege.$inferInsert;
export type ZleMeetingTodo = typeof zleMeetingTodos.$inferSelect;
export type NewZleMeetingTodo = typeof zleMeetingTodos.$inferInsert;
export type ZleMeetingDoku = typeof zleMeetingDokumentation.$inferSelect;
export type NewZleMeetingDoku = typeof zleMeetingDokumentation.$inferInsert;
export type ZleLeistung = typeof zleLeistungen.$inferSelect;
export type NewZleLeistung = typeof zleLeistungen.$inferInsert;
export type ZleProofOfWorkScore = typeof zleProofOfWorkScores.$inferSelect;
export type NewZleProofOfWorkScore = typeof zleProofOfWorkScores.$inferInsert;
export type ZleAuditLogEntry = typeof zleAuditLog.$inferSelect;
export type NewZleAuditLogEntry = typeof zleAuditLog.$inferInsert;
export type ZleComplianceWarnung = typeof zleComplianceWarnungen.$inferSelect;
export type NewZleComplianceWarnung = typeof zleComplianceWarnungen.$inferInsert;
export type ZleMitarbeiter = typeof zleMitarbeiter.$inferSelect;
export type NewZleMitarbeiter = typeof zleMitarbeiter.$inferInsert;
export type ZleTeam = typeof zleTeams.$inferSelect;
export type NewZleTeam = typeof zleTeams.$inferInsert;
export type ZleTeamMitglied = typeof zleTeamMitglieder.$inferSelect;
export type NewZleTeamMitglied = typeof zleTeamMitglieder.$inferInsert;

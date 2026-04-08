import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ==================== EMPLOYEES ====================

export const payMitarbeiter = sqliteTable("pay_mitarbeiter", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personalnummer: text("personalnummer").notNull().unique(),
  vorname: text("vorname").notNull(),
  nachname: text("nachname").notNull(),
  geburtsdatum: text("geburtsdatum"),
  eintrittsdatum: text("eintrittsdatum").notNull(),
  austrittsdatum: text("austrittsdatum"),
  steuerklasse: integer("steuerklasse").notNull().default(1),
  steuerId: text("steuer_id"),
  sozialversicherungsnummer: text("sozialversicherungsnummer"),
  krankenkasse: text("krankenkasse"),
  krankenkasseBeitragssatz: real("krankenkasse_beitragssatz").default(14.6),
  kirchensteuer: integer("kirchensteuer", { mode: "boolean" }).default(false),
  bundesland: text("bundesland").default("NW"),
  kinderfreibetraege: real("kinderfreibetraege").default(0),
  iban: text("iban"),
  bic: text("bic"),
  adresse: text("adresse"),
  bruttoGehalt: real("brutto_gehalt").notNull(),
  stundenlohn: real("stundenlohn"),
  arbeitsstundenProWoche: real("arbeitsstunden_pro_woche").default(40),
  status: text("status", { enum: ["aktiv", "inaktiv", "ausgeschieden"] }).default("aktiv"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ==================== SALARY TYPES ====================

export const payLohnarten = sqliteTable("pay_lohnarten", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nummer: text("nummer").notNull().unique(),
  bezeichnung: text("bezeichnung").notNull(),
  typ: text("typ", { enum: ["brutto", "netto", "abzug", "ag_anteil"] }).notNull(),
  kontoSoll: text("konto_soll"),
  kontoHaben: text("konto_haben"),
  steuerpflichtig: integer("steuerpflichtig", { mode: "boolean" }).default(true),
  svPflichtig: integer("sv_pflichtig", { mode: "boolean" }).default(true),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== PAYROLL ENTRIES ====================

export const payLohnabrechnungen = sqliteTable("pay_lohnabrechnungen", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mitarbeiterId: integer("mitarbeiter_id").notNull().references(() => payMitarbeiter.id),
  monat: integer("monat").notNull(),
  jahr: integer("jahr").notNull(),
  bruttoGesamt: real("brutto_gesamt").notNull(),
  lohnsteuer: real("lohnsteuer").notNull(),
  solidaritaetszuschlag: real("solidaritaetszuschlag").default(0),
  kirchensteuerBetrag: real("kirchensteuer_betrag").default(0),
  kvAn: real("kv_an").notNull(),
  kvAg: real("kv_ag").notNull(),
  rvAn: real("rv_an").notNull(),
  rvAg: real("rv_ag").notNull(),
  avAn: real("av_an").notNull(),
  avAg: real("av_ag").notNull(),
  pvAn: real("pv_an").notNull(),
  pvAg: real("pv_ag").notNull(),
  netto: real("netto").notNull(),
  auszahlung: real("auszahlung").notNull(),
  positionen: text("positionen", { mode: "json" }).$type<Array<{ lohnartNr: string; bezeichnung: string; betrag: number }>>(),
  status: text("status", { enum: ["entwurf", "berechnet", "freigegeben", "ausgezahlt"] }).default("entwurf"),
  ausgezahltAm: text("ausgezahlt_am"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex("pay_lohn_unique").on(table.mitarbeiterId, table.monat, table.jahr),
]);

// ==================== RELATIONS ====================

export const payMitarbeiterRelations = relations(payMitarbeiter, ({ many }) => ({
  lohnabrechnungen: many(payLohnabrechnungen),
}));

export const payLohnabrechnungenRelations = relations(payLohnabrechnungen, ({ one }) => ({
  mitarbeiter: one(payMitarbeiter, { fields: [payLohnabrechnungen.mitarbeiterId], references: [payMitarbeiter.id] }),
}));

// ==================== TYPE EXPORTS ====================

export type PayMitarbeiter = typeof payMitarbeiter.$inferSelect;
export type NewPayMitarbeiter = typeof payMitarbeiter.$inferInsert;
export type PayLohnart = typeof payLohnarten.$inferSelect;
export type NewPayLohnart = typeof payLohnarten.$inferInsert;
export type PayLohnabrechnung = typeof payLohnabrechnungen.$inferSelect;
export type NewPayLohnabrechnung = typeof payLohnabrechnungen.$inferInsert;

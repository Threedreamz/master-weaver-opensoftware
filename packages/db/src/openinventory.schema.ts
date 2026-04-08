import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ==================== ARTICLE CATEGORIES ====================

export const invArtikelKategorien = sqliteTable("inv_artikel_kategorien", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color"),
  sortOrder: integer("sort_order").default(0),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== ARTICLES ====================

export const invArtikel = sqliteTable("inv_artikel", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  artikelnummer: text("artikelnummer").notNull().unique(),
  bezeichnung: text("bezeichnung").notNull(),
  beschreibung: text("beschreibung"),
  kategorie: text("kategorie"),
  kategorieId: integer("kategorie_id").references(() => invArtikelKategorien.id),
  einheit: text("einheit").default("Stück"),
  mindestbestand: real("mindestbestand").default(0),
  lagerbestand: real("lagerbestand").default(0),
  lagerort: text("lagerort"),
  preisProEinheit: real("preis_pro_einheit"),
  lieferantId: integer("lieferant_id").references(() => invLieferanten.id),
  notizen: text("notizen"),
  status: text("status", { enum: ["aktiv", "inaktiv", "ausgelaufen"] }).default("aktiv"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== SUPPLIERS ====================

export const invLieferanten = sqliteTable("inv_lieferanten", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nummer: text("nummer").notNull().unique(),
  name: text("name").notNull(),
  kontakt: text("kontakt"),
  email: text("email"),
  telefon: text("telefon"),
  adresse: text("adresse"),
  zahlungsbedingungen: text("zahlungsbedingungen"),
  bewertung: integer("bewertung"),
  notizen: text("notizen"),
  status: text("status", { enum: ["aktiv", "inaktiv"] }).default("aktiv"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== PURCHASE ORDERS ====================

export const invBestellungen = sqliteTable("inv_bestellungen", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bestellnummer: text("bestellnummer").notNull().unique(),
  lieferantId: integer("lieferant_id").notNull().references(() => invLieferanten.id),
  positionen: text("positionen", { mode: "json" }).$type<Array<{ artikelId: number; artikelnummer: string; bezeichnung: string; menge: number; einzelpreis: number; gesamtpreis: number }>>(),
  nettoBetrag: real("netto_betrag").notNull(),
  steuerBetrag: real("steuer_betrag").notNull(),
  bruttoBetrag: real("brutto_betrag").notNull(),
  kostenstelle: text("kostenstelle"),
  notizen: text("notizen"),
  genehmigtVon: text("genehmigt_von"),
  genehmigtAm: text("genehmigt_am"),
  status: text("status", { enum: ["entwurf", "angefordert", "genehmigt", "bestellt", "teilgeliefert", "geliefert", "storniert"] }).default("entwurf"),
  bestelltAm: text("bestellt_am"),
  erwartetAm: text("erwartet_am"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ==================== GOODS RECEIPT ====================

export const invWareneingaenge = sqliteTable("inv_wareneingaenge", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bestellungId: integer("bestellung_id").notNull().references(() => invBestellungen.id),
  positionen: text("positionen", { mode: "json" }).$type<Array<{ artikelId: number; menge: number; qualitaetOk: boolean; notizen?: string }>>(),
  notizen: text("notizen"),
  geprueftVon: text("geprueft_von"),
  status: text("status", { enum: ["offen", "geprueft", "eingelagert"] }).default("offen"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== STOCK MOVEMENTS ====================

export const invLagerbewegungen = sqliteTable("inv_lagerbewegungen", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  artikelId: integer("artikel_id").notNull().references(() => invArtikel.id),
  typ: text("typ", { enum: ["zugang", "abgang", "korrektur", "inventur"] }).notNull(),
  menge: real("menge").notNull(),
  bestandVorher: real("bestand_vorher").notNull(),
  bestandNachher: real("bestand_nachher").notNull(),
  referenzTyp: text("referenz_typ"),
  referenzId: integer("referenz_id"),
  notizen: text("notizen"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("inv_lager_artikel_idx").on(table.artikelId),
  index("inv_lager_created_idx").on(table.createdAt),
]);

// ==================== PRODUCTION ORDERS ====================

export const invProductionOrders = sqliteTable("inv_production_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull().unique(),
  orderId: integer("order_id"),
  customerName: text("customer_name"),
  customerCompany: text("customer_company"),
  items: text("items", { mode: "json" }).$type<Array<{ beschreibung: string; menge: number }>>(),
  currentStep: text("current_step", { enum: ["scanning", "cad", "qs_cad", "drucken", "qs_drucken"] }).default("scanning"),
  status: text("status", { enum: ["neu", "in_bearbeitung", "abgeschlossen", "storniert"] }).default("neu"),
  scanningStatus: text("scanning_status", { enum: ["offen", "in_bearbeitung", "abgeschlossen"] }).default("offen"),
  cadStatus: text("cad_status", { enum: ["offen", "in_bearbeitung", "abgeschlossen"] }).default("offen"),
  qsCadStatus: text("qs_cad_status", { enum: ["offen", "in_bearbeitung", "abgeschlossen", "abgelehnt"] }).default("offen"),
  druckenStatus: text("drucken_status", { enum: ["offen", "in_bearbeitung", "abgeschlossen"] }).default("offen"),
  qsDruckenStatus: text("qs_drucken_status", { enum: ["offen", "in_bearbeitung", "abgeschlossen", "abgelehnt"] }).default("offen"),
  druckenQtyPlanned: integer("drucken_qty_planned"),
  druckenQtyActual: integer("drucken_qty_actual"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const invProductionHistory = sqliteTable("inv_production_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productionOrderId: integer("production_order_id").notNull().references(() => invProductionOrders.id, { onDelete: "cascade" }),
  step: text("step").notNull(),
  action: text("action").notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status"),
  comment: text("comment"),
  userName: text("user_name"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const invProductionFiles = sqliteTable("inv_production_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productionOrderId: integer("production_order_id").notNull().references(() => invProductionOrders.id, { onDelete: "cascade" }),
  step: text("step").notNull(),
  filename: text("filename").notNull(),
  storedName: text("stored_name").notNull(),
  contentType: text("content_type"),
  fileSize: integer("file_size"),
  uploadedBy: text("uploaded_by"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== RELATIONS ====================

export const invArtikelRelations = relations(invArtikel, ({ one, many }) => ({
  kategorie: one(invArtikelKategorien, { fields: [invArtikel.kategorieId], references: [invArtikelKategorien.id] }),
  lieferant: one(invLieferanten, { fields: [invArtikel.lieferantId], references: [invLieferanten.id] }),
  lagerbewegungen: many(invLagerbewegungen),
}));

export const invArtikelKategorienRelations = relations(invArtikelKategorien, ({ many }) => ({
  artikel: many(invArtikel),
}));

export const invLieferantenRelations = relations(invLieferanten, ({ many }) => ({
  artikel: many(invArtikel),
  bestellungen: many(invBestellungen),
}));

export const invBestellungenRelations = relations(invBestellungen, ({ one, many }) => ({
  lieferant: one(invLieferanten, { fields: [invBestellungen.lieferantId], references: [invLieferanten.id] }),
  wareneingaenge: many(invWareneingaenge),
}));

export const invWareneingaengeRelations = relations(invWareneingaenge, ({ one }) => ({
  bestellung: one(invBestellungen, { fields: [invWareneingaenge.bestellungId], references: [invBestellungen.id] }),
}));

export const invLagerbewegungenRelations = relations(invLagerbewegungen, ({ one }) => ({
  artikel: one(invArtikel, { fields: [invLagerbewegungen.artikelId], references: [invArtikel.id] }),
}));

export const invProductionOrdersRelations = relations(invProductionOrders, ({ many }) => ({
  history: many(invProductionHistory),
  files: many(invProductionFiles),
}));

export const invProductionHistoryRelations = relations(invProductionHistory, ({ one }) => ({
  productionOrder: one(invProductionOrders, { fields: [invProductionHistory.productionOrderId], references: [invProductionOrders.id] }),
}));

export const invProductionFilesRelations = relations(invProductionFiles, ({ one }) => ({
  productionOrder: one(invProductionOrders, { fields: [invProductionFiles.productionOrderId], references: [invProductionOrders.id] }),
}));

// ==================== TYPE EXPORTS ====================

export type InvArtikel = typeof invArtikel.$inferSelect;
export type NewInvArtikel = typeof invArtikel.$inferInsert;
export type InvArtikelKategorie = typeof invArtikelKategorien.$inferSelect;
export type NewInvArtikelKategorie = typeof invArtikelKategorien.$inferInsert;
export type InvLieferant = typeof invLieferanten.$inferSelect;
export type NewInvLieferant = typeof invLieferanten.$inferInsert;
export type InvBestellung = typeof invBestellungen.$inferSelect;
export type NewInvBestellung = typeof invBestellungen.$inferInsert;
export type InvWareneingang = typeof invWareneingaenge.$inferSelect;
export type NewInvWareneingang = typeof invWareneingaenge.$inferInsert;
export type InvLagerbewegung = typeof invLagerbewegungen.$inferSelect;
export type NewInvLagerbewegung = typeof invLagerbewegungen.$inferInsert;
export type InvProductionOrder = typeof invProductionOrders.$inferSelect;
export type NewInvProductionOrder = typeof invProductionOrders.$inferInsert;

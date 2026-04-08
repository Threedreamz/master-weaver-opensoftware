import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ==================== MARKET MAP COMPANIES ====================

export const companies = sqliteTable("market_map_companies", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),

  // Identifikation
  vatId: text("vat_id"),
  registerNumber: text("register_number"),
  registerCourt: text("register_court"),
  registerType: text("register_type"),

  // Stammdaten
  companyName: text("company_name").notNull(),
  legalForm: text("legal_form"),
  foundingDate: text("founding_date"),
  companyStatus: text("company_status").default("active"),
  purpose: text("purpose"),
  shareCapital: integer("share_capital"),

  // Adresse
  street: text("street"),
  postalCode: text("postal_code"),
  city: text("city"),
  countryCode: text("country_code").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),

  // Kontakt
  website: text("website"),
  domain: text("domain"),
  email: text("email"),
  phone: text("phone"),

  // Klassifikation
  naceCode: text("nace_code"),
  naceName: text("nace_name"),
  industry: text("industry"),
  employeesMin: integer("employees_min"),
  employeesMax: integer("employees_max"),
  revenueMin: integer("revenue_min"),
  revenueMax: integer("revenue_max"),

  // Personen (JSON)
  managingDirectors: text("managing_directors", { mode: "json" }),
  shareholders: text("shareholders", { mode: "json" }),

  // Finanzen & Risiko
  creditScore: integer("credit_score"),
  creditRating: text("credit_rating"),
  riskClass: integer("risk_class"),
  insolvencyRisk: integer("insolvency_risk").default(0),
  paymentBehavior: integer("payment_behavior"),

  // Enrichment & Scoring
  enrichmentStatus: text("enrichment_status").default("pending"),
  enrichmentDate: text("enrichment_date"),
  leadScore: integer("lead_score").default(0),
  leadStatus: text("lead_status").default("new"),
  source: text("source"),
  sourceUrl: text("source_url"),
  sourceId: text("source_id"),
  confidenceScore: real("confidence_score"),

  // Meta
  tags: text("tags", { mode: "json" }),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => [
  uniqueIndex("companies_vat_idx").on(table.vatId),
  index("companies_country_idx").on(table.countryCode),
  index("companies_plz_idx").on(table.postalCode),
  index("companies_score_idx").on(table.leadScore),
  index("companies_status_idx").on(table.enrichmentStatus),
  index("companies_name_idx").on(table.companyName),
  index("companies_source_id_idx").on(table.sourceId),
]);

// ==================== RESEARCH RUNS ====================

export const researchRuns = sqliteTable("market_map_research_runs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  countryCode: text("country_code").notNull(),
  postalCode: text("postal_code"),
  status: text("status").default("pending"),
  companiesFound: integer("companies_found").default(0),
  companiesNew: integer("companies_new").default(0),
  companiesEnriched: integer("companies_enriched").default(0),
  source: text("source"),
  error: text("error"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
}, (table) => [
  index("research_runs_country_idx").on(table.countryCode),
  index("research_runs_status_idx").on(table.status),
]);

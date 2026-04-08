import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ==================== CUSTOMERS ====================

export const acctCustomers = sqliteTable("acct_customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerNumber: text("customer_number").notNull().unique(),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
  vatId: text("vat_id"),
  vatValid: integer("vat_valid", { mode: "boolean" }),
  type: text("type", { enum: ["B2B", "B2C"] }).default("B2C"),
  legalForm: text("legal_form"),
  website: text("website"),
  registerNumber: text("register_number"),
  registerCourt: text("register_court"),
  industry: text("industry"),
  street: text("street"),
  zip: text("zip"),
  city: text("city"),
  country: text("country").default("DE"),
  status: text("status", { enum: ["active", "inactive"] }).default("active"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const acctCustomerContacts = sqliteTable("acct_customer_contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull().references(() => acctCustomers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role"),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const acctCustomerAddresses = sqliteTable("acct_customer_addresses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull().references(() => acctCustomers.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["delivery", "billing"] }).notNull(),
  label: text("label"),
  name: text("name"),
  street: text("street"),
  zip: text("zip"),
  city: text("city"),
  country: text("country").default("DE"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== SUPPLIERS ====================

export const acctSuppliers = sqliteTable("acct_suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierNumber: text("supplier_number").notNull().unique(),
  name: text("name").notNull(),
  company: text("company"),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  street: text("street"),
  zip: text("zip"),
  city: text("city"),
  country: text("country").default("DE"),
  paymentTermsDays: integer("payment_terms_days").default(30),
  paymentTerms: text("payment_terms"),
  rating: integer("rating"),
  status: text("status", { enum: ["active", "inactive"] }).default("active"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== NUMBER SEQUENCES ====================

export const acctNumberSequences = sqliteTable("acct_number_sequences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  prefix: text("prefix").notNull(),
  year: integer("year").notNull(),
  lastSeq: integer("last_seq").notNull().default(0),
}, (table) => [
  uniqueIndex("acct_numseq_prefix_year").on(table.prefix, table.year),
]);

export const acctNumberFormats = sqliteTable("acct_number_formats", {
  prefix: text("prefix").primaryKey(),
  label: text("label").notNull(),
  formatTemplate: text("format_template").notNull(),
  padding: integer("padding").default(4),
  perYear: integer("per_year", { mode: "boolean" }).default(true),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ==================== CHART OF ACCOUNTS ====================

export const acctKonten = sqliteTable("acct_konten", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kontonummer: text("kontonummer").notNull(),
  bezeichnung: text("bezeichnung").notNull(),
  typ: text("typ", { enum: ["aktiv", "passiv", "aufwand", "ertrag"] }).notNull(),
  kontenrahmen: text("kontenrahmen", { enum: ["SKR03", "SKR04"] }).default("SKR03"),
  kontenklasse: text("kontenklasse"),
  parentKonto: text("parent_konto"),
  steuerschluesselId: integer("steuerschluessel_id"),
  standardSatz: real("standard_satz"),
  isAutomatik: integer("is_automatik", { mode: "boolean" }).default(false),
  isSammelkonto: integer("is_sammelkonto", { mode: "boolean" }).default(false),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const acctKostenstellen = sqliteTable("acct_kostenstellen", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nummer: text("nummer").notNull().unique(),
  bezeichnung: text("bezeichnung").notNull(),
  verantwortlicher: text("verantwortlicher"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const acctSteuerschluessel = sqliteTable("acct_steuerschluessel", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  schluessel: text("schluessel").notNull().unique(),
  bezeichnung: text("bezeichnung").notNull(),
  steuersatz: real("steuersatz").notNull(),
  steuerkonto: text("steuerkonto"),
  typ: text("typ"),
  ustvaKennzahl: text("ustva_kennzahl"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

// ==================== SALES PIPELINE ====================

export const acctInquiries = sqliteTable("acct_inquiries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull().unique(),
  customerId: integer("customer_id").references(() => acctCustomers.id),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  subject: text("subject").notNull(),
  message: text("message"),
  customerType: text("customer_type", { enum: ["B2B", "B2C"] }),
  source: text("source", { enum: ["website", "email", "phone", "manual"] }).default("manual"),
  status: text("status", { enum: ["neu", "in_bearbeitung", "angebot_erstellt", "abgeschlossen", "abgelehnt"] }).default("neu"),
  notes: text("notes"),
  assignedTo: text("assigned_to"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const acctInquiryAttachments = sqliteTable("acct_inquiry_attachments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  inquiryId: integer("inquiry_id").notNull().references(() => acctInquiries.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  storedName: text("stored_name").notNull(),
  contentType: text("content_type"),
  fileSize: integer("file_size"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const acctAngebote = sqliteTable("acct_angebote", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull().unique(),
  inquiryId: integer("inquiry_id").references(() => acctInquiries.id),
  customerId: integer("customer_id").references(() => acctCustomers.id),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerCompany: text("customer_company"),
  items: text("items", { mode: "json" }).$type<Array<{ beschreibung: string; menge: number; einheit: string; einzelpreis: number; gesamtpreis: number }>>(),
  netAmount: real("net_amount").notNull(),
  taxRate: real("tax_rate").default(19.0),
  taxAmount: real("tax_amount").notNull(),
  grossAmount: real("gross_amount").notNull(),
  validUntil: text("valid_until"),
  notes: text("notes"),
  billingStreet: text("billing_street"),
  billingZip: text("billing_zip"),
  billingCity: text("billing_city"),
  billingCountry: text("billing_country").default("DE"),
  deliveryStreet: text("delivery_street"),
  deliveryZip: text("delivery_zip"),
  deliveryCity: text("delivery_city"),
  deliveryCountry: text("delivery_country").default("DE"),
  paymentTerms: text("payment_terms"),
  paymentTermsDays: integer("payment_terms_days").default(14),
  customerReference: text("customer_reference"),
  status: text("status", { enum: ["entwurf", "gesendet", "angenommen", "abgelehnt", "in_auftrag"] }).default("entwurf"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const acctOrders = sqliteTable("acct_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull().unique(),
  inquiryId: integer("inquiry_id").references(() => acctInquiries.id),
  angebotId: integer("angebot_id").references(() => acctAngebote.id),
  customerId: integer("customer_id").references(() => acctCustomers.id),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerCompany: text("customer_company"),
  customerType: text("customer_type", { enum: ["B2B", "B2C"] }),
  items: text("items", { mode: "json" }).$type<Array<{ beschreibung: string; menge: number; einheit: string; einzelpreis: number; gesamtpreis: number }>>(),
  netAmount: real("net_amount").notNull(),
  taxRate: real("tax_rate").default(19.0),
  taxAmount: real("tax_amount").notNull(),
  grossAmount: real("gross_amount").notNull(),
  notes: text("notes"),
  billingStreet: text("billing_street"),
  billingZip: text("billing_zip"),
  billingCity: text("billing_city"),
  billingCountry: text("billing_country").default("DE"),
  deliveryStreet: text("delivery_street"),
  deliveryZip: text("delivery_zip"),
  deliveryCity: text("delivery_city"),
  deliveryCountry: text("delivery_country").default("DE"),
  paymentTerms: text("payment_terms"),
  paymentTermsDays: integer("payment_terms_days").default(14),
  followUpDate: text("follow_up_date"),
  customerReference: text("customer_reference"),
  status: text("status", { enum: ["neu", "in_bearbeitung", "in_produktion", "versendet", "abgeschlossen", "storniert"] }).default("neu"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ==================== INVOICES ====================

export const acctInvoices = sqliteTable("acct_invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceNumber: text("invoice_number").notNull().unique(),
  orderId: integer("order_id").references(() => acctOrders.id),
  customerId: integer("customer_id").references(() => acctCustomers.id),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerCompany: text("customer_company"),
  billingStreet: text("billing_street"),
  billingZip: text("billing_zip"),
  billingCity: text("billing_city"),
  billingCountry: text("billing_country").default("DE"),
  deliveryStreet: text("delivery_street"),
  deliveryZip: text("delivery_zip"),
  deliveryCity: text("delivery_city"),
  deliveryCountry: text("delivery_country").default("DE"),
  items: text("items", { mode: "json" }).$type<Array<{ beschreibung: string; menge: number; einheit: string; einzelpreis: number; gesamtpreis: number }>>(),
  status: text("status", { enum: ["entwurf", "gesendet", "bezahlt", "storniert", "ueberfaellig"] }).default("entwurf"),
  netAmount: real("net_amount").notNull(),
  taxRate: real("tax_rate").default(19.0),
  taxAmount: real("tax_amount").notNull(),
  grossAmount: real("gross_amount").notNull(),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date").notNull(),
  paidAt: text("paid_at"),
  paymentTermsDays: integer("payment_terms_days").default(14),
  customerType: text("customer_type", { enum: ["B2B", "B2C"] }),
  customerReference: text("customer_reference"),
  notes: text("notes"),
  auditHash: text("audit_hash"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const acctInvoiceItems = sqliteTable("acct_invoice_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id").notNull().references(() => acctInvoices.id, { onDelete: "cascade" }),
  beschreibung: text("beschreibung").notNull(),
  menge: real("menge").notNull(),
  einheit: text("einheit").default("Stück"),
  einzelpreis: real("einzelpreis").notNull(),
  gesamtpreis: real("gesamtpreis").notNull(),
});

export const acctCreditNotes = sqliteTable("acct_credit_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull().unique(),
  invoiceId: integer("invoice_id").references(() => acctInvoices.id),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerCompany: text("customer_company"),
  items: text("items", { mode: "json" }).$type<Array<{ beschreibung: string; menge: number; einheit: string; einzelpreis: number; gesamtpreis: number }>>(),
  netAmount: real("net_amount").notNull(),
  taxRate: real("tax_rate").default(19.0),
  taxAmount: real("tax_amount").notNull(),
  grossAmount: real("gross_amount").notNull(),
  reason: text("reason"),
  customerReference: text("customer_reference"),
  notes: text("notes"),
  status: text("status", { enum: ["entwurf", "gesendet", "verbucht"] }).default("entwurf"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const acctReminders = sqliteTable("acct_reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id").notNull().references(() => acctInvoices.id),
  level: integer("level").notNull().default(1),
  fee: real("fee").default(0),
  interestRate: real("interest_rate").default(0),
  interestAmount: real("interest_amount").default(0),
  totalDue: real("total_due").notNull(),
  dueDate: text("due_date").notNull(),
  notes: text("notes"),
  status: text("status", { enum: ["entwurf", "gesendet", "bezahlt"] }).default("entwurf"),
  sentAt: text("sent_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const acctDeliveryNotes = sqliteTable("acct_delivery_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull().unique(),
  invoiceId: integer("invoice_id").references(() => acctInvoices.id),
  customerId: integer("customer_id").references(() => acctCustomers.id),
  items: text("items", { mode: "json" }).$type<Array<{ beschreibung: string; menge: number }>>(),
  notes: text("notes"),
  status: text("status", { enum: ["entwurf", "gesendet"] }).default("entwurf"),
  pdfPath: text("pdf_path"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== PAYMENTS ====================

export const acctPayments = sqliteTable("acct_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id").references(() => acctInvoices.id),
  orderId: integer("order_id").references(() => acctOrders.id),
  method: text("method", { enum: ["ueberweisung", "sepa", "karte", "paypal", "klarna", "bar"] }),
  amount: real("amount").notNull(),
  currency: text("currency").default("EUR"),
  reference: text("reference"),
  payerName: text("payer_name"),
  payerEmail: text("payer_email"),
  payerIban: text("payer_iban"),
  notes: text("notes"),
  status: text("status", { enum: ["offen", "eingegangen", "zugeordnet", "erstattet"] }).default("offen"),
  type: text("type", { enum: ["eingang", "ausgang", "erstattung"] }).default("eingang"),
  originalPaymentId: integer("original_payment_id"),
  creditNoteId: integer("credit_note_id").references(() => acctCreditNotes.id),
  paidAt: text("paid_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== SHIPPING ====================

export const acctShipments = sqliteTable("acct_shipments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull().unique(),
  orderId: integer("order_id").references(() => acctOrders.id),
  trackingNumber: text("tracking_number"),
  carrier: text("carrier").default("dhl"),
  weightKg: real("weight_kg"),
  lengthCm: real("length_cm"),
  widthCm: real("width_cm"),
  heightCm: real("height_cm"),
  items: text("items", { mode: "json" }).$type<Array<{ beschreibung: string; menge: number }>>(),
  notes: text("notes"),
  recipientName: text("recipient_name"),
  recipientCompany: text("recipient_company"),
  recipientStreet: text("recipient_street"),
  recipientZip: text("recipient_zip"),
  recipientCity: text("recipient_city"),
  recipientCountry: text("recipient_country").default("DE"),
  shippingType: text("shipping_type", { enum: ["paket", "express", "warenpost", "sperrgut"] }).default("paket"),
  plannedDeliveryDate: text("planned_delivery_date"),
  customerReference: text("customer_reference"),
  labelUrl: text("label_url"),
  lastTrackingEvent: text("last_tracking_event"),
  lastTrackingUpdate: text("last_tracking_update"),
  isProblem: integer("is_problem", { mode: "boolean" }).default(false),
  problemReason: text("problem_reason"),
  status: text("status", { enum: ["neu", "label_erstellt", "abgeholt", "in_zustellung", "zugestellt", "problem", "retour"] }).default("neu"),
  shippedAt: text("shipped_at"),
  deliveredAt: text("delivered_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ==================== BOOKING ENTRIES ====================

export const acctBookingEntries = sqliteTable("acct_booking_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id").references(() => acctTransactions.id),
  documentId: integer("document_id").references(() => acctDocuments.id),
  matchId: integer("match_id"),
  datum: text("datum").notNull(),
  betrag: real("betrag").notNull(),
  sollHaben: text("soll_haben", { enum: ["S", "H"] }).notNull(),
  konto: text("konto").notNull(),
  gegenkonto: text("gegenkonto").notNull(),
  buchungstext: text("buchungstext").notNull(),
  belegnummer: text("belegnummer"),
  steuerschluessel: text("steuerschluessel"),
  taxRate: real("tax_rate"),
  taxKey: text("tax_key"),
  kostenstelle: text("kostenstelle"),
  status: text("status", { enum: ["vorschlag", "geprueft", "exportiert"] }).default("vorschlag"),
  autoCategorized: integer("auto_categorized", { mode: "boolean" }).default(false),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const acctCategorizationRules = sqliteTable("acct_categorization_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  matchField: text("match_field", { enum: ["counterparty", "reference", "amount"] }).notNull(),
  matchValue: text("match_value").notNull(),
  matchType: text("match_type", { enum: ["exact", "contains", "regex"] }).default("contains"),
  targetKonto: text("target_konto"),
  targetGegenkonto: text("target_gegenkonto"),
  targetTaxRate: real("target_tax_rate"),
  targetKostenstelle: text("target_kostenstelle"),
  priority: integer("priority").default(0),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== TRANSACTIONS ====================

export const acctTransactions = sqliteTable("acct_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  connectionId: integer("connection_id").references(() => acctFinapiConnections.id),
  bankAccountId: text("bank_account_id"),
  date: text("date").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").default("EUR"),
  counterpartyName: text("counterparty_name"),
  counterpartyIban: text("counterparty_iban"),
  reference: text("reference"),
  category: text("category"),
  status: text("status", { enum: ["unmatched", "matched", "ignored"] }).default("unmatched"),
  importedAt: text("imported_at").default(sql`(datetime('now'))`),
});

// ==================== DOCUMENTS ====================

export const acctDocuments = sqliteTable("acct_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  source: text("source"),
  supplier: text("supplier"),
  supplierId: integer("supplier_id").references(() => acctSuppliers.id),
  invoiceNumber: text("invoice_number"),
  invoiceDate: text("invoice_date"),
  netAmount: real("net_amount"),
  taxAmount: real("tax_amount"),
  grossAmount: real("gross_amount"),
  amount: real("amount"),
  date: text("date"),
  taxRate: real("tax_rate"),
  currency: text("currency").default("EUR"),
  ocrRaw: text("ocr_raw"),
  ocrConfidence: real("ocr_confidence"),
  ocrPositions: text("ocr_positions", { mode: "json" }),
  status: text("status", { enum: ["uploaded", "processing", "processed", "error"] }).default("uploaded"),
  auditHash: text("audit_hash"),
  uploadedAt: text("uploaded_at").default(sql`(datetime('now'))`),
});

export const acctDocumentConversions = sqliteTable("acct_document_conversions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: integer("document_id").notNull().references(() => acctDocuments.id),
  targetType: text("target_type", { enum: ["order", "invoice", "credit_note"] }).notNull(),
  targetId: integer("target_id"),
  targetNumber: text("target_number"),
  createdBy: text("created_by"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== MATCHING ====================

export const acctMatches = sqliteTable("acct_matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id").references(() => acctTransactions.id),
  documentId: integer("document_id").references(() => acctDocuments.id),
  invoiceId: integer("invoice_id").references(() => acctInvoices.id),
  score: real("score").notNull(),
  status: text("status", { enum: ["pending", "confirmed", "rejected"] }).default("pending"),
  reasons: text("reasons", { mode: "json" }),
  confirmedBy: text("confirmed_by"),
  confirmedAt: text("confirmed_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== BANKING ====================

export const acctFinapiConnections = sqliteTable("acct_finapi_connections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  finapiUserId: text("finapi_user_id"),
  finapiBankConnectionId: text("finapi_bank_connection_id"),
  finapiAccountIds: text("finapi_account_ids", { mode: "json" }).$type<string[]>(),
  status: text("status", { enum: ["active", "disconnected", "error"] }).default("active"),
  lastSync: text("last_sync"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const acctSyncLogs = sqliteTable("acct_sync_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  connectionId: integer("connection_id").references(() => acctFinapiConnections.id),
  transactionsCount: integer("transactions_count").default(0),
  status: text("status", { enum: ["success", "error"] }).notNull(),
  errorMessage: text("error_message"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== TAX & COMPLIANCE ====================

export const acctUstVoranmeldungen = sqliteTable("acct_ust_voranmeldungen", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  zeitraum: text("zeitraum").notNull(),
  zeitraumTyp: text("zeitraum_typ", { enum: ["monatlich", "quartalsweise"] }).notNull(),
  jahr: integer("jahr").notNull(),
  monat: integer("monat"),
  quartal: integer("quartal"),
  kennzahlen: text("kennzahlen", { mode: "json" }),
  umsatzsteuerGesamt: real("umsatzsteuer_gesamt"),
  vorsteuerGesamt: real("vorsteuer_gesamt"),
  zahllast: real("zahllast"),
  status: text("status", { enum: ["entwurf", "berechnet", "gemeldet"] }).default("entwurf"),
  elsterXml: text("elster_xml"),
  gemeldetAm: text("gemeldet_am"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const acctAnlagegueter = sqliteTable("acct_anlagegueter", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bezeichnung: text("bezeichnung").notNull(),
  inventarnummer: text("inventarnummer").notNull().unique(),
  anschaffungsdatum: text("anschaffungsdatum").notNull(),
  anschaffungskosten: real("anschaffungskosten").notNull(),
  nutzungsdauerJahre: integer("nutzungsdauer_jahre").notNull(),
  afaMethode: text("afa_methode", { enum: ["linear", "degressiv"] }).default("linear"),
  afaSatz: real("afa_satz"),
  konto: text("konto"),
  afaKonto: text("afa_konto"),
  restwert: real("restwert"),
  kumulierteAfa: real("kumulierte_afa").default(0),
  status: text("status", { enum: ["aktiv", "vollstaendig_abgeschrieben", "ausgeschieden"] }).default("aktiv"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const acctAfaBuchungen = sqliteTable("acct_afa_buchungen", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  anlagegutId: integer("anlagegut_id").notNull().references(() => acctAnlagegueter.id),
  jahr: integer("jahr").notNull(),
  monat: integer("monat"),
  betrag: real("betrag").notNull(),
  restwertNachher: real("restwert_nachher").notNull(),
  buchungstext: text("buchungstext"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const acctJahresabschluesse = sqliteTable("acct_jahresabschluesse", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  geschaeftsjahr: integer("geschaeftsjahr").notNull(),
  typ: text("typ", { enum: ["bilanz", "guv", "komplett"] }).default("komplett"),
  daten: text("daten", { mode: "json" }),
  status: text("status", { enum: ["entwurf", "abgeschlossen", "eingereicht"] }).default("entwurf"),
  ebilanzXml: text("ebilanz_xml"),
  erstelltAm: text("erstellt_am"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== AUDIT & GoBD ====================

export const acctAuditLogs = sqliteTable("acct_audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action", { enum: ["create", "update", "delete", "export", "login"] }).notNull(),
  userId: text("user_id"),
  userName: text("user_name"),
  changes: text("changes", { mode: "json" }),
  ipAddress: text("ip_address"),
  hash: text("hash"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("acct_audit_entity_idx").on(table.entityType, table.entityId),
  index("acct_audit_created_idx").on(table.createdAt),
]);

export const acctVerfahrensDoku = sqliteTable("acct_verfahrens_doku", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  titel: text("titel").notNull(),
  bereich: text("bereich"),
  inhalt: text("inhalt").notNull(),
  version: integer("version").default(1),
  erstelltVon: text("erstellt_von"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const acctAufbewahrungsfristen = sqliteTable("acct_aufbewahrungsfristen", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  fristJahre: integer("frist_jahre").notNull(),
  aufbewahrungBis: text("aufbewahrung_bis").notNull(),
  status: text("status", { enum: ["aktiv", "abgelaufen", "archiviert"] }).default("aktiv"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== AI AGENTS ====================

export const acctAgentConversations = sqliteTable("acct_agent_conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentTyp: text("agent_typ", { enum: ["steuerberater", "steueringenieur"] }).notNull(),
  userId: text("user_id"),
  titel: text("titel"),
  messages: text("messages", { mode: "json" }).$type<Array<{ role: string; content: string; timestamp: string }>>(),
  context: text("context", { mode: "json" }),
  status: text("status", { enum: ["aktiv", "archiviert"] }).default("aktiv"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ==================== EXPORTS ====================

export const acctExports = sqliteTable("acct_exports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  exportType: text("export_type", { enum: ["datev", "agenda", "csv"] }).notNull(),
  fromDate: text("from_date"),
  toDate: text("to_date"),
  transactionsCount: integer("transactions_count").default(0),
  status: text("status", { enum: ["erstellt", "heruntergeladen", "fehler"] }).default("erstellt"),
  filePath: text("file_path"),
  errorLog: text("error_log"),
  bookingEntryIds: text("booking_entry_ids", { mode: "json" }).$type<number[]>(),
  includeDocuments: integer("include_documents", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== SETTINGS ====================

export const acctStatusLabels = sqliteTable("acct_status_labels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  docType: text("doc_type").notNull(),
  statusKey: text("status_key").notNull(),
  label: text("label").notNull(),
}, (table) => [
  uniqueIndex("acct_status_label_unique").on(table.docType, table.statusKey),
]);

export const acctCompanyLayout = sqliteTable("acct_company_layout", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyName: text("company_name"),
  companyAddress: text("company_address"),
  companyPlz: text("company_plz"),
  companyCity: text("company_city"),
  companyPhone: text("company_phone"),
  companyEmail: text("company_email"),
  companyWebsite: text("company_website"),
  taxId: text("tax_id"),
  vatId: text("vat_id"),
  bankName: text("bank_name"),
  bankIban: text("bank_iban"),
  bankBic: text("bank_bic"),
  managingDirector: text("managing_director"),
  registryCourt: text("registry_court"),
  registryNumber: text("registry_number"),
  logoPath: text("logo_path"),
  accentColor: text("accent_color"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const acctDocumentTemplates = sqliteTable("acct_document_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  docType: text("doc_type").notNull(),
  name: text("name").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  introText: text("intro_text"),
  closingText: text("closing_text"),
  showPositions: integer("show_positions", { mode: "boolean" }).default(true),
  showTotal: integer("show_total", { mode: "boolean" }).default(true),
  showTaxDetails: integer("show_tax_details", { mode: "boolean" }).default(true),
  showBankDetails: integer("show_bank_details", { mode: "boolean" }).default(true),
  paymentTermsText: text("payment_terms_text"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const acctTextBausteinKategorien = sqliteTable("acct_text_baustein_kategorien", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color"),
  sortOrder: integer("sort_order").default(0),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const acctTextBausteine = sqliteTable("acct_text_bausteine", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  text: text("text").notNull(),
  kategorieId: integer("kategorie_id").references(() => acctTextBausteinKategorien.id),
  sortOrder: integer("sort_order").default(0),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ==================== WEBHOOKS ====================

export const acctWebhooks = sqliteTable("acct_webhooks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull(),
  events: text("events", { mode: "json" }).$type<string[]>().notNull(),
  secret: text("secret"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const acctWebhookLogs = sqliteTable("acct_webhook_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  webhookId: integer("webhook_id").notNull().references(() => acctWebhooks.id),
  event: text("event").notNull(),
  payload: text("payload", { mode: "json" }),
  statusCode: integer("status_code"),
  attempts: integer("attempts").default(1),
  success: integer("success", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ==================== RELATIONS ====================

export const acctCustomersRelations = relations(acctCustomers, ({ many }) => ({
  contacts: many(acctCustomerContacts),
  addresses: many(acctCustomerAddresses),
  invoices: many(acctInvoices),
  orders: many(acctOrders),
  inquiries: many(acctInquiries),
  angebote: many(acctAngebote),
}));

export const acctCustomerContactsRelations = relations(acctCustomerContacts, ({ one }) => ({
  customer: one(acctCustomers, { fields: [acctCustomerContacts.customerId], references: [acctCustomers.id] }),
}));

export const acctCustomerAddressesRelations = relations(acctCustomerAddresses, ({ one }) => ({
  customer: one(acctCustomers, { fields: [acctCustomerAddresses.customerId], references: [acctCustomers.id] }),
}));

export const acctInquiriesRelations = relations(acctInquiries, ({ one, many }) => ({
  customer: one(acctCustomers, { fields: [acctInquiries.customerId], references: [acctCustomers.id] }),
  attachments: many(acctInquiryAttachments),
  angebote: many(acctAngebote),
  orders: many(acctOrders),
}));

export const acctInquiryAttachmentsRelations = relations(acctInquiryAttachments, ({ one }) => ({
  inquiry: one(acctInquiries, { fields: [acctInquiryAttachments.inquiryId], references: [acctInquiries.id] }),
}));

export const acctAngeboteRelations = relations(acctAngebote, ({ one, many }) => ({
  inquiry: one(acctInquiries, { fields: [acctAngebote.inquiryId], references: [acctInquiries.id] }),
  customer: one(acctCustomers, { fields: [acctAngebote.customerId], references: [acctCustomers.id] }),
  orders: many(acctOrders),
}));

export const acctOrdersRelations = relations(acctOrders, ({ one, many }) => ({
  inquiry: one(acctInquiries, { fields: [acctOrders.inquiryId], references: [acctInquiries.id] }),
  angebot: one(acctAngebote, { fields: [acctOrders.angebotId], references: [acctAngebote.id] }),
  customer: one(acctCustomers, { fields: [acctOrders.customerId], references: [acctCustomers.id] }),
  invoices: many(acctInvoices),
  shipments: many(acctShipments),
  payments: many(acctPayments),
}));

export const acctInvoicesRelations = relations(acctInvoices, ({ one, many }) => ({
  order: one(acctOrders, { fields: [acctInvoices.orderId], references: [acctOrders.id] }),
  customer: one(acctCustomers, { fields: [acctInvoices.customerId], references: [acctCustomers.id] }),
  items: many(acctInvoiceItems),
  creditNotes: many(acctCreditNotes),
  reminders: many(acctReminders),
  payments: many(acctPayments),
  matches: many(acctMatches),
}));

export const acctInvoiceItemsRelations = relations(acctInvoiceItems, ({ one }) => ({
  invoice: one(acctInvoices, { fields: [acctInvoiceItems.invoiceId], references: [acctInvoices.id] }),
}));

export const acctCreditNotesRelations = relations(acctCreditNotes, ({ one }) => ({
  invoice: one(acctInvoices, { fields: [acctCreditNotes.invoiceId], references: [acctInvoices.id] }),
}));

export const acctRemindersRelations = relations(acctReminders, ({ one }) => ({
  invoice: one(acctInvoices, { fields: [acctReminders.invoiceId], references: [acctInvoices.id] }),
}));

export const acctShipmentsRelations = relations(acctShipments, ({ one }) => ({
  order: one(acctOrders, { fields: [acctShipments.orderId], references: [acctOrders.id] }),
}));

export const acctMatchesRelations = relations(acctMatches, ({ one }) => ({
  transaction: one(acctTransactions, { fields: [acctMatches.transactionId], references: [acctTransactions.id] }),
  document: one(acctDocuments, { fields: [acctMatches.documentId], references: [acctDocuments.id] }),
  invoice: one(acctInvoices, { fields: [acctMatches.invoiceId], references: [acctInvoices.id] }),
}));

export const acctDocumentsRelations = relations(acctDocuments, ({ one, many }) => ({
  supplier: one(acctSuppliers, { fields: [acctDocuments.supplierId], references: [acctSuppliers.id] }),
  conversions: many(acctDocumentConversions),
  matches: many(acctMatches),
}));

export const acctDocumentConversionsRelations = relations(acctDocumentConversions, ({ one }) => ({
  document: one(acctDocuments, { fields: [acctDocumentConversions.documentId], references: [acctDocuments.id] }),
}));

export const acctBookingEntriesRelations = relations(acctBookingEntries, ({ one }) => ({
  transaction: one(acctTransactions, { fields: [acctBookingEntries.transactionId], references: [acctTransactions.id] }),
  document: one(acctDocuments, { fields: [acctBookingEntries.documentId], references: [acctDocuments.id] }),
}));

export const acctAnlagegueterRelations = relations(acctAnlagegueter, ({ many }) => ({
  buchungen: many(acctAfaBuchungen),
}));

export const acctAfaBuchungenRelations = relations(acctAfaBuchungen, ({ one }) => ({
  anlagegut: one(acctAnlagegueter, { fields: [acctAfaBuchungen.anlagegutId], references: [acctAnlagegueter.id] }),
}));

export const acctWebhookLogsRelations = relations(acctWebhookLogs, ({ one }) => ({
  webhook: one(acctWebhooks, { fields: [acctWebhookLogs.webhookId], references: [acctWebhooks.id] }),
}));

export const acctFinapiConnectionsRelations = relations(acctFinapiConnections, ({ many }) => ({
  transactions: many(acctTransactions),
  syncLogs: many(acctSyncLogs),
}));

export const acctTransactionsRelations = relations(acctTransactions, ({ one, many }) => ({
  connection: one(acctFinapiConnections, { fields: [acctTransactions.connectionId], references: [acctFinapiConnections.id] }),
  matches: many(acctMatches),
  bookingEntries: many(acctBookingEntries),
}));

// ==================== TYPE EXPORTS ====================

export type AcctCustomer = typeof acctCustomers.$inferSelect;
export type NewAcctCustomer = typeof acctCustomers.$inferInsert;
export type AcctSupplier = typeof acctSuppliers.$inferSelect;
export type NewAcctSupplier = typeof acctSuppliers.$inferInsert;
export type AcctInvoice = typeof acctInvoices.$inferSelect;
export type NewAcctInvoice = typeof acctInvoices.$inferInsert;
export type AcctTransaction = typeof acctTransactions.$inferSelect;
export type NewAcctTransaction = typeof acctTransactions.$inferInsert;
export type AcctBookingEntry = typeof acctBookingEntries.$inferSelect;
export type NewAcctBookingEntry = typeof acctBookingEntries.$inferInsert;
export type AcctDocument = typeof acctDocuments.$inferSelect;
export type NewAcctDocument = typeof acctDocuments.$inferInsert;
export type AcctMatch = typeof acctMatches.$inferSelect;
export type NewAcctMatch = typeof acctMatches.$inferInsert;
export type AcctInquiry = typeof acctInquiries.$inferSelect;
export type NewAcctInquiry = typeof acctInquiries.$inferInsert;
export type AcctAngebot = typeof acctAngebote.$inferSelect;
export type NewAcctAngebot = typeof acctAngebote.$inferInsert;
export type AcctOrder = typeof acctOrders.$inferSelect;
export type NewAcctOrder = typeof acctOrders.$inferInsert;
export type AcctCreditNote = typeof acctCreditNotes.$inferSelect;
export type NewAcctCreditNote = typeof acctCreditNotes.$inferInsert;
export type AcctReminder = typeof acctReminders.$inferSelect;
export type NewAcctReminder = typeof acctReminders.$inferInsert;
export type AcctPayment = typeof acctPayments.$inferSelect;
export type NewAcctPayment = typeof acctPayments.$inferInsert;
export type AcctShipment = typeof acctShipments.$inferSelect;
export type NewAcctShipment = typeof acctShipments.$inferInsert;
export type AcctAnlagegut = typeof acctAnlagegueter.$inferSelect;
export type NewAcctAnlagegut = typeof acctAnlagegueter.$inferInsert;
export type AcctAgentConversation = typeof acctAgentConversations.$inferSelect;
export type NewAcctAgentConversation = typeof acctAgentConversations.$inferInsert;
export type AcctKonto = typeof acctKonten.$inferSelect;
export type NewAcctKonto = typeof acctKonten.$inferInsert;

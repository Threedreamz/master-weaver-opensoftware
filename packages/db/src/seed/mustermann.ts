/**
 * Canonical Max Mustermann — the single source of truth for test persona data
 * across ALL OpenSoftware apps. Every app-specific seed imports from here.
 *
 * NEVER duplicate this data in individual app seeds — always reference this file.
 */

// Stable deterministic IDs for cross-app consistency
export const MUSTERMANN_USER_ID = "usr_max_mustermann_001";
export const MUSTERMANN_EMPLOYEE_ID = 1;
export const MUSTERMANN_CUSTOMER_ID = 1;

export const maxMustermann = {
  // Identity
  id: MUSTERMANN_USER_ID,
  name: "Max Mustermann",
  email: "max@mustermann.de",
  role: "admin" as const,
  locale: "de" as const,
  image: null,
  username: "max.mustermann",
  displayName: "Max Mustermann",

  // Personal (German)
  firstName: "Max",
  lastName: "Mustermann",
  birthDate: "1990-05-15",
  address: {
    street: "Musterstraße 1",
    zip: "40210",
    city: "Düsseldorf",
    state: "NW",
    country: "DE",
  },
  phone: "+49 211 12345678",

  // Employment (cross-app)
  personalNr: "PN-001",
  position: "Teamleiter",
  department: "CT-Scanner",
  entryDate: "2024-01-01",
  hoursPerWeek: 40,
  hoursPerDay: 8,
  salaryMonthly: 4333,
  hourlyRate: 25,
  status: "aktiv" as const,

  // German Tax/Insurance
  taxClass: 1,
  taxId: "12345678901",
  socialInsuranceNr: "12 150590 M 001",
  healthInsurance: "TK",
  healthInsuranceRate: 14.6,
  churchTax: false,
  childAllowances: 0,
  iban: "DE89370400440532013000",
  bic: "COBADEFFXXX",

  // Company context
  company: {
    name: "Mustermann GmbH",
    ustId: "DE123456789",
    hrb: "HRB 12345",
    court: "Amtsgericht Düsseldorf",
    legalForm: "GmbH",
    website: "https://mustermann.de",
    industry: "Software",
    email: "info@mustermann.de",
    phone: "+49 211 98765432",
  },
} as const;

// ─── Per-App Seed Helpers ───────────────────────────────────────────────────

/** users table (shared.schema.ts) */
export const mustermannUser = {
  id: maxMustermann.id,
  email: maxMustermann.email,
  name: maxMustermann.name,
  username: maxMustermann.username,
  displayName: maxMustermann.displayName,
  role: maxMustermann.role,
  locale: maxMustermann.locale,
  image: null,
  emailVerified: null,
};

/** payMitarbeiter table (openpayroll.schema.ts) */
export const mustermannEmployee = {
  personalnummer: maxMustermann.personalNr,
  vorname: maxMustermann.firstName,
  nachname: maxMustermann.lastName,
  geburtsdatum: maxMustermann.birthDate,
  eintrittsdatum: maxMustermann.entryDate,
  austrittsdatum: null,
  steuerklasse: maxMustermann.taxClass,
  steuerId: maxMustermann.taxId,
  sozialversicherungsnummer: maxMustermann.socialInsuranceNr,
  krankenkasse: maxMustermann.healthInsurance,
  krankenkasseBeitragssatz: maxMustermann.healthInsuranceRate,
  kirchensteuer: maxMustermann.churchTax ? 1 : 0,
  bundesland: maxMustermann.address.state,
  kinderfreibetraege: maxMustermann.childAllowances,
  iban: maxMustermann.iban,
  bic: maxMustermann.bic,
  adresse: `${maxMustermann.address.street}, ${maxMustermann.address.zip} ${maxMustermann.address.city}`,
  bruttoGehalt: maxMustermann.salaryMonthly,
  stundenlohn: maxMustermann.hourlyRate,
  arbeitsstundenProWoche: maxMustermann.hoursPerWeek,
  status: "aktiv" as const,
};

/** bonusEmployees table (openbounty.schema.ts) */
export const mustermannBountyEmployee = {
  email: maxMustermann.email,
  firstname: maxMustermann.firstName,
  lastname: maxMustermann.lastName,
  company: maxMustermann.company.name,
  status: "active" as const,
};

/** acctCustomers table (openaccounting.schema.ts) */
export const mustermannCustomer = {
  customerNumber: "K-001",
  name: maxMustermann.name,
  company: maxMustermann.company.name,
  email: maxMustermann.email,
  phone: maxMustermann.phone,
  vatId: maxMustermann.company.ustId,
  vatValid: 1,
  type: "B2B" as const,
  legalForm: maxMustermann.company.legalForm,
  website: maxMustermann.company.website,
  registerNumber: maxMustermann.company.hrb,
  registerCourt: maxMustermann.company.court,
  industry: maxMustermann.company.industry,
  street: maxMustermann.address.street,
  zip: maxMustermann.address.zip,
  city: maxMustermann.address.city,
  country: maxMustermann.address.country,
  status: "active" as const,
};

/** legalProjects table (openlawyer.schema.ts) */
export const mustermannLegalProject = {
  name: "Mustermann GmbH — Gründung & Compliance",
  slug: "mustermann-gmbh-gruendung",
  website: maxMustermann.company.website,
  description: "Rechtliche Begleitung der Mustermann GmbH Gründung inkl. Impressum, Datenschutz und AGB",
  jurisdiction: "DE",
  countries: JSON.stringify(["DE"]),
  companyName: maxMustermann.company.name,
  companyAddress: `${maxMustermann.address.street}, ${maxMustermann.address.zip} ${maxMustermann.address.city}`,
  companyEmail: maxMustermann.company.email,
  companyPhone: maxMustermann.company.phone,
  companyRegister: maxMustermann.company.hrb,
  companyVatId: maxMustermann.company.ustId,
  managingDirector: maxMustermann.name,
  status: "active" as const,
};

/** emailAccounts table (openmailer.schema.ts) */
export const mustermannMailAccount = {
  name: "Max Mustermann",
  email: maxMustermann.email,
  imapHost: "imap.mustermann.de",
  imapPort: 993,
  imapUser: maxMustermann.email,
  imapPass: "demo-password-not-real",
  smtpHost: "smtp.mustermann.de",
  smtpPort: 587,
  smtpUser: maxMustermann.email,
  smtpPass: "demo-password-not-real",
  isDefault: 1,
  syncEnabled: 0, // disabled for demo — no real server
};

/** deskWorkstations table (opendesktop.schema.ts) */
export const mustermannWorkstation = {
  code: "WS-001",
  name: "Arbeitsplatz Max Mustermann",
  type: "office" as const,
  status: "active" as const,
  assignedUserId: maxMustermann.id,
  description: "Hauptarbeitsplatz des Teamleiters",
};

/** seoAudits base data (opensem.schema.ts) */
export const mustermannSeoAudit = {
  url: "https://mustermann.de",
  locale: "de",
  overallScore: 72,
};

/** pipPipelines base data (openpipeline.schema.ts) */
export const mustermannPipeline = {
  name: "Mustermann GmbH — Onboarding",
  beschreibung: "Onboarding-Prozess für neue Mitarbeiter bei Mustermann GmbH",
  typ: "prozess" as const,
  status: "aktiv" as const,
  erstelltVon: maxMustermann.id,
};

/** flows base data (openflow schema) */
export const mustermannFlow = {
  name: "Kontaktformular Mustermann GmbH",
  slug: "kontakt-mustermann",
  description: "Kontaktformular für Anfragen an die Mustermann GmbH",
  status: "published" as const,
  createdBy: maxMustermann.id,
};

/**
 * Mustermann GmbH — Reference company entry demonstrating all fields.
 * Used as a template to verify the complete company profile works end-to-end.
 */

export const MUSTERMANN_GMBH = {
  // Identifikation
  vatId: "DE123456789",
  registerNumber: "HRB 999999",
  registerCourt: "Amtsgericht Berlin-Charlottenburg",
  registerType: "HRB",

  // Stammdaten
  companyName: "Mustermann GmbH",
  legalForm: "GmbH",
  foundingDate: "2020-01-15",
  companyStatus: "active",
  purpose: "Entwicklung und Vertrieb von Softwarelösungen für den Mittelstand",
  shareCapital: 2500000, // 25.000 EUR in cents

  // Adresse
  street: "Musterstraße 1",
  postalCode: "10115",
  city: "Berlin",
  countryCode: "DE",
  latitude: 52.5326,
  longitude: 13.3884,

  // Kontakt
  website: "https://mustermann-gmbh.example.de",
  domain: "mustermann-gmbh.example.de",
  email: "info@mustermann-gmbh.example.de",
  phone: "+49 30 12345678",

  // Klassifikation
  naceCode: "62.01",
  naceName: "Programmierung",
  industry: "Software & IT-Dienstleistungen",
  employeesMin: 10,
  employeesMax: 49,
  revenueMin: 2000000,
  revenueMax: 10000000,

  // Personen
  managingDirectors: [
    { name: "Max Mustermann", role: "Geschäftsführer", since: "2020-01-15" },
    { name: "Erika Mustermann", role: "Prokuristin", since: "2021-06-01" },
  ],
  shareholders: [
    { name: "Max Mustermann", share: "60%" },
    { name: "Erika Mustermann", share: "40%" },
  ],

  // Finanzen & Risiko
  creditScore: 200,
  creditRating: "gut",
  riskClass: 2,
  insolvencyRisk: 0,
  paymentBehavior: 1,

  // Enrichment & Scoring
  enrichmentStatus: "complete" as const,
  leadScore: 85,
  leadStatus: "qualified" as const,
  source: "manual",
  confidenceScore: 0.95,

  // Meta
  tags: ["referenz", "software", "berlin", "mittelstand"],
  notes: "Referenzeintrag — Mustermann GmbH als Vorlage für alle Firmenprofile",
};

"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, DataTable, StatusBadge, type Column } from "@opensoftware/ui";
import {
  Settings,
  Building2,
  Hash,
  FileText,
  Webhook,
  Loader2,
  Save,
  Plus,
  Trash2,
  X,
  Plug,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Power,
  RefreshCw,
} from "lucide-react";
import {
  getCompanyLayout,
  updateCompanyLayout,
  getNumberFormats,
  updateNumberFormat,
  getWebhooks,
  createWebhook,
  deleteWebhook,
  getDocumentTemplates,
} from "./actions";

type Tab = "company" | "numbers" | "templates" | "webhooks" | "integrations";

interface CompanyData {
  companyName: string;
  companyAddress: string;
  companyPlz: string;
  companyCity: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  taxId: string;
  vatId: string;
  bankName: string;
  bankIban: string;
  bankBic: string;
  managingDirector: string;
  registryCourt: string;
  registryNumber: string;
  accentColor: string;
}

interface NumberFormat {
  prefix: string;
  label: string;
  formatTemplate: string;
  padding: number | null;
  perYear: boolean | null;
}

interface WebhookRecord {
  id: number;
  url: string;
  events: string[];
  secret: string | null;
  isActive: boolean | null;
  createdAt: string | null;
}

interface DocTemplate {
  id: number;
  docType: string;
  name: string;
  isDefault: boolean | null;
  introText: string | null;
  closingText: string | null;
}

const TAB_CONFIG: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "company", label: "Company", icon: <Building2 className="w-4 h-4" /> },
  { key: "numbers", label: "Number Formats", icon: <Hash className="w-4 h-4" /> },
  { key: "templates", label: "Document Templates", icon: <FileText className="w-4 h-4" /> },
  { key: "webhooks", label: "Webhooks", icon: <Webhook className="w-4 h-4" /> },
  { key: "integrations", label: "Integrations", icon: <Plug className="w-4 h-4" /> },
];

// ==================== Integration Definitions ====================

interface IntegrationDef {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  authType: "api_key" | "oauth2" | "basic_auth" | "custom" | "none";
  docsUrl: string;
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[];
}

const ACCOUNTING_INTEGRATIONS: IntegrationDef[] = [
  // Payment
  { id: "stripe", name: "Stripe", description: "Zahlungsabwicklung, Rechnungen bezahlen", category: "Zahlungen", icon: "💳", authType: "api_key", docsUrl: "https://stripe.com/docs/api", fields: [{ key: "apiKey", label: "Secret Key", placeholder: "sk_live_...", secret: true }, { key: "webhookSecret", label: "Webhook Secret", placeholder: "whsec_...", secret: true }] },
  { id: "paypal", name: "PayPal Business", description: "Zahlungseingang, Transaktionsabgleich", category: "Zahlungen", icon: "🅿️", authType: "oauth2", docsUrl: "https://developer.paypal.com/docs/api/overview/", fields: [{ key: "clientId", label: "Client ID", placeholder: "AV..." }, { key: "clientSecret", label: "Client Secret", placeholder: "EL...", secret: true }] },
  { id: "klarna", name: "Klarna", description: "Buy now, pay later", category: "Zahlungen", icon: "🟠", authType: "basic_auth", docsUrl: "https://docs.klarna.com/", fields: [{ key: "username", label: "Username", placeholder: "K..." }, { key: "password", label: "Password", placeholder: "...", secret: true }] },
  { id: "mollie", name: "Mollie", description: "Multi-Payment-Gateway (EU)", category: "Zahlungen", icon: "🔵", authType: "api_key", docsUrl: "https://docs.mollie.com/", fields: [{ key: "apiKey", label: "API Key", placeholder: "live_...", secret: true }] },
  // Banking
  { id: "plaid", name: "Plaid / FinTS", description: "Bankkonto-Anbindung, Transaktionsimport", category: "Banking", icon: "🏦", authType: "api_key", docsUrl: "https://plaid.com/docs/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "secret", label: "Secret", placeholder: "...", secret: true }] },
  { id: "gocardless", name: "GoCardless", description: "SEPA-Lastschriften, Open Banking", category: "Banking", icon: "🔄", authType: "api_key", docsUrl: "https://developer.gocardless.com/", fields: [{ key: "accessToken", label: "Access Token", placeholder: "sandbox_...", secret: true }] },
  { id: "wise", name: "Wise", description: "Internationale Überweisungen", category: "Banking", icon: "🌍", authType: "api_key", docsUrl: "https://docs.wise.com/api-docs/", fields: [{ key: "apiToken", label: "API Token", placeholder: "...", secret: true }] },
  { id: "vivid", name: "Vivid Money", description: "Geschäftskonto-Anbindung", category: "Banking", icon: "💜", authType: "oauth2", docsUrl: "https://vivid.money/business", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  { id: "sparkasse_fints", name: "Sparkasse (FinTS)", description: "Banking via FinTS/HBCI", category: "Banking", icon: "🔴", authType: "custom", docsUrl: "https://www.hbci-zka.de/", fields: [{ key: "bankUrl", label: "Bank URL", placeholder: "https://..." }, { key: "bankCode", label: "BLZ", placeholder: "12050000" }, { key: "username", label: "Username", placeholder: "..." }, { key: "pin", label: "PIN", placeholder: "...", secret: true }] },
  // Tax & Compliance
  { id: "datev", name: "DATEV Connect", description: "Buchhaltungsexport/-import", category: "Steuern & Compliance", icon: "📊", authType: "oauth2", docsUrl: "https://developer.datev.de/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  { id: "elster", name: "ELSTER (ERiC)", description: "USt-VA, Steuererklärungen", category: "Steuern & Compliance", icon: "🏛️", authType: "custom", docsUrl: "https://www.elster.de/elsterweb/entwickler", fields: [{ key: "certificatePath", label: "Zertifikat-Pfad", placeholder: "/path/to/cert.pfx" }, { key: "certificatePin", label: "PIN", placeholder: "...", secret: true }] },
  { id: "vies_vat", name: "VIES VAT", description: "EU-USt-ID-Validierung", category: "Steuern & Compliance", icon: "🇪🇺", authType: "none", docsUrl: "https://ec.europa.eu/taxation_customs/vies/", fields: [] },
  { id: "zugferd", name: "ZUGFeRD / XRechnung", description: "E-Invoicing (DE/EU-Standard)", category: "Steuern & Compliance", icon: "📄", authType: "none", docsUrl: "https://www.ferd-net.de/", fields: [] },
  // ERP
  { id: "lexoffice", name: "Lexoffice", description: "Import/Export zu Lexware", category: "ERP & Tools", icon: "📗", authType: "api_key", docsUrl: "https://developers.lexoffice.io/docs/", fields: [{ key: "apiKey", label: "API Key", placeholder: "...", secret: true }] },
  { id: "sevdesk", name: "sevDesk", description: "Import/Export zu sevDesk", category: "ERP & Tools", icon: "📘", authType: "api_key", docsUrl: "https://api.sevdesk.de/", fields: [{ key: "apiToken", label: "API Token", placeholder: "...", secret: true }] },
  { id: "sap_business_one", name: "SAP Business One", description: "Enterprise-ERP-Sync", category: "ERP & Tools", icon: "🔷", authType: "basic_auth", docsUrl: "https://help.sap.com/docs/SAP_BUSINESS_ONE", fields: [{ key: "url", label: "Server URL", placeholder: "https://..." }, { key: "company", label: "Company DB", placeholder: "SBODEMOUS" }, { key: "username", label: "Username", placeholder: "manager" }, { key: "password", label: "Password", placeholder: "...", secret: true }] },
  { id: "dynamics365", name: "Dynamics 365", description: "Enterprise-ERP-Sync", category: "ERP & Tools", icon: "🟣", authType: "oauth2", docsUrl: "https://learn.microsoft.com/en-us/dynamics365/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }, { key: "tenantId", label: "Tenant ID", placeholder: "..." }] },
  // OCR & AI
  { id: "aws_textract", name: "AWS Textract", description: "OCR für Belege/Rechnungen", category: "OCR & KI", icon: "📸", authType: "api_key", docsUrl: "https://docs.aws.amazon.com/textract/", fields: [{ key: "accessKeyId", label: "Access Key ID", placeholder: "AKIA..." }, { key: "secretAccessKey", label: "Secret Access Key", placeholder: "...", secret: true }, { key: "region", label: "Region", placeholder: "eu-central-1" }] },
  { id: "openai", name: "OpenAI", description: "KI-Buchungsassistent", category: "OCR & KI", icon: "🤖", authType: "api_key", docsUrl: "https://platform.openai.com/docs/", fields: [{ key: "apiKey", label: "API Key", placeholder: "sk-...", secret: true }] },
  { id: "anthropic", name: "Anthropic Claude", description: "KI-Buchungsassistent", category: "OCR & KI", icon: "🧠", authType: "api_key", docsUrl: "https://docs.anthropic.com/", fields: [{ key: "apiKey", label: "API Key", placeholder: "sk-ant-...", secret: true }] },
  // ==================== 50 neue APIs ====================
  // Payment (additional)
  { id: "adyen", name: "Adyen", description: "Enterprise-Zahlungsplattform", category: "Zahlungen", icon: "💚", authType: "api_key", docsUrl: "https://docs.adyen.com/", fields: [{ key: "apiKey", label: "API Key", placeholder: "AQE...", secret: true }, { key: "merchantAccount", label: "Merchant Account", placeholder: "YourMerchant" }] },
  { id: "unzer", name: "Unzer (Heidelpay)", description: "Zahlungen DACH-Markt", category: "Zahlungen", icon: "🟢", authType: "api_key", docsUrl: "https://docs.unzer.com/", fields: [{ key: "privateKey", label: "Private Key", placeholder: "s-priv-...", secret: true }] },
  { id: "payone", name: "PAYONE", description: "Payment Service Provider (DE)", category: "Zahlungen", icon: "🔶", authType: "api_key", docsUrl: "https://docs.payone.com/", fields: [{ key: "merchantId", label: "Merchant ID", placeholder: "..." }, { key: "portalId", label: "Portal ID", placeholder: "..." }, { key: "key", label: "Key", placeholder: "...", secret: true }] },
  { id: "giropay", name: "giropay / paydirekt", description: "Deutsche Online-Überweisung", category: "Zahlungen", icon: "🏧", authType: "api_key", docsUrl: "https://www.giropay.de/", fields: [{ key: "merchantId", label: "Merchant ID", placeholder: "..." }, { key: "projectId", label: "Project ID", placeholder: "..." }, { key: "secret", label: "Secret", placeholder: "...", secret: true }] },
  { id: "ratepay", name: "Ratepay", description: "Ratenzahlung, Rechnungskauf", category: "Zahlungen", icon: "📅", authType: "basic_auth", docsUrl: "https://docs.ratepay.com/", fields: [{ key: "profileId", label: "Profile ID", placeholder: "..." }, { key: "securityCode", label: "Security Code", placeholder: "...", secret: true }] },
  // Banking (additional)
  { id: "ing_api", name: "ING Open Banking", description: "ING PSD2 Banking", category: "Banking", icon: "🦁", authType: "oauth2", docsUrl: "https://developer.ing.com/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  { id: "postbank_api", name: "Postbank", description: "Postbank PSD2 Banking", category: "Banking", icon: "📮", authType: "oauth2", docsUrl: "https://developer.postbank.de/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  { id: "revolut_business", name: "Revolut Business", description: "Geschäftskonto, FX", category: "Banking", icon: "🔵", authType: "oauth2", docsUrl: "https://developer.revolut.com/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "privateKey", label: "Private Key", placeholder: "...", secret: true }] },
  { id: "qonto", name: "Qonto", description: "Geschäftskonto für KMU (EU)", category: "Banking", icon: "🟡", authType: "api_key", docsUrl: "https://api-doc.qonto.com/", fields: [{ key: "organizationSlug", label: "Organization Slug", placeholder: "..." }, { key: "secretKey", label: "Secret Key", placeholder: "...", secret: true }] },
  { id: "figo", name: "finAPI / figo", description: "Multi-Bank-Aggregation (PSD2)", category: "Banking", icon: "🔗", authType: "oauth2", docsUrl: "https://documentation.finapi.io/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  { id: "kontist", name: "Kontist", description: "Banking für Freelancer", category: "Banking", icon: "✨", authType: "oauth2", docsUrl: "https://kontist.com/developer/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  { id: "ecb_rates", name: "EZB Wechselkurse", description: "Offizielle EZB-Referenzkurse", category: "Banking", icon: "💶", authType: "none", docsUrl: "https://data.ecb.europa.eu/", fields: [] },
  { id: "open_exchange_rates", name: "Open Exchange Rates", description: "Echtzeit-Wechselkurse (170+ Währungen)", category: "Banking", icon: "💱", authType: "api_key", docsUrl: "https://docs.openexchangerates.org/", fields: [{ key: "appId", label: "App ID", placeholder: "...", secret: true }] },
  { id: "currencycloud", name: "Currencycloud", description: "B2B FX-Zahlungen, Hedging", category: "Banking", icon: "🌐", authType: "api_key", docsUrl: "https://developer.currencycloud.com/", fields: [{ key: "loginId", label: "Login ID", placeholder: "..." }, { key: "apiKey", label: "API Key", placeholder: "...", secret: true }] },
  // Tax (additional)
  { id: "taxfix_api", name: "Taxfix", description: "Steuererklärungs-Datenimport", category: "Steuern & Compliance", icon: "📋", authType: "api_key", docsUrl: "https://taxfix.de/partner", fields: [{ key: "apiKey", label: "API Key", placeholder: "...", secret: true }] },
  { id: "buhl_data", name: "Buhl / WISO", description: "WISO Steuersoftware", category: "Steuern & Compliance", icon: "📑", authType: "api_key", docsUrl: "https://www.buhl.de/", fields: [{ key: "apiKey", label: "API Key", placeholder: "...", secret: true }] },
  { id: "vatify", name: "Vatify.eu", description: "Erweiterte EU-USt-Validierung", category: "Steuern & Compliance", icon: "✅", authType: "api_key", docsUrl: "https://vatify.eu/docs", fields: [{ key: "apiKey", label: "API Key", placeholder: "...", secret: true }] },
  { id: "creditreform", name: "Creditreform", description: "Bonitätsprüfung (DE)", category: "Steuern & Compliance", icon: "📊", authType: "api_key", docsUrl: "https://www.creditreform.de/", fields: [{ key: "apiKey", label: "API Key", placeholder: "...", secret: true }, { key: "customerId", label: "Customer ID", placeholder: "..." }] },
  { id: "schufa", name: "SCHUFA B2B", description: "Bonitätsauskünfte", category: "Steuern & Compliance", icon: "🛡️", authType: "custom", docsUrl: "https://www.schufa.de/lp/b2b/", fields: [{ key: "partnerId", label: "Partner ID", placeholder: "..." }, { key: "certificate", label: "Zertifikat-Pfad", placeholder: "/path/to/cert" }] },
  { id: "crif_buergel", name: "CRIF Bürgel", description: "Wirtschaftsauskunft", category: "Steuern & Compliance", icon: "🔍", authType: "api_key", docsUrl: "https://www.crifbuergel.de/", fields: [{ key: "apiKey", label: "API Key", placeholder: "...", secret: true }] },
  { id: "bundesanzeiger", name: "Bundesanzeiger", description: "Jahresabschluss-Veröffentlichung", category: "Steuern & Compliance", icon: "🏛️", authType: "custom", docsUrl: "https://www.bundesanzeiger.de/", fields: [{ key: "username", label: "Username", placeholder: "..." }, { key: "password", label: "Passwort", placeholder: "...", secret: true }] },
  { id: "unternehmensregister", name: "Unternehmensregister", description: "Firmeninfo, Bilanzdaten", category: "Steuern & Compliance", icon: "📂", authType: "none", docsUrl: "https://www.unternehmensregister.de/", fields: [] },
  // E-Invoicing (additional)
  { id: "facturx", name: "Factur-X (FR)", description: "Französischer E-Invoicing-Standard", category: "E-Invoicing", icon: "🇫🇷", authType: "none", docsUrl: "https://www.factur-x.org/en/", fields: [] },
  { id: "chorus_pro", name: "Chorus Pro (FR)", description: "Französisches E-Invoicing-Portal", category: "E-Invoicing", icon: "🏳️", authType: "oauth2", docsUrl: "https://communaute.chorus-pro.gouv.fr/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  { id: "sdi_italy", name: "SDI / FatturaPA (IT)", description: "Italienisches E-Invoicing", category: "E-Invoicing", icon: "🇮🇹", authType: "custom", docsUrl: "https://www.fatturapa.gov.it/", fields: [{ key: "codiceDestinatario", label: "Codice Destinatario", placeholder: "XXXXXXX" }, { key: "certificate", label: "Zertifikat-Pfad", placeholder: "/path/to/cert" }] },
  // ERP (additional)
  { id: "bexio", name: "bexio", description: "Schweizer Buchhaltung", category: "ERP & Tools", icon: "🇨🇭", authType: "oauth2", docsUrl: "https://docs.bexio.com/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  { id: "xero", name: "Xero", description: "Cloud-Buchhaltung (int.)", category: "ERP & Tools", icon: "💙", authType: "oauth2", docsUrl: "https://developer.xero.com/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  { id: "quickbooks", name: "QuickBooks Online", description: "Intuit Cloud-Buchhaltung", category: "ERP & Tools", icon: "💚", authType: "oauth2", docsUrl: "https://developer.intuit.com/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  { id: "freshbooks", name: "FreshBooks", description: "Rechnungs-/Buchhaltungstool", category: "ERP & Tools", icon: "🍃", authType: "oauth2", docsUrl: "https://www.freshbooks.com/api/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  { id: "sage", name: "Sage Business Cloud", description: "Sage Buchhaltung (DE/EU)", category: "ERP & Tools", icon: "🌿", authType: "oauth2", docsUrl: "https://developer.sage.com/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  { id: "zoho_books", name: "Zoho Books", description: "Cloud-Buchhaltung + Steuern", category: "ERP & Tools", icon: "📒", authType: "oauth2", docsUrl: "https://www.zoho.com/books/api/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  { id: "odoo", name: "Odoo ERP", description: "Open-Source ERP", category: "ERP & Tools", icon: "🟣", authType: "api_key", docsUrl: "https://www.odoo.com/documentation/", fields: [{ key: "url", label: "Odoo URL", placeholder: "https://..." }, { key: "db", label: "Database", placeholder: "..." }, { key: "username", label: "Username", placeholder: "..." }, { key: "apiKey", label: "API Key", placeholder: "...", secret: true }] },
  { id: "scopevisio", name: "Scopevisio", description: "Cloud-ERP + FiBu (DE)", category: "ERP & Tools", icon: "🔭", authType: "oauth2", docsUrl: "https://www.scopevisio.com/api/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  { id: "papierkram", name: "Papierkram", description: "Buchhaltung für Selbstständige", category: "ERP & Tools", icon: "📝", authType: "api_key", docsUrl: "https://die-papierkram-api.de/", fields: [{ key: "apiKey", label: "API Key", placeholder: "...", secret: true }, { key: "subdomain", label: "Subdomain", placeholder: "meinefirma" }] },
  { id: "debitoor_sumup", name: "Debitoor", description: "Rechnungen für Freelancer", category: "ERP & Tools", icon: "📃", authType: "oauth2", docsUrl: "https://debitoor.com/api", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  { id: "collmex", name: "Collmex", description: "Kaufmännische Software (DE)", category: "ERP & Tools", icon: "🧮", authType: "api_key", docsUrl: "https://www.collmex.de/", fields: [{ key: "customerId", label: "Kunden-Nr", placeholder: "..." }, { key: "username", label: "Username", placeholder: "..." }, { key: "password", label: "Passwort", placeholder: "...", secret: true }] },
  { id: "orgamax", name: "orgaMAX", description: "Büroverwaltung + Buchhaltung", category: "ERP & Tools", icon: "🗂️", authType: "api_key", docsUrl: "https://www.orgamax.de/", fields: [{ key: "apiKey", label: "API Key", placeholder: "...", secret: true }] },
  { id: "amazon_business", name: "Amazon Business", description: "Geschäftseinkäufe, Rechnungsimport", category: "ERP & Tools", icon: "📦", authType: "oauth2", docsUrl: "https://developer.amazon.com/business", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  // OCR (additional)
  { id: "klippa", name: "Klippa OCR", description: "Beleg-OCR (EU, DSGVO-konform)", category: "OCR & KI", icon: "📷", authType: "api_key", docsUrl: "https://custom-ocr.klippa.com/docs", fields: [{ key: "apiKey", label: "API Key", placeholder: "...", secret: true }] },
  { id: "mindee", name: "Mindee", description: "KI-Dokumentenextraktion", category: "OCR & KI", icon: "🔬", authType: "api_key", docsUrl: "https://developers.mindee.com/", fields: [{ key: "apiKey", label: "API Key", placeholder: "...", secret: true }] },
  { id: "rossum", name: "Rossum", description: "KI-Rechnungsverarbeitung", category: "OCR & KI", icon: "🤖", authType: "api_key", docsUrl: "https://elis.rossum.ai/api/docs/", fields: [{ key: "apiKey", label: "API Key", placeholder: "...", secret: true }] },
  { id: "veryfi", name: "Veryfi", description: "Echtzeit-OCR Belege/Rechnungen", category: "OCR & KI", icon: "⚡", authType: "api_key", docsUrl: "https://docs.veryfi.com/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }, { key: "username", label: "Username", placeholder: "..." }, { key: "apiKey", label: "API Key", placeholder: "...", secret: true }] },
  { id: "google_cloud_vision", name: "Google Cloud Vision", description: "OCR + Belegklassifikation", category: "OCR & KI", icon: "👁️", authType: "oauth2", docsUrl: "https://cloud.google.com/vision/docs", fields: [{ key: "projectId", label: "Project ID", placeholder: "..." }, { key: "credentials", label: "Credentials JSON", placeholder: "...", secret: true }] },
  // Expense Management
  { id: "spendesk", name: "Spendesk", description: "Ausgabenmanagement + Firmenkarten", category: "Ausgaben", icon: "💳", authType: "oauth2", docsUrl: "https://developers.spendesk.com/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  { id: "pleo", name: "Pleo", description: "Firmenkarten + Ausgabenabrechnung", category: "Ausgaben", icon: "🪙", authType: "oauth2", docsUrl: "https://developers.pleo.io/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  { id: "moss", name: "Moss", description: "Firmenkreditkarten + Rechnungen", category: "Ausgaben", icon: "🌱", authType: "api_key", docsUrl: "https://developers.getmoss.com/", fields: [{ key: "apiKey", label: "API Key", placeholder: "...", secret: true }] },
  { id: "expensify", name: "Expensify", description: "Reisekostenabrechnung", category: "Ausgaben", icon: "🧾", authType: "api_key", docsUrl: "https://integrations.expensify.com/", fields: [{ key: "partnerUserId", label: "Partner User ID", placeholder: "..." }, { key: "partnerUserSecret", label: "Partner Secret", placeholder: "...", secret: true }] },
  // Time Tracking
  { id: "clockodo", name: "Clockodo", description: "Zeiterfassung → Rechnungen (DE)", category: "Zeiterfassung", icon: "⏱️", authType: "api_key", docsUrl: "https://www.clockodo.com/de/api/", fields: [{ key: "email", label: "E-Mail", placeholder: "..." }, { key: "apiKey", label: "API Key", placeholder: "...", secret: true }] },
  { id: "toggl_track", name: "Toggl Track", description: "Zeiterfassung für Rechnungslegung", category: "Zeiterfassung", icon: "⏰", authType: "api_key", docsUrl: "https://engineering.toggl.com/docs/", fields: [{ key: "apiToken", label: "API Token", placeholder: "...", secret: true }] },
  { id: "harvest", name: "Harvest", description: "Zeiterfassung + Rechnungsstellung", category: "Zeiterfassung", icon: "🌾", authType: "oauth2", docsUrl: "https://help.getharvest.com/api-v2/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }] },
  // Credit & Finance
  { id: "creditshelf", name: "creditshelf", description: "Unternehmensfinanzierung", category: "Finanzierung", icon: "🏦", authType: "api_key", docsUrl: "https://www.creditshelf.com/", fields: [{ key: "apiKey", label: "API Key", placeholder: "...", secret: true }] },
  { id: "bilendo", name: "Bilendo", description: "Forderungsmanagement, Mahnwesen", category: "Finanzierung", icon: "📨", authType: "api_key", docsUrl: "https://www.bilendo.de/api", fields: [{ key: "apiKey", label: "API Key", placeholder: "...", secret: true }] },
  { id: "auxmoney", name: "auxmoney Business", description: "Unternehmenskredite", category: "Finanzierung", icon: "💰", authType: "api_key", docsUrl: "https://www.auxmoney.com/", fields: [{ key: "apiKey", label: "API Key", placeholder: "...", secret: true }, { key: "partnerId", label: "Partner ID", placeholder: "..." }] },
  // BI & Reporting
  { id: "google_bigquery", name: "Google BigQuery", description: "Finanzdaten-Analyse", category: "BI & Reporting", icon: "📊", authType: "oauth2", docsUrl: "https://cloud.google.com/bigquery/docs", fields: [{ key: "projectId", label: "Project ID", placeholder: "..." }, { key: "credentials", label: "Credentials JSON", placeholder: "...", secret: true }] },
  { id: "tableau", name: "Tableau", description: "BI-Dashboard für Finanzdaten", category: "BI & Reporting", icon: "📈", authType: "api_key", docsUrl: "https://help.tableau.com/current/api/", fields: [{ key: "tokenName", label: "Token Name", placeholder: "..." }, { key: "tokenValue", label: "Token Value", placeholder: "...", secret: true }, { key: "siteId", label: "Site ID", placeholder: "..." }] },
  { id: "power_bi", name: "Microsoft Power BI", description: "BI-Dashboard + Finanzberichte", category: "BI & Reporting", icon: "📉", authType: "oauth2", docsUrl: "https://learn.microsoft.com/en-us/rest/api/power-bi/", fields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true }, { key: "tenantId", label: "Tenant ID", placeholder: "..." }] },
];

const INTEGRATION_CATEGORIES = [...new Set(ACCOUNTING_INTEGRATIONS.map((i) => i.category))];

interface IntegrationConnection {
  id: string;
  serviceName: string;
  status: "active" | "disconnected" | "error" | "pending";
  lastSyncAt?: string;
  lastErrorMessage?: string;
  credentials: Record<string, string>;
}

function IntegrationCard({
  def,
  connection,
  onConnect,
  onDisconnect,
  onTest,
}: {
  def: IntegrationDef;
  connection?: IntegrationConnection;
  onConnect: (id: string, creds: Record<string, string>) => void;
  onDisconnect: (id: string) => void;
  onTest: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const isConnected = connection?.status === "active";
  const hasError = connection?.status === "error";

  return (
    <div className={`border rounded-lg transition-all ${
      isConnected
        ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
        : hasError
        ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
        : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
    }`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{def.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">{def.name}</span>
              {isConnected && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {hasError && <AlertCircle className="w-4 h-4 text-red-500" />}
              {connection?.status === "pending" && <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{def.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && connection.lastSyncAt && (
            <span className="text-xs text-gray-400">
              Sync: {new Date(connection.lastSyncAt).toLocaleDateString("de-DE")}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            isConnected ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
            : hasError ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
          }`}>
            {isConnected ? "Verbunden" : hasError ? "Fehler" : "Nicht verbunden"}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 space-y-4">
          {hasError && connection.lastErrorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{connection.lastErrorMessage}</p>
            </div>
          )}

          {def.fields.length > 0 ? (
            <div className="space-y-3">
              {def.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{field.label}</label>
                  <div className="relative">
                    <input
                      type={field.secret && !showSecrets[field.key] ? "password" : "text"}
                      value={creds[field.key] ?? connection?.credentials[field.key] ?? ""}
                      onChange={(e) => setCreds((p) => ({ ...p, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-mono"
                    />
                    {field.secret && (
                      <button
                        type="button"
                        onClick={() => setShowSecrets((p) => ({ ...p, [field.key]: !p[field.key] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showSecrets[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Keine Zugangsdaten erforderlich — diese Integration funktioniert ohne Konfiguration.
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <a
              href={def.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> Dokumentation
            </a>
            <div className="flex gap-2">
              {isConnected && (
                <>
                  <button
                    onClick={() => onTest(def.id)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-900 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Testen
                  </button>
                  <button
                    onClick={() => onDisconnect(def.id)}
                    className="px-3 py-1.5 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-1"
                  >
                    <Power className="w-3.5 h-3.5" /> Trennen
                  </button>
                </>
              )}
              {!isConnected && def.fields.length > 0 && (
                <button
                  onClick={() => onConnect(def.id, creds)}
                  disabled={Object.keys(creds).length === 0}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <Plug className="w-3.5 h-3.5" /> Verbinden
                </button>
              )}
              {!isConnected && def.fields.length === 0 && (
                <button
                  onClick={() => onConnect(def.id, {})}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Plug className="w-3.5 h-3.5" /> Aktivieren
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const WEBHOOK_EVENTS = [
  "invoice.created",
  "invoice.sent",
  "invoice.paid",
  "payment.received",
  "document.uploaded",
  "booking.created",
  "export.completed",
];

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
      />
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("company");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Company data
  const [company, setCompany] = useState<CompanyData>({
    companyName: "",
    companyAddress: "",
    companyPlz: "",
    companyCity: "",
    companyPhone: "",
    companyEmail: "",
    companyWebsite: "",
    taxId: "",
    vatId: "",
    bankName: "",
    bankIban: "",
    bankBic: "",
    managingDirector: "",
    registryCourt: "",
    registryNumber: "",
    accentColor: "",
  });

  // Number formats
  const [numberFormats, setNumberFormats] = useState<NumberFormat[]>([]);

  // Document templates
  const [docTemplates, setDocTemplates] = useState<DocTemplate[]>([]);

  // Webhooks
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [webhookSecret, setWebhookSecret] = useState("");

  // Integrations
  const [integrationConnections, setIntegrationConnections] = useState<IntegrationConnection[]>([]);
  const [integrationSearch, setIntegrationSearch] = useState("");
  const [integrationCategory, setIntegrationCategory] = useState<string>("all");
  const [testingId, setTestingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [companyData, formats, templates, webhookData] = await Promise.all([
      getCompanyLayout(),
      getNumberFormats(),
      getDocumentTemplates(),
      getWebhooks(),
    ]);

    if (companyData) {
      setCompany({
        companyName: companyData.companyName || "",
        companyAddress: companyData.companyAddress || "",
        companyPlz: companyData.companyPlz || "",
        companyCity: companyData.companyCity || "",
        companyPhone: companyData.companyPhone || "",
        companyEmail: companyData.companyEmail || "",
        companyWebsite: companyData.companyWebsite || "",
        taxId: companyData.taxId || "",
        vatId: companyData.vatId || "",
        bankName: companyData.bankName || "",
        bankIban: companyData.bankIban || "",
        bankBic: companyData.bankBic || "",
        managingDirector: companyData.managingDirector || "",
        registryCourt: companyData.registryCourt || "",
        registryNumber: companyData.registryNumber || "",
        accentColor: companyData.accentColor || "",
      });
    }

    setNumberFormats(formats as NumberFormat[]);
    setDocTemplates(templates as DocTemplate[]);
    setWebhooks(webhookData as WebhookRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveCompany = async () => {
    setSaving(true);
    await updateCompanyLayout(company);
    setSaving(false);
  };

  const handleSaveNumberFormat = async (format: NumberFormat) => {
    setSaving(true);
    await updateNumberFormat(format.prefix, {
      label: format.label,
      formatTemplate: format.formatTemplate,
      padding: format.padding ?? 4,
      perYear: format.perYear ?? true,
    });
    setSaving(false);
  };

  const handleCreateWebhook = async () => {
    if (!webhookUrl.trim() || webhookEvents.length === 0) return;
    setSaving(true);
    await createWebhook({
      url: webhookUrl,
      events: webhookEvents,
      secret: webhookSecret || undefined,
    });
    setWebhookUrl("");
    setWebhookEvents([]);
    setWebhookSecret("");
    setShowWebhookForm(false);
    const updated = await getWebhooks();
    setWebhooks(updated as WebhookRecord[]);
    setSaving(false);
  };

  const handleDeleteWebhook = async (id: number) => {
    if (!confirm("Delete this webhook?")) return;
    await deleteWebhook(id);
    const updated = await getWebhooks();
    setWebhooks(updated as WebhookRecord[]);
  };

  const updateCompanyField = (field: keyof CompanyData, value: string) => {
    setCompany((prev) => ({ ...prev, [field]: value }));
  };

  const handleConnectIntegration = async (id: string, creds: Record<string, string>) => {
    const newConn: IntegrationConnection = {
      id: crypto.randomUUID(),
      serviceName: id,
      status: "active",
      lastSyncAt: new Date().toISOString(),
      credentials: creds,
    };
    setIntegrationConnections((prev) => [...prev.filter((c) => c.serviceName !== id), newConn]);
  };

  const handleDisconnectIntegration = async (id: string) => {
    if (!confirm("Integration wirklich trennen?")) return;
    setIntegrationConnections((prev) => prev.filter((c) => c.serviceName !== id));
  };

  const handleTestIntegration = async (id: string) => {
    setTestingId(id);
    // Simulate test delay
    await new Promise((r) => setTimeout(r, 1500));
    setTestingId(null);
  };

  const filteredIntegrations = ACCOUNTING_INTEGRATIONS.filter((i) => {
    const matchesSearch = !integrationSearch ||
      i.name.toLowerCase().includes(integrationSearch.toLowerCase()) ||
      i.description.toLowerCase().includes(integrationSearch.toLowerCase());
    const matchesCategory = integrationCategory === "all" || i.category === integrationCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <>
        <PageHeader title="Settings" description="Configure company details and accounting preferences" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure company details, number formats, and preferences"
      />

      <div className="p-6 space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Company Tab */}
        {activeTab === "company" && (
          <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6 space-y-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Company Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Company Name" value={company.companyName} onChange={(v) => updateCompanyField("companyName", v)} placeholder="Muster GmbH" />
              <InputField label="Managing Director" value={company.managingDirector} onChange={(v) => updateCompanyField("managingDirector", v)} placeholder="Max Mustermann" />
              <InputField label="Address" value={company.companyAddress} onChange={(v) => updateCompanyField("companyAddress", v)} placeholder="Musterstr. 1" />
              <div className="grid grid-cols-2 gap-2">
                <InputField label="PLZ" value={company.companyPlz} onChange={(v) => updateCompanyField("companyPlz", v)} placeholder="12345" />
                <InputField label="City" value={company.companyCity} onChange={(v) => updateCompanyField("companyCity", v)} placeholder="Berlin" />
              </div>
              <InputField label="Phone" value={company.companyPhone} onChange={(v) => updateCompanyField("companyPhone", v)} placeholder="+49 30 123456" type="tel" />
              <InputField label="Email" value={company.companyEmail} onChange={(v) => updateCompanyField("companyEmail", v)} placeholder="info@example.com" type="email" />
              <InputField label="Website" value={company.companyWebsite} onChange={(v) => updateCompanyField("companyWebsite", v)} placeholder="https://example.com" type="url" />
            </div>

            <hr className="border-gray-200 dark:border-gray-800" />

            <h3 className="font-semibold text-gray-900 dark:text-white">
              Tax & Registration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Tax ID (Steuernummer)" value={company.taxId} onChange={(v) => updateCompanyField("taxId", v)} placeholder="12/345/67890" />
              <InputField label="VAT ID (USt-IdNr.)" value={company.vatId} onChange={(v) => updateCompanyField("vatId", v)} placeholder="DE123456789" />
              <InputField label="Registry Court" value={company.registryCourt} onChange={(v) => updateCompanyField("registryCourt", v)} placeholder="Amtsgericht Berlin" />
              <InputField label="Registry Number" value={company.registryNumber} onChange={(v) => updateCompanyField("registryNumber", v)} placeholder="HRB 12345" />
            </div>

            <hr className="border-gray-200 dark:border-gray-800" />

            <h3 className="font-semibold text-gray-900 dark:text-white">
              Bank Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField label="Bank Name" value={company.bankName} onChange={(v) => updateCompanyField("bankName", v)} placeholder="Deutsche Bank" />
              <InputField label="IBAN" value={company.bankIban} onChange={(v) => updateCompanyField("bankIban", v)} placeholder="DE89 3704 0044 0532 0130 00" />
              <InputField label="BIC" value={company.bankBic} onChange={(v) => updateCompanyField("bankBic", v)} placeholder="COBADEFFXXX" />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveCompany}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Company Settings
              </button>
            </div>
          </div>
        )}

        {/* Number Formats Tab */}
        {activeTab === "numbers" && (
          <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6 space-y-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Number Format Configuration
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure number sequences for invoices, offers, orders, and other documents.
              Use placeholders: {"{{YEAR}}"} for year, {"{{SEQ}}"} for sequence number.
            </p>

            {numberFormats.length > 0 ? (
              <div className="space-y-4">
                {numberFormats.map((format) => (
                  <div
                    key={format.prefix}
                    className="border border-gray-200 dark:border-gray-800 rounded-lg p-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Prefix</label>
                        <span className="inline-flex items-center px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-mono font-medium text-gray-700 dark:text-gray-300">
                          {format.prefix}
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Label</label>
                        <input
                          type="text"
                          value={format.label}
                          onChange={(e) => {
                            setNumberFormats((prev) =>
                              prev.map((f) =>
                                f.prefix === format.prefix
                                  ? { ...f, label: e.target.value }
                                  : f
                              )
                            );
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Format Template</label>
                        <input
                          type="text"
                          value={format.formatTemplate}
                          onChange={(e) => {
                            setNumberFormats((prev) =>
                              prev.map((f) =>
                                f.prefix === format.prefix
                                  ? { ...f, formatTemplate: e.target.value }
                                  : f
                              )
                            );
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-mono"
                        />
                      </div>
                      <button
                        onClick={() => handleSaveNumberFormat(format)}
                        disabled={saving}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 justify-center"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">
                No number formats configured yet. They will be created automatically when you first create a document.
              </p>
            )}
          </div>
        )}

        {/* Document Templates Tab */}
        {activeTab === "templates" && (
          <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6 space-y-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Document Templates
            </h3>

            {docTemplates.length > 0 ? (
              <div className="space-y-3">
                {docTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {tpl.name}
                        </span>
                        {tpl.isDefault && (
                          <StatusBadge status="active" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Type: {tpl.docType}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {tpl.introText ? "Has intro text" : "No intro text"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">
                No document templates configured yet. Default templates will be used for generated documents.
              </p>
            )}
          </div>
        )}

        {/* Webhooks Tab */}
        {activeTab === "webhooks" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Webhook Endpoints
                </h3>
                <button
                  onClick={() => setShowWebhookForm(!showWebhookForm)}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2"
                >
                  {showWebhookForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {showWebhookForm ? "Cancel" : "Add Webhook"}
                </button>
              </div>

              {/* Add Webhook Form */}
              {showWebhookForm && (
                <div className="mb-6 p-4 border border-gray-200 dark:border-gray-800 rounded-lg space-y-4">
                  <InputField
                    label="URL"
                    value={webhookUrl}
                    onChange={setWebhookUrl}
                    placeholder="https://example.com/webhook"
                    type="url"
                  />
                  <InputField
                    label="Secret (optional)"
                    value={webhookSecret}
                    onChange={setWebhookSecret}
                    placeholder="webhook-signing-secret"
                  />
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Events
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {WEBHOOK_EVENTS.map((event) => (
                        <button
                          key={event}
                          onClick={() => {
                            setWebhookEvents((prev) =>
                              prev.includes(event)
                                ? prev.filter((e) => e !== event)
                                : [...prev, event]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                            webhookEvents.includes(event)
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {event}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleCreateWebhook}
                      disabled={saving || !webhookUrl.trim() || webhookEvents.length === 0}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Create Webhook
                    </button>
                  </div>
                </div>
              )}

              {/* Webhook List */}
              {webhooks.length > 0 ? (
                <div className="space-y-3">
                  {webhooks.map((wh) => (
                    <div
                      key={wh.id}
                      className="border border-gray-200 dark:border-gray-800 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                            {wh.url}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(wh.events || []).map((event) => (
                              <span
                                key={event}
                                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400"
                              >
                                {event}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {wh.isActive ? "Active" : "Inactive"}
                            {wh.createdAt && ` - Created ${new Date(wh.createdAt).toLocaleDateString("de-DE")}`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteWebhook(wh.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                          aria-label={`Delete webhook ${wh.url}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-8 text-center">
                  No webhooks configured. Add a webhook to receive notifications about accounting events.
                </p>
              )}
            </div>
          </div>
        )}
        {/* Integrations Tab */}
        {activeTab === "integrations" && (
          <div className="space-y-4">
            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{integrationConnections.filter((c) => c.status === "active").length}</p>
                <p className="text-xs text-gray-500 mt-1">Verbunden</p>
              </div>
              <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{ACCOUNTING_INTEGRATIONS.length}</p>
                <p className="text-xs text-gray-500 mt-1">Verfügbar</p>
              </div>
              <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-500">{integrationConnections.filter((c) => c.status === "error").length}</p>
                <p className="text-xs text-gray-500 mt-1">Fehler</p>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={integrationSearch}
                  onChange={(e) => setIntegrationSearch(e.target.value)}
                  placeholder="Integration suchen..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <select
                value={integrationCategory}
                onChange={(e) => setIntegrationCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">Alle Kategorien</option>
                {INTEGRATION_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Integration Cards grouped by category */}
            {(integrationCategory === "all" ? INTEGRATION_CATEGORIES : [integrationCategory]).map((cat) => {
              const catIntegrations = filteredIntegrations.filter((i) => i.category === cat);
              if (catIntegrations.length === 0) return null;
              return (
                <div key={cat}>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{cat}</h3>
                  <div className="space-y-2">
                    {catIntegrations.map((def) => (
                      <IntegrationCard
                        key={def.id}
                        def={def}
                        connection={integrationConnections.find((c) => c.serviceName === def.id)}
                        onConnect={handleConnectIntegration}
                        onDisconnect={handleDisconnectIntegration}
                        onTest={handleTestIntegration}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredIntegrations.length === 0 && (
              <div className="text-center py-12">
                <Plug className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">Keine Integrationen gefunden.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ==================== Factur-X Types ====================
// French e-invoicing format based on UN/CEFACT CII (Cross Industry Invoice).
// Factur-X is the French profile of ZUGFeRD.
// This is a document format library — no HTTP calls, only generation/parsing/validation.

/** Factur-X profile conformance levels (ascending complexity) */
export type FacturXProfile =
  | "MINIMUM"
  | "BASIC WL"
  | "BASIC"
  | "EN16931"
  | "EXTENDED";

/** Factur-X version */
export type FacturXVersion = "1.0" | "1.0.06";

/** Document type codes per UNTDID 1001 */
export type FacturXDocumentTypeCode =
  | "380"   // Commercial invoice
  | "381"   // Credit note
  | "384"   // Corrected invoice
  | "389"   // Self-billed invoice
  | "261"   // Self-billed credit note
  | "386"   // Prepayment invoice
  | "751";  // Invoice information for accounting purposes

/** Currency codes (ISO 4217) commonly used in French invoicing */
export type FacturXCurrencyCode =
  | "EUR"
  | "USD"
  | "GBP"
  | "CHF";

/** VAT category codes per UNTDID 5305 */
export type FacturXVatCategoryCode =
  | "S"   // Standard rate
  | "Z"   // Zero rated
  | "E"   // Exempt
  | "AE"  // Reverse charge
  | "K"   // Intra-community supply
  | "G"   // Export outside the EU
  | "O";  // Not subject to VAT

/** Payment means codes per UNTDID 4461 */
export type FacturXPaymentMeansCode =
  | "10"   // In cash
  | "30"   // Credit transfer
  | "42"   // Payment to bank account
  | "48"   // Bank card
  | "49"   // Direct debit
  | "57"   // Standing agreement
  | "58"   // SEPA credit transfer
  | "59";  // SEPA direct debit

/** Unit codes per UN/ECE Recommendation 20 */
export type FacturXUnitCode =
  | "C62"  // Piece
  | "HUR"  // Hour
  | "DAY"  // Day
  | "KGM"  // Kilogram
  | "MTR"  // Metre
  | "LTR"  // Litre
  | string;

// ==================== Business Entities ====================

/** Postal address */
export interface FacturXAddress {
  streetName?: string;
  additionalStreetName?: string;
  city?: string;
  postCode?: string;
  countrySubdivision?: string;
  /** ISO 3166-1 alpha-2 country code */
  countryCode: string;
}

/** Contact information */
export interface FacturXContact {
  name?: string;
  telephone?: string;
  email?: string;
}

/** Seller party (BG-4) */
export interface FacturXSeller {
  name: string;
  tradingName?: string;
  /** SIRET number (French business identifier) */
  siret?: string;
  /** SIREN number */
  siren?: string;
  /** VAT identifier */
  vatId?: string;
  /** Tax registration ID */
  taxRegistrationId?: string;
  /** Legal registration identifier (e.g., RCS) */
  legalRegistrationId?: string;
  /** Electronic address (e.g., email for Chorus Pro) */
  electronicAddress?: string;
  electronicAddressScheme?: string;
  address: FacturXAddress;
  contact?: FacturXContact;
}

/** Buyer party (BG-7) */
export interface FacturXBuyer {
  name: string;
  tradingName?: string;
  siret?: string;
  siren?: string;
  vatId?: string;
  /** Buyer reference (e.g., Chorus Pro service code) */
  buyerReference?: string;
  legalRegistrationId?: string;
  electronicAddress?: string;
  electronicAddressScheme?: string;
  address: FacturXAddress;
  contact?: FacturXContact;
}

/** Payment instructions (BG-16) */
export interface FacturXPaymentInstructions {
  paymentMeansCode: FacturXPaymentMeansCode;
  paymentMeansText?: string;
  remittanceInformation?: string;
  creditTransfer?: FacturXCreditTransfer[];
  directDebit?: FacturXDirectDebit;
}

/** SEPA credit transfer info (BG-17) */
export interface FacturXCreditTransfer {
  iban: string;
  accountName?: string;
  bic?: string;
}

/** SEPA direct debit info (BG-19) */
export interface FacturXDirectDebit {
  mandateReference: string;
  creditorId: string;
  debitedAccountId: string;
}

/** Document totals (BG-22) */
export interface FacturXTotals {
  lineTotalAmount: number;
  allowanceTotalAmount?: number;
  chargeTotalAmount?: number;
  taxExclusiveAmount: number;
  taxAmount?: number;
  taxInclusiveAmount: number;
  paidAmount?: number;
  duePayableAmount: number;
}

/** VAT breakdown entry (BG-23) */
export interface FacturXVatBreakdown {
  taxableAmount: number;
  taxAmount: number;
  categoryCode: FacturXVatCategoryCode;
  rate?: number;
  exemptionReasonText?: string;
  exemptionReasonCode?: string;
}

/** Invoice line item (BG-25) */
export interface FacturXLine {
  id: string;
  note?: string;
  quantity: number;
  unitCode: FacturXUnitCode;
  netAmount: number;
  priceDetails: FacturXPriceDetails;
  vatInfo: FacturXLineVatInfo;
  item: FacturXItemInfo;
}

/** Price details for a line (BG-29) */
export interface FacturXPriceDetails {
  netPrice: number;
  grossPrice?: number;
  priceDiscount?: number;
  baseQuantity?: number;
  baseQuantityUnitCode?: FacturXUnitCode;
}

/** Line VAT info (BG-30) */
export interface FacturXLineVatInfo {
  categoryCode: FacturXVatCategoryCode;
  rate?: number;
}

/** Item information (BG-31) */
export interface FacturXItemInfo {
  name: string;
  description?: string;
  sellersId?: string;
  buyersId?: string;
  standardId?: string;
  standardIdScheme?: string;
  countryOfOrigin?: string;
}

/** Invoice note */
export interface FacturXNote {
  text: string;
  subjectCode?: string;
}

// ==================== Top-Level Invoice Document ====================

/** Complete Factur-X invoice data */
export interface FacturXInvoice {
  /** Factur-X profile level */
  profile: FacturXProfile;
  /** Factur-X version */
  version?: FacturXVersion;
  /** Invoice number (BT-1) */
  invoiceNumber: string;
  /** Invoice issue date YYYY-MM-DD (BT-2) */
  issueDate: string;
  /** Document type code (BT-3) */
  typeCode: FacturXDocumentTypeCode;
  /** Currency code (BT-5) */
  currencyCode: FacturXCurrencyCode;
  /** Due date YYYY-MM-DD (BT-9) */
  dueDate?: string;
  /** Buyer reference / order reference (BT-10) */
  buyerReference?: string;
  /** Purchase order reference (BT-13) */
  orderReference?: string;
  /** Contract reference (BT-12) */
  contractReference?: string;
  /** Payment terms text (BT-20) */
  paymentTerms?: string;
  /** Invoice notes (BG-1) */
  notes?: FacturXNote[];

  /** Seller (BG-4) */
  seller: FacturXSeller;
  /** Buyer (BG-7) */
  buyer: FacturXBuyer;
  /** Payment instructions (BG-16) */
  paymentInstructions?: FacturXPaymentInstructions;
  /** Document totals (BG-22) */
  totals: FacturXTotals;
  /** VAT breakdown (BG-23) */
  vatBreakdown: FacturXVatBreakdown[];
  /** Invoice lines (BG-25) */
  lines: FacturXLine[];

  /** Preceding invoice reference for credit notes (BT-25) */
  precedingInvoiceReference?: string;
}

// ==================== Validation ====================

/** Validation severity */
export type FacturXValidationSeverity = "error" | "warning" | "info";

/** Single validation issue */
export interface FacturXValidationIssue {
  severity: FacturXValidationSeverity;
  businessTerm?: string;
  path: string;
  message: string;
  rule?: string;
}

/** Validation result */
export interface FacturXValidationResult {
  valid: boolean;
  profile: FacturXProfile;
  issues: FacturXValidationIssue[];
}

/** Generation result */
export interface FacturXGenerationResult {
  /** The generated CII XML string */
  xml: string;
  /** The profile used */
  profile: FacturXProfile;
  /** Validation issues encountered during generation */
  issues: FacturXValidationIssue[];
}

/** Parse result */
export interface FacturXParseResult {
  /** Parsed invoice data */
  invoice: FacturXInvoice;
  /** Detected profile */
  profile: FacturXProfile;
  /** Parse warnings */
  warnings: string[];
}

// ==================== CII Namespace Constants ====================

/** XML namespaces for Factur-X CII */
export const FACTURX_NAMESPACES = {
  RSM: "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100",
  RAM: "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100",
  QDT: "urn:un:unece:uncefact:data:standard:QualifiedDataType:100",
  UDT: "urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100",
} as const;

/** Factur-X profile URN identifiers */
export const FACTURX_PROFILE_URNS: Record<FacturXProfile, string> = {
  MINIMUM: "urn:factur-x.eu:1p0:minimum",
  "BASIC WL": "urn:factur-x.eu:1p0:basicwl",
  BASIC: "urn:factur-x.eu:1p0:basic",
  EN16931: "urn:cen.eu:en16931:2017",
  EXTENDED: "urn:factur-x.eu:1p0:extended",
} as const;

// ==================== ZUGFeRD / XRechnung Types ====================
// Based on UN/CEFACT Cross Industry Invoice (CII) D16B
// and EN 16931 European e-invoicing standard.

/** ZUGFeRD profile conformance levels (ascending complexity) */
export type ZugferdProfile =
  | "MINIMUM"
  | "BASIC WL"
  | "BASIC"
  | "EN16931"
  | "EXTENDED";

/** ZUGFeRD version */
export type ZugferdVersion = "2.1" | "2.2" | "2.3";

/** XRechnung version (German CIUS of EN 16931) */
export type XRechnungVersion = "2.0" | "3.0";

/** Document type codes per UNTDID 1001 */
export type DocumentTypeCode =
  | "380" // Commercial invoice
  | "381" // Credit note
  | "384" // Corrected invoice
  | "389" // Self-billed invoice
  | "261" // Self-billed credit note
  | "386" // Prepayment invoice
  | "751"; // Invoice information for accounting purposes

/** Currency codes (ISO 4217) commonly used in EU invoicing */
export type CurrencyCode =
  | "EUR"
  | "USD"
  | "GBP"
  | "CHF"
  | "SEK"
  | "NOK"
  | "DKK"
  | "PLN"
  | "CZK"
  | "HUF"
  | "RON"
  | "BGN";

/** Country codes (ISO 3166-1 alpha-2) */
export type CountryCode = string; // e.g., "DE", "FR", "AT"

/** VAT category codes per UNTDID 5305 */
export type VatCategoryCode =
  | "S"  // Standard rate
  | "Z"  // Zero rated
  | "E"  // Exempt
  | "AE" // Reverse charge
  | "K"  // Intra-community supply
  | "G"  // Export outside the EU
  | "O"  // Not subject to VAT
  | "L"  // Canary Islands general indirect tax
  | "M"; // Tax for production, services and importation in Ceuta and Melilla

/** Payment means codes per UNTDID 4461 */
export type PaymentMeansCode =
  | "10"  // In cash
  | "20"  // Cheque
  | "30"  // Credit transfer
  | "42"  // Payment to bank account
  | "48"  // Bank card
  | "49"  // Direct debit
  | "57"  // Standing agreement
  | "58"  // SEPA credit transfer
  | "59"; // SEPA direct debit

/** Unit codes per UN/ECE Recommendation 20 */
export type UnitCode =
  | "C62" // One (piece)
  | "HUR" // Hour
  | "DAY" // Day
  | "MON" // Month
  | "KGM" // Kilogram
  | "MTR" // Metre
  | "LTR" // Litre
  | "MTK" // Square metre
  | "MTQ" // Cubic metre
  | "SET" // Set
  | "TNE" // Metric ton
  | "MIN" // Minute
  | "SEC" // Second
  | "KMT" // Kilometre
  | "XPP" // Piece (package)
  | string; // Allow other UN/ECE codes

// ==================== Business Terms (BT-*) ====================
// Mapped from EN 16931 semantic model.

/** BG-4: Seller (Rechnungssteller) */
export interface SellerParty {
  /** BT-27: Seller name */
  name: string;
  /** BT-28: Seller trading name */
  tradingName?: string;
  /** BT-29: Seller identifier (e.g., GLN) */
  id?: string;
  /** BT-29-1: Seller identifier scheme (e.g., "0088" for GLN) */
  idScheme?: string;
  /** BT-30: Seller legal registration identifier */
  legalRegistrationId?: string;
  /** BT-30-1: Seller legal registration scheme */
  legalRegistrationScheme?: string;
  /** BT-31: Seller VAT identifier */
  vatId?: string;
  /** BT-32: Seller tax registration identifier */
  taxRegistrationId?: string;
  /** BT-33: Seller additional legal info */
  additionalLegalInfo?: string;
  /** BT-34: Seller electronic address */
  electronicAddress?: string;
  /** BT-34-1: Electronic address scheme (e.g., "EM" for email) */
  electronicAddressScheme?: string;
  /** BG-5: Seller postal address */
  address: PostalAddress;
  /** BG-6: Seller contact */
  contact?: ContactInfo;
}

/** BG-7: Buyer (Rechnungsempfaenger) */
export interface BuyerParty {
  /** BT-44: Buyer name */
  name: string;
  /** BT-45: Buyer trading name */
  tradingName?: string;
  /** BT-46: Buyer identifier */
  id?: string;
  /** BT-46-1: Buyer identifier scheme */
  idScheme?: string;
  /** BT-47: Buyer legal registration identifier */
  legalRegistrationId?: string;
  /** BT-47-1: Buyer legal registration scheme */
  legalRegistrationScheme?: string;
  /** BT-48: Buyer VAT identifier */
  vatId?: string;
  /** BT-49: Buyer electronic address */
  electronicAddress?: string;
  /** BT-49-1: Electronic address scheme */
  electronicAddressScheme?: string;
  /** BG-8: Buyer postal address */
  address: PostalAddress;
  /** BG-9: Buyer contact */
  contact?: ContactInfo;
}

/** Postal address (BG-5, BG-8, BG-12, BG-15) */
export interface PostalAddress {
  /** BT-35/50/64/75: Street name / address line 1 */
  streetName?: string;
  /** BT-36/51/65/76: Additional street name / address line 2 */
  additionalStreetName?: string;
  /** BT-162/163/164/165: Address line 3 */
  addressLine3?: string;
  /** BT-37/52/66/77: City name */
  city?: string;
  /** BT-38/53/67/78: Post code */
  postCode?: string;
  /** BT-39/54/68/79: Country subdivision (state/region) */
  countrySubdivision?: string;
  /** BT-40/55/69/80: Country code (ISO 3166-1 alpha-2) */
  countryCode: CountryCode;
}

/** Contact information (BG-6, BG-9) */
export interface ContactInfo {
  /** BT-41/56: Contact person name */
  name?: string;
  /** BT-42/57: Contact telephone */
  telephone?: string;
  /** BT-43/58: Contact email */
  email?: string;
}

/** BG-10: Payee (if different from Seller) */
export interface PayeeParty {
  /** BT-59: Payee name */
  name: string;
  /** BT-60: Payee identifier */
  id?: string;
  /** BT-60-1: Payee identifier scheme */
  idScheme?: string;
  /** BT-61: Payee legal registration identifier */
  legalRegistrationId?: string;
  /** BT-61-1: Payee legal registration scheme */
  legalRegistrationScheme?: string;
}

/** BG-11: Seller tax representative */
export interface TaxRepresentativeParty {
  /** BT-62: Tax representative name */
  name: string;
  /** BT-63: Tax representative VAT identifier */
  vatId: string;
  /** BG-12: Tax representative address */
  address: PostalAddress;
}

/** BG-13: Delivery information */
export interface DeliveryInfo {
  /** BT-70: Deliver to party name */
  deliverToName?: string;
  /** BT-71: Deliver to location identifier */
  deliverToLocationId?: string;
  /** BT-71-1: Location identifier scheme */
  deliverToLocationScheme?: string;
  /** BT-72: Actual delivery date (YYYY-MM-DD) */
  actualDeliveryDate?: string;
  /** BG-14: Invoicing period */
  invoicingPeriod?: DatePeriod;
  /** BG-15: Deliver to address */
  deliverToAddress?: PostalAddress;
}

/** Date period (BG-14, BG-26) */
export interface DatePeriod {
  /** Start date (YYYY-MM-DD) */
  startDate?: string;
  /** End date (YYYY-MM-DD) */
  endDate?: string;
}

/** BG-16: Payment instructions */
export interface PaymentInstructions {
  /** BT-81: Payment means type code */
  paymentMeansCode: PaymentMeansCode;
  /** BT-82: Payment means text */
  paymentMeansText?: string;
  /** BT-83: Remittance information (Verwendungszweck) */
  remittanceInformation?: string;
  /** BG-17: Credit transfer */
  creditTransfer?: CreditTransferInfo[];
  /** BG-18: Payment card */
  paymentCard?: PaymentCardInfo;
  /** BG-19: Direct debit */
  directDebit?: DirectDebitInfo;
}

/** BG-17: Credit transfer (Ueberweisung) */
export interface CreditTransferInfo {
  /** BT-84: Payment account identifier (IBAN) */
  iban: string;
  /** BT-85: Payment account name */
  accountName?: string;
  /** BT-86: Payment service provider identifier (BIC) */
  bic?: string;
}

/** BG-18: Payment card information */
export interface PaymentCardInfo {
  /** BT-87: Payment card primary account number (masked) */
  cardNumber: string;
  /** BT-88: Holder of the payment card */
  holderName?: string;
}

/** BG-19: Direct debit (Lastschrift) */
export interface DirectDebitInfo {
  /** BT-89: Mandate reference identifier */
  mandateReference: string;
  /** BT-90: Bank assigned creditor identifier */
  creditorId: string;
  /** BT-91: Debited account identifier (IBAN) */
  debitedAccountId: string;
}

/** BG-20: Document level allowance */
export interface DocumentAllowance {
  /** BT-92: Document level allowance amount */
  amount: number;
  /** BT-93: Document level allowance base amount */
  baseAmount?: number;
  /** BT-94: Document level allowance percentage */
  percentage?: number;
  /** BT-95: Document level allowance VAT category code */
  vatCategoryCode: VatCategoryCode;
  /** BT-96: Document level allowance VAT rate */
  vatRate?: number;
  /** BT-97: Document level allowance reason */
  reason?: string;
  /** BT-98: Document level allowance reason code */
  reasonCode?: string;
}

/** BG-21: Document level charge */
export interface DocumentCharge {
  /** BT-99: Document level charge amount */
  amount: number;
  /** BT-100: Document level charge base amount */
  baseAmount?: number;
  /** BT-101: Document level charge percentage */
  percentage?: number;
  /** BT-102: Document level charge VAT category code */
  vatCategoryCode: VatCategoryCode;
  /** BT-103: Document level charge VAT rate */
  vatRate?: number;
  /** BT-104: Document level charge reason */
  reason?: string;
  /** BT-105: Document level charge reason code */
  reasonCode?: string;
}

/** BG-22: Document totals */
export interface DocumentTotals {
  /** BT-106: Sum of invoice line net amounts */
  lineTotalAmount: number;
  /** BT-107: Sum of allowances on document level */
  allowanceTotalAmount?: number;
  /** BT-108: Sum of charges on document level */
  chargeTotalAmount?: number;
  /** BT-109: Invoice total amount without VAT */
  taxExclusiveAmount: number;
  /** BT-110: Invoice total VAT amount */
  taxAmount?: number;
  /** BT-111: Invoice total VAT amount in accounting currency */
  taxAmountInAccountingCurrency?: number;
  /** BT-112: Invoice total amount with VAT */
  taxInclusiveAmount: number;
  /** BT-113: Paid amount */
  paidAmount?: number;
  /** BT-114: Rounding amount */
  roundingAmount?: number;
  /** BT-115: Amount due for payment */
  duePayableAmount: number;
}

/** BG-23: VAT breakdown */
export interface VatBreakdown {
  /** BT-116: VAT category taxable amount */
  taxableAmount: number;
  /** BT-117: VAT category tax amount */
  taxAmount: number;
  /** BT-118: VAT category code */
  categoryCode: VatCategoryCode;
  /** BT-119: VAT category rate */
  rate?: number;
  /** BT-120: VAT exemption reason text */
  exemptionReasonText?: string;
  /** BT-121: VAT exemption reason code */
  exemptionReasonCode?: string;
}

/** BG-24: Additional supporting documents */
export interface SupportingDocument {
  /** BT-122: Supporting document reference */
  id: string;
  /** BT-123: Supporting document description */
  description?: string;
  /** BT-124: External document location (URL) */
  externalLocation?: string;
  /** BT-125: Attached document (base64 encoded) */
  attachedDocument?: string;
  /** BT-125-1: Attached document MIME code */
  mimeCode?: string;
  /** BT-125-2: Attached document filename */
  filename?: string;
}

/** BG-25: Invoice line */
export interface InvoiceLine {
  /** BT-126: Invoice line identifier */
  id: string;
  /** BT-127: Invoice line note */
  note?: string;
  /** BT-128: Invoice line object identifier */
  objectId?: string;
  /** BT-128-1: Invoice line object identifier scheme */
  objectIdScheme?: string;
  /** BT-129: Invoiced quantity */
  quantity: number;
  /** BT-130: Invoiced quantity unit of measure */
  unitCode: UnitCode;
  /** BT-131: Invoice line net amount */
  netAmount: number;
  /** BT-132: Referenced purchase order line reference */
  orderLineReference?: string;
  /** BT-133: Invoice line buyer accounting reference */
  accountingReference?: string;
  /** BG-26: Invoice line period */
  period?: DatePeriod;
  /** BG-27: Invoice line allowances */
  allowances?: LineAllowance[];
  /** BG-28: Invoice line charges */
  charges?: LineCharge[];
  /** BG-29: Price details */
  priceDetails: PriceDetails;
  /** BG-30: Line VAT information */
  vatInfo: LineVatInfo;
  /** BG-31: Item information */
  item: ItemInfo;
}

/** BG-27: Invoice line allowance */
export interface LineAllowance {
  /** BT-136: Invoice line allowance amount */
  amount: number;
  /** BT-137: Invoice line allowance base amount */
  baseAmount?: number;
  /** BT-138: Invoice line allowance percentage */
  percentage?: number;
  /** BT-139: Invoice line allowance reason */
  reason?: string;
  /** BT-140: Invoice line allowance reason code */
  reasonCode?: string;
}

/** BG-28: Invoice line charge */
export interface LineCharge {
  /** BT-141: Invoice line charge amount */
  amount: number;
  /** BT-142: Invoice line charge base amount */
  baseAmount?: number;
  /** BT-143: Invoice line charge percentage */
  percentage?: number;
  /** BT-144: Invoice line charge reason */
  reason?: string;
  /** BT-145: Invoice line charge reason code */
  reasonCode?: string;
}

/** BG-29: Price details */
export interface PriceDetails {
  /** BT-146: Item net price */
  netPrice: number;
  /** BT-147: Item price discount */
  priceDiscount?: number;
  /** BT-148: Item gross price */
  grossPrice?: number;
  /** BT-149: Item price base quantity */
  baseQuantity?: number;
  /** BT-150: Item price base quantity unit of measure */
  baseQuantityUnitCode?: UnitCode;
}

/** BG-30: Line VAT information */
export interface LineVatInfo {
  /** BT-151: Invoiced item VAT category code */
  categoryCode: VatCategoryCode;
  /** BT-152: Invoiced item VAT rate */
  rate?: number;
}

/** BG-31: Item information */
export interface ItemInfo {
  /** BT-153: Item name */
  name: string;
  /** BT-154: Item description */
  description?: string;
  /** BT-155: Item seller's identifier */
  sellersId?: string;
  /** BT-156: Item buyer's identifier */
  buyersId?: string;
  /** BT-157: Item standard identifier (e.g., EAN/GTIN) */
  standardId?: string;
  /** BT-157-1: Item standard identifier scheme (e.g., "0160" for GTIN) */
  standardIdScheme?: string;
  /** BT-158: Item classification identifiers */
  classificationIds?: ItemClassification[];
  /** BT-159: Item country of origin */
  countryOfOrigin?: CountryCode;
  /** BG-32: Item attributes */
  attributes?: ItemAttribute[];
}

/** Item classification (part of BT-158) */
export interface ItemClassification {
  /** Classification identifier value */
  id: string;
  /** Classification scheme identifier (e.g., "STI" for CPV) */
  schemeId: string;
  /** Classification scheme version */
  schemeVersion?: string;
}

/** BG-32: Item attribute */
export interface ItemAttribute {
  /** BT-160: Item attribute name */
  name: string;
  /** BT-161: Item attribute value */
  value: string;
}

// ==================== Top-Level Invoice Document ====================

/** Complete ZUGFeRD / XRechnung invoice data */
export interface ZugferdInvoice {
  /** ZUGFeRD profile level to conform to */
  profile: ZugferdProfile;
  /** ZUGFeRD version */
  version?: ZugferdVersion;
  /** Whether to generate XRechnung-conformant XML */
  xrechnung?: boolean;
  /** XRechnung version (when xrechnung is true) */
  xrechnungVersion?: XRechnungVersion;

  // -- BG-1 through BG-3: Document level --

  /** BT-1: Invoice number */
  invoiceNumber: string;
  /** BT-2: Invoice issue date (YYYY-MM-DD) */
  issueDate: string;
  /** BT-3: Invoice type code */
  typeCode: DocumentTypeCode;
  /** BT-5: Invoice currency code */
  currencyCode: CurrencyCode;
  /** BT-6: VAT accounting currency code (if different) */
  vatAccountingCurrencyCode?: CurrencyCode;
  /** BT-7: Value added tax point date (YYYY-MM-DD) */
  taxPointDate?: string;
  /** BT-8: Value added tax point date code */
  taxPointDateCode?: string;
  /** BT-9: Payment due date (YYYY-MM-DD) */
  dueDate?: string;
  /** BT-10: Buyer reference (Leitweg-ID for XRechnung) */
  buyerReference?: string;
  /** BT-11: Project reference */
  projectReference?: string;
  /** BT-12: Contract reference */
  contractReference?: string;
  /** BT-13: Purchase order reference */
  orderReference?: string;
  /** BT-14: Sales order reference */
  salesOrderReference?: string;
  /** BT-15: Receiving advice reference */
  receivingAdviceReference?: string;
  /** BT-16: Despatch advice reference */
  despatchAdviceReference?: string;
  /** BT-17: Tender or lot reference */
  tenderReference?: string;
  /** BT-18: Invoiced object identifier */
  invoicedObjectId?: string;
  /** BT-18-1: Invoiced object identifier scheme */
  invoicedObjectScheme?: string;
  /** BT-19: Buyer accounting reference */
  buyerAccountingReference?: string;
  /** BT-20: Payment terms */
  paymentTerms?: string;
  /** BT-21: Invoice note (can have multiple) */
  notes?: InvoiceNote[];

  // -- Business groups --

  /** BG-2: Process control */
  processControl?: ProcessControl;
  /** BG-4: Seller */
  seller: SellerParty;
  /** BG-7: Buyer */
  buyer: BuyerParty;
  /** BG-10: Payee (if different from seller) */
  payee?: PayeeParty;
  /** BG-11: Seller tax representative */
  sellerTaxRepresentative?: TaxRepresentativeParty;
  /** BG-13: Delivery information */
  delivery?: DeliveryInfo;
  /** BG-16: Payment instructions */
  paymentInstructions?: PaymentInstructions;
  /** BG-20: Document level allowances */
  allowances?: DocumentAllowance[];
  /** BG-21: Document level charges */
  charges?: DocumentCharge[];
  /** BG-22: Document totals */
  totals: DocumentTotals;
  /** BG-23: VAT breakdown */
  vatBreakdown: VatBreakdown[];
  /** BG-24: Additional supporting documents */
  supportingDocuments?: SupportingDocument[];
  /** BG-25: Invoice lines */
  lines: InvoiceLine[];

  // -- Preceding invoice reference (for credit notes) --
  /** BT-25: Preceding invoice reference */
  precedingInvoiceReference?: string;
  /** BT-26: Preceding invoice issue date */
  precedingInvoiceIssueDate?: string;
}

/** BG-1: Invoice note */
export interface InvoiceNote {
  /** BT-21: Invoice note text */
  text: string;
  /** BT-22: Invoice note subject code */
  subjectCode?: string;
}

/** BG-2: Process control */
export interface ProcessControl {
  /** BT-23: Business process type (e.g., "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0") */
  businessProcessType?: string;
  /** BT-24: Specification identifier (profile URN) */
  specificationIdentifier: string;
}

// ==================== Validation ====================

/** Severity of a validation issue */
export type ValidationSeverity = "error" | "warning" | "info";

/** A single validation issue */
export interface ValidationIssue {
  severity: ValidationSeverity;
  /** Business term reference (e.g., "BT-1") */
  businessTerm?: string;
  /** Path within the invoice data */
  path: string;
  /** Human-readable message */
  message: string;
  /** Rule identifier (e.g., "BR-01", "BR-DE-01") */
  rule?: string;
}

/** Result of validating an invoice */
export interface ValidationResult {
  valid: boolean;
  profile: ZugferdProfile;
  issues: ValidationIssue[];
}

// ==================== CII Namespace Constants ====================

/** XML namespaces for UN/CEFACT Cross-Industry Invoice D16B */
export const CII_NAMESPACES = {
  /** Root namespace: rsm (Root Standard Message) */
  RSM: "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100",
  /** Exchange Header */
  RAM: "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100",
  /** Qualified Data Types */
  QDT: "urn:un:unece:uncefact:data:standard:QualifiedDataType:100",
  /** Unqualified Data Types */
  UDT: "urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100",
  /** XSI namespace */
  XSI: "http://www.w3.org/2001/XMLSchema-instance",
} as const;

/** ZUGFeRD profile URN identifiers */
export const PROFILE_URNS: Record<ZugferdProfile, string> = {
  MINIMUM:
    "urn:factur-x.eu:1p0:minimum",
  "BASIC WL":
    "urn:factur-x.eu:1p0:basicwl",
  BASIC:
    "urn:factur-x.eu:1p0:basic",
  EN16931:
    "urn:cen.eu:en16931:2017",
  EXTENDED:
    "urn:factur-x.eu:1p0:extended",
} as const;

/** XRechnung specification identifiers */
export const XRECHNUNG_SPEC_IDS: Record<XRechnungVersion, string> = {
  "2.0": "urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_2.0",
  "3.0": "urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0",
} as const;

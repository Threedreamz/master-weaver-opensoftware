// ==================== Chorus Pro Types ====================
// French public e-invoicing portal for B2G invoices.
// OAuth2 authentication via PISTE (Portail Internet Securise des Teleservices).

/** Chorus Pro client configuration */
export interface ChorusProClientConfig {
  /** OAuth2 client ID from PISTE */
  clientId: string;
  /** OAuth2 client secret from PISTE */
  clientSecret: string;
  /** Technical user login (cpro login) */
  login: string;
  /** Technical user password */
  password: string;
  /** API environment */
  environment?: "sandbox" | "production";
  /** Request timeout in ms */
  timeout?: number;
}

/** Invoice submission status */
export type ChorusProInvoiceStatus =
  | "DEPOSEE"              // Submitted
  | "EN_COURS_TRAITEMENT"  // Processing
  | "MISE_A_DISPOSITION"   // Made available
  | "REJETEE"              // Rejected
  | "SUSPENDUE"            // Suspended
  | "MANDATEE"             // Mandated
  | "MISE_EN_PAIEMENT"     // Payment issued
  | "COMPTABILISEE";       // Accounted for

/** Invoice flow type */
export type ChorusProFlowType =
  | "A1_FACTURE"           // Standard invoice
  | "A2_FACTURE_DEJA_PAYEE" // Already-paid invoice
  | "A3_MEMOIRE"           // Memorandum
  | "A4_AVOIR"             // Credit note
  | "A5_FACTURE_MIXTE"     // Mixed invoice
  | "A9_ACOMPTE"           // Advance payment
  | "A12_DEMANDE_REMBOURSEMENT"; // Refund request

/** Invoice cadre (framework) */
export type ChorusProCadre =
  | "A1_COMMANDE"          // Purchase order
  | "A2_MARCHE"            // Public contract
  | "A3_ENGAGEMENT_JURIDIQUE"; // Legal commitment

/** Chorus Pro invoice to submit */
export interface ChorusProInvoiceSubmission {
  /** Invoice number */
  invoiceNumber: string;
  /** Invoice date (YYYY-MM-DD) */
  invoiceDate: string;
  /** Flow type */
  flowType: ChorusProFlowType;
  /** Cadre / framework */
  cadre: ChorusProCadre;
  /** SIRET of the issuer */
  issuerSiret: string;
  /** Service code of the issuer (code service) */
  issuerServiceCode?: string;
  /** SIRET of the recipient (public entity) */
  recipientSiret: string;
  /** Service code of the recipient */
  recipientServiceCode?: string;
  /** Engagement number (numero d'engagement) */
  engagementNumber?: string;
  /** Purchase order number */
  purchaseOrderNumber?: string;
  /** Total HT (pre-tax amount in EUR) */
  totalHT: number;
  /** Total TVA (VAT amount in EUR) */
  totalTVA: number;
  /** Total TTC (total amount including VAT in EUR) */
  totalTTC: number;
  /** Payment mode */
  paymentMode?: ChorusProPaymentMode;
  /** Comment */
  comment?: string;
  /** Attached PDF invoice (base64 encoded) */
  pdfContent?: string;
  /** Attached Factur-X XML (base64 encoded) */
  xmlContent?: string;
  /** Line items */
  lines?: ChorusProInvoiceLine[];
}

/** Payment mode */
export type ChorusProPaymentMode =
  | "ESPECE"          // Cash
  | "VIREMENT"        // Wire transfer
  | "CHEQUE"          // Cheque
  | "PRELEVEMENT"     // Direct debit
  | "CARTE_BANCAIRE"  // Bank card
  | "AUTRE";          // Other

/** Invoice line item */
export interface ChorusProInvoiceLine {
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  /** VAT rate (percentage, e.g. 20.0) */
  vatRate: number;
  /** Net amount for this line */
  netAmount: number;
}

/** Invoice submission result */
export interface ChorusProSubmissionResult {
  /** Chorus Pro internal invoice ID */
  invoiceId: number;
  /** Submission number (numero de flux) */
  flowNumber: string;
  /** Invoice status after submission */
  status: ChorusProInvoiceStatus;
  /** Submission date (ISO 8601) */
  submittedAt: string;
}

/** Invoice status query */
export interface ChorusProInvoiceStatusResponse {
  invoiceId: number;
  invoiceNumber: string;
  status: ChorusProInvoiceStatus;
  statusDate: string;
  rejectionReason?: string;
  paymentDate?: string;
  paymentAmount?: number;
}

/** Search invoices parameters */
export interface ChorusProSearchParams {
  /** Filter by status */
  status?: ChorusProInvoiceStatus;
  /** Filter by issuer SIRET */
  issuerSiret?: string;
  /** Filter by recipient SIRET */
  recipientSiret?: string;
  /** Date range start (YYYY-MM-DD) */
  dateFrom?: string;
  /** Date range end (YYYY-MM-DD) */
  dateTo?: string;
  /** Page number (1-based) */
  pageNumber?: number;
  /** Results per page */
  pageSize?: number;
}

/** Search result */
export interface ChorusProSearchResult {
  invoices: ChorusProInvoiceStatusResponse[];
  total: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

/** Structure (public entity) lookup */
export interface ChorusProStructure {
  /** SIRET number */
  siret: string;
  /** Entity name */
  name: string;
  /** Entity type (collectivite, etablissement, etc.) */
  entityType?: string;
  /** Service codes available for this structure */
  serviceCodes?: ChorusProServiceCode[];
  /** Whether this structure is active on Chorus Pro */
  active: boolean;
}

/** Service code for a structure */
export interface ChorusProServiceCode {
  code: string;
  label: string;
  active: boolean;
}

/** OAuth2 token response */
export interface ChorusProTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  scope?: string;
}

// ==================== SDI FatturaPA (Italian e-Invoicing) Types ====================
// Italian electronic invoicing system via SDI (Sistema di Interscambio).
// Uses FatturaPA XML format. Custom certificate authentication.

/** SDI client configuration */
export interface SdiClientConfig {
  /** Path to the client certificate (.pem or .p12) */
  certificatePath: string;
  /** Certificate passphrase */
  certificatePassphrase: string;
  /** SDI channel ID (codice canale) */
  channelId: string;
  /** Intermediary VAT number (if using an intermediary) */
  intermediaryVatNumber?: string;
  /** API environment */
  environment?: "test" | "production";
  /** Request timeout in ms */
  timeout?: number;
}

/** FatturaPA format version */
export type FatturaPAVersion = "FPA12" | "FPR12";

/** FatturaPA document type (TipoDocumento) */
export type FatturaPADocumentType =
  | "TD01"  // Fattura (invoice)
  | "TD02"  // Acconto/anticipo su fattura
  | "TD03"  // Acconto/anticipo su parcella
  | "TD04"  // Nota di credito (credit note)
  | "TD05"  // Nota di debito (debit note)
  | "TD06"  // Parcella (professional fee invoice)
  | "TD07"  // Fattura semplificata (simplified invoice)
  | "TD08"  // Nota di credito semplificata
  | "TD16"  // Integrazione fattura reverse charge interno
  | "TD17"  // Integrazione/autofattura acquisto servizi dall'estero
  | "TD18"  // Integrazione acquisto beni intracomunitari
  | "TD19"  // Integrazione/autofattura acquisto beni ex art. 17 c.2
  | "TD20"  // Autofattura per regolarizzazione
  | "TD21"  // Autofattura per splafonamento
  | "TD22"  // Estrazione beni da deposito IVA
  | "TD23"  // Estrazione beni da deposito IVA con pagamento IVA
  | "TD24"  // Fattura differita (deferred invoice)
  | "TD25"  // Fattura differita art. 21 c.6 lett. a
  | "TD26"  // Cessione beni ammortizzabili
  | "TD27"  // Fattura per autoconsumo o cessioni gratuite
  | "TD28";  // Acquisti da San Marino con IVA

/** SDI notification type */
export type SdiNotificationType =
  | "RC"    // Ricevuta di consegna (delivery receipt)
  | "NS"    // Notifica di scarto (rejection notification)
  | "MC"    // Notifica di mancata consegna (failed delivery)
  | "NE"    // Notifica esito (outcome notification)
  | "MT"    // Notifica metadati (metadata notification)
  | "EC"    // Notifica esito cedente (issuer outcome)
  | "SE"    // Notifica esito scarto (rejection outcome)
  | "DT"    // Notifica decorrenza termini (terms expiry)
  | "AT";   // Attestazione avvenuta trasmissione (transmission attestation)

/** VAT nature codes (Natura) for non-standard VAT operations */
export type FatturaPANaturaCode =
  | "N1"    // Escluse ex art. 15
  | "N2"    // Non soggette (deprecated, use N2.1/N2.2)
  | "N2.1"  // Non soggette - artt. 7-7septies
  | "N2.2"  // Non soggette - altri casi
  | "N3"    // Non imponibili (deprecated, use N3.x)
  | "N3.1"  // Non imponibili - esportazioni
  | "N3.2"  // Non imponibili - cessioni intracomunitarie
  | "N3.3"  // Non imponibili - cessioni verso San Marino
  | "N3.4"  // Non imponibili - operazioni assimilate
  | "N3.5"  // Non imponibili - a seguito di dichiarazioni d'intento
  | "N3.6"  // Non imponibili - altre operazioni
  | "N4"    // Esenti
  | "N5"    // Regime del margine
  | "N6"    // Inversione contabile (deprecated, use N6.x)
  | "N6.1"  // Inversione contabile - cessione rottami
  | "N6.2"  // Inversione contabile - cessione oro e argento
  | "N6.3"  // Inversione contabile - subappalto settore edile
  | "N6.4"  // Inversione contabile - cessione fabbricati
  | "N6.5"  // Inversione contabile - cessione telefoni cellulari
  | "N6.6"  // Inversione contabile - cessione prodotti elettronici
  | "N6.7"  // Inversione contabile - prestazioni settore edile
  | "N6.8"  // Inversione contabile - settore energetico
  | "N6.9"  // Inversione contabile - altri casi
  | "N7";   // IVA assolta in altro stato UE

/** Payment method (ModalitaPagamento) */
export type FatturaPAPaymentMethod =
  | "MP01"  // Contanti (cash)
  | "MP02"  // Assegno (cheque)
  | "MP05"  // Bonifico (wire transfer)
  | "MP08"  // Carta di pagamento (payment card)
  | "MP12"  // RIBA (Ricevuta Bancaria)
  | "MP19"  // SEPA Direct Debit
  | "MP21"  // SEPA Direct Debit CORE
  | "MP22"  // Trattenuta su somme gia riscosse
  | "MP23";  // PagoPA

/** Payment terms (CondizioniPagamento) */
export type FatturaPAPaymentTerms =
  | "TP01"  // Pagamento a rate (installments)
  | "TP02"  // Pagamento completo (full payment)
  | "TP03";  // Anticipo (advance)

// ==================== Business Entities ====================

/** Italian company/party */
export interface FatturaPAParty {
  /** Country code (IT for Italian) */
  countryCode: string;
  /** VAT number (Partita IVA) */
  vatNumber?: string;
  /** Tax code (Codice Fiscale) */
  taxCode?: string;
  /** Company name (Denominazione) */
  companyName?: string;
  /** First name (Nome) - for individuals */
  firstName?: string;
  /** Last name (Cognome) - for individuals */
  lastName?: string;
  /** REA registration */
  reaRegistration?: FatturaPAReaRegistration;
  /** Address */
  address: FatturaPAAddress;
  /** Contact information */
  contact?: FatturaPAContact;
}

/** Italian address (Sede) */
export interface FatturaPAAddress {
  /** Street (Indirizzo) */
  street: string;
  /** House number (NumeroCivico) */
  houseNumber?: string;
  /** Post code (CAP) */
  postCode: string;
  /** City (Comune) */
  city: string;
  /** Province (Provincia) - two-letter code */
  province?: string;
  /** Country code (Nazione) */
  countryCode: string;
}

/** REA registration */
export interface FatturaPAReaRegistration {
  office: string;
  reaNumber: string;
  capital?: number;
  singleMember?: "SU" | "SM";
  liquidationStatus?: "LS" | "LN";
}

/** Contact information */
export interface FatturaPAContact {
  telephone?: string;
  fax?: string;
  email?: string;
}

/** Invoice line item */
export interface FatturaPALineItem {
  lineNumber: number;
  description: string;
  quantity?: number;
  unitOfMeasure?: string;
  /** Unit price in EUR */
  unitPrice: number;
  /** Total line price in EUR */
  totalPrice: number;
  /** VAT rate (percentage) */
  vatRate: number;
  /** Natura code (for non-standard VAT) */
  natura?: FatturaPANaturaCode;
  /** Administrative reference */
  administrativeReference?: string;
  /** Start date (for services) */
  startDate?: string;
  /** End date (for services) */
  endDate?: string;
}

/** VAT summary line (DatiRiepilogo) */
export interface FatturaPAVatSummary {
  vatRate: number;
  natura?: FatturaPANaturaCode;
  taxableAmount: number;
  vatAmount: number;
  /** VAT collectability (esigibilita IVA) */
  collectability?: "I" | "D" | "S";
}

/** Payment detail */
export interface FatturaPAPaymentDetail {
  paymentMethod: FatturaPAPaymentMethod;
  /** Payment due date (YYYY-MM-DD) */
  paymentDueDate?: string;
  /** Payment amount in EUR */
  paymentAmount: number;
  /** IBAN for wire transfer */
  iban?: string;
  /** BIC/SWIFT code */
  bic?: string;
  /** Bank name */
  bankName?: string;
}

// ==================== Top-Level Invoice ====================

/** Complete FatturaPA invoice */
export interface FatturaPAInvoice {
  /** Format version */
  formatVersion: FatturaPAVersion;
  /** Document type */
  documentType: FatturaPADocumentType;
  /** Invoice number */
  invoiceNumber: string;
  /** Invoice date (YYYY-MM-DD) */
  invoiceDate: string;
  /** Currency (default EUR) */
  currency?: string;
  /** Seller / issuer (CedentePrestatore) */
  seller: FatturaPAParty;
  /** Buyer / recipient (CessionarioCommittente) */
  buyer: FatturaPAParty;
  /** Recipient code (CodiceDestinatario) - 7 chars for B2B, XXXXXXX for PEC */
  recipientCode: string;
  /** PEC email (if recipientCode is XXXXXXX) */
  pecEmail?: string;
  /** Line items */
  lines: FatturaPALineItem[];
  /** VAT summary */
  vatSummary: FatturaPAVatSummary[];
  /** Payment terms */
  paymentTerms?: FatturaPAPaymentTerms;
  /** Payment details */
  paymentDetails?: FatturaPAPaymentDetail[];
  /** Document total */
  totalAmount: number;
  /** Stamp duty (bollo) amount */
  stampDutyAmount?: number;
  /** Stamp duty virtually applied */
  virtualStampDuty?: boolean;
  /** Free-text description (Causale) */
  description?: string[];
  /** Related documents */
  relatedDocuments?: FatturaPARelatedDocument[];
}

/** Related document reference (DatiOrdineAcquisto, etc.) */
export interface FatturaPARelatedDocument {
  type: "order" | "contract" | "agreement" | "reception" | "other";
  documentNumber?: string;
  documentDate?: string;
  cupCode?: string;
  cigCode?: string;
}

// ==================== SDI Communication ====================

/** SDI submission result */
export interface SdiSubmissionResult {
  /** SDI file identifier (IdentificativoSdI) */
  sdiIdentifier: string;
  /** Submission timestamp */
  submittedAt: string;
  /** Whether submission was accepted for processing */
  accepted: boolean;
  /** Error messages (if rejected) */
  errors?: SdiError[];
}

/** SDI notification */
export interface SdiNotification {
  /** SDI file identifier */
  sdiIdentifier: string;
  /** Notification type */
  type: SdiNotificationType;
  /** Notification description */
  description?: string;
  /** Notification date */
  notificationDate: string;
  /** Message ID */
  messageId: string;
  /** Hash of the original file */
  fileHash?: string;
  /** Rejection error details */
  errors?: SdiError[];
}

/** SDI error detail */
export interface SdiError {
  code: string;
  message: string;
  /** Suggestion for fixing */
  suggestion?: string;
}

/** Received invoice from SDI */
export interface SdiReceivedInvoice {
  /** SDI file identifier */
  sdiIdentifier: string;
  /** Raw FatturaPA XML */
  xml: string;
  /** Parsed invoice data */
  invoice: FatturaPAInvoice;
  /** Metadata from SDI */
  metadata: SdiReceivedMetadata;
}

/** SDI received invoice metadata */
export interface SdiReceivedMetadata {
  /** When received from SDI */
  receivedAt: string;
  /** Sender's SDI identifier */
  senderId: string;
  /** Original filename */
  filename: string;
  /** File hash */
  hash: string;
}

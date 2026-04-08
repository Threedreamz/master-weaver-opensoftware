// ==================== Peppol Types ====================

/** Peppol participant identifier (e.g., "0088:1234567890123") */
export interface PeppolParticipantId {
  scheme: string; // e.g., "0088" for EAN, "9930" for DE:VAT
  value: string;
}

/** Peppol document type identifier */
export interface PeppolDocumentTypeId {
  scheme: string;
  value: string;
}

/** Peppol process identifier */
export interface PeppolProcessId {
  scheme: string;
  value: string;
}

/** Standard Peppol document types */
export const PEPPOL_DOCUMENT_TYPES = {
  INVOICE_3: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2::Invoice##urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0::2.1",
  CREDIT_NOTE_3: "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2::CreditNote##urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0::2.1",
  ORDER_3: "urn:oasis:names:specification:ubl:schema:xsd:Order-2::Order##urn:fdc:peppol.eu:2017:poacc:ordering:01:3.0::2.1",
} as const;

/** Standard Peppol process identifiers */
export const PEPPOL_PROCESSES = {
  BILLING_3: "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0",
  ORDERING_3: "urn:fdc:peppol.eu:2017:poacc:ordering:01:3.0",
} as const;

/** SMP (Service Metadata Publisher) lookup result */
export interface SmpLookupResult {
  participantId: PeppolParticipantId;
  endpoints: SmpEndpoint[];
}

export interface SmpEndpoint {
  transportProfile: string;
  endpointUrl: string;
  certificate: string;
  serviceActivationDate?: string;
  serviceExpirationDate?: string;
}

/** Document to send via Peppol */
export interface PeppolDocument {
  sender: PeppolParticipantId;
  receiver: PeppolParticipantId;
  documentType: PeppolDocumentTypeId;
  process: PeppolProcessId;
  content: string; // UBL XML content
}

/** Send result */
export interface PeppolSendResult {
  messageId: string;
  timestamp: string;
  status: "accepted" | "rejected" | "failed";
  errorMessage?: string;
}

/** Received document metadata */
export interface PeppolReceivedDocument {
  messageId: string;
  sender: PeppolParticipantId;
  receiver: PeppolParticipantId;
  documentType: string;
  timestamp: string;
  content: string;
}

/** Peppol Access Point client config */
export interface PeppolClientConfig {
  apUrl: string;
  certificate: string;
  privateKey: string;
}

import { BaseIntegrationClient } from "../../core/base-client.js";
import type { BaseClientConfig } from "../../core/types.js";
import type {
  PeppolParticipantId,
  PeppolDocument,
  PeppolSendResult,
  PeppolReceivedDocument,
  PeppolClientConfig,
  SmpLookupResult,
  SmpEndpoint,
} from "./types.js";

/** SML (Service Metadata Locator) base domains */
const SML_DOMAINS = {
  production: "edelivery.tech.ec.europa.eu",
  test: "acc.edelivery.tech.ec.europa.eu",
} as const;

export class PeppolClient extends BaseIntegrationClient {
  private certificate: string;
  private privateKey: string;
  private smlDomain: string;

  constructor(config: PeppolClientConfig & { environment?: "production" | "test" }) {
    const clientConfig: BaseClientConfig = {
      baseUrl: config.apUrl,
      authType: "custom",
      credentials: {},
      rateLimit: { requestsPerMinute: 30 },
      timeout: 60_000,
    };
    super(clientConfig);
    this.certificate = config.certificate;
    this.privateKey = config.privateKey;
    this.smlDomain = SML_DOMAINS[config.environment ?? "production"];
  }

  // ==================== SMP Lookup ====================

  /**
   * Look up a participant in the Peppol SMP to find their Access Point endpoint.
   * Uses the Peppol SML DNS-based discovery.
   */
  async lookupParticipant(
    participantId: PeppolParticipantId,
    documentTypeId?: string
  ): Promise<SmpLookupResult> {
    const smpUrl = this.buildSmpUrl(participantId);
    const path = documentTypeId
      ? `/services/${encodeURIComponent(documentTypeId)}`
      : "";

    const response = await this.get<string>(`${smpUrl}${path}`, {
      Accept: "application/xml",
    });

    return this.parseSmpResponse(participantId, response.data as unknown as string);
  }

  /**
   * Check if a participant is registered in the Peppol network.
   */
  async isParticipantRegistered(participantId: PeppolParticipantId): Promise<boolean> {
    try {
      await this.lookupParticipant(participantId);
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Send Documents ====================

  /**
   * Send a document to a Peppol participant via the Access Point.
   */
  async sendDocument(document: PeppolDocument): Promise<PeppolSendResult> {
    const response = await this.post<PeppolSendResult>("/api/v1/outbound", {
      sender: `${document.sender.scheme}::${document.sender.value}`,
      receiver: `${document.receiver.scheme}::${document.receiver.value}`,
      documentType: `${document.documentType.scheme}::${document.documentType.value}`,
      process: `${document.process.scheme}::${document.process.value}`,
      content: document.content,
    });

    return response.data;
  }

  /**
   * Send a UBL invoice via Peppol BIS Billing 3.0.
   */
  async sendInvoice(
    sender: PeppolParticipantId,
    receiver: PeppolParticipantId,
    ublXml: string
  ): Promise<PeppolSendResult> {
    return this.sendDocument({
      sender,
      receiver,
      documentType: {
        scheme: "busdox-docid-qns",
        value: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2::Invoice##urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0::2.1",
      },
      process: {
        scheme: "cenbii-procid-ubl",
        value: "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0",
      },
      content: ublXml,
    });
  }

  /**
   * Send a UBL credit note via Peppol BIS Billing 3.0.
   */
  async sendCreditNote(
    sender: PeppolParticipantId,
    receiver: PeppolParticipantId,
    ublXml: string
  ): Promise<PeppolSendResult> {
    return this.sendDocument({
      sender,
      receiver,
      documentType: {
        scheme: "busdox-docid-qns",
        value: "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2::CreditNote##urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0::2.1",
      },
      process: {
        scheme: "cenbii-procid-ubl",
        value: "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0",
      },
      content: ublXml,
    });
  }

  // ==================== Receive Documents ====================

  /**
   * Fetch received documents from the Access Point inbox.
   */
  async getReceivedDocuments(params?: {
    since?: string;
    limit?: number;
    offset?: number;
  }): Promise<PeppolReceivedDocument[]> {
    const queryParams: Record<string, string> = {};
    if (params?.since) queryParams.since = params.since;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);

    const response = await this.get<{ documents: PeppolReceivedDocument[] }>(
      "/api/v1/inbound",
      queryParams
    );

    return response.data.documents;
  }

  /**
   * Get a specific received document by message ID.
   */
  async getReceivedDocument(messageId: string): Promise<PeppolReceivedDocument> {
    const response = await this.get<PeppolReceivedDocument>(
      `/api/v1/inbound/${encodeURIComponent(messageId)}`
    );
    return response.data;
  }

  /**
   * Acknowledge receipt of a document (mark as processed).
   */
  async acknowledgeDocument(messageId: string): Promise<void> {
    await this.put(`/api/v1/inbound/${encodeURIComponent(messageId)}/acknowledge`);
  }

  // ==================== Status ====================

  /**
   * Get the status of a sent document.
   */
  async getDocumentStatus(messageId: string): Promise<PeppolSendResult> {
    const response = await this.get<PeppolSendResult>(
      `/api/v1/outbound/${encodeURIComponent(messageId)}/status`
    );
    return response.data;
  }

  /**
   * Test connection to the Access Point.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.get("/api/v1/status");
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Private Helpers ====================

  private buildSmpUrl(participantId: PeppolParticipantId): string {
    const { createHash } = require("node:crypto") as typeof import("node:crypto");
    const identifier = `${participantId.scheme}::${participantId.value}`;
    const hash = createHash("md5").update(identifier.toLowerCase()).digest("hex");
    return `http://B-${hash}.iso6523-actorid-upis.${this.smlDomain}/${participantId.scheme}::${encodeURIComponent(participantId.value)}`;
  }

  private parseSmpResponse(participantId: PeppolParticipantId, xml: string): SmpLookupResult {
    const endpoints: SmpEndpoint[] = [];

    const endpointRegex = /<Endpoint[^>]*transportProfile="([^"]*)"[^>]*>([\s\S]*?)<\/Endpoint>/g;
    let match;
    while ((match = endpointRegex.exec(xml)) !== null) {
      const block = match[2];
      const urlMatch = block.match(/<EndpointURI>([^<]*)<\/EndpointURI>/);
      const certMatch = block.match(/<Certificate>([^<]*)<\/Certificate>/);

      if (urlMatch) {
        endpoints.push({
          transportProfile: match[1],
          endpointUrl: urlMatch[1].trim(),
          certificate: certMatch?.[1]?.trim() ?? "",
        });
      }
    }

    return { participantId, endpoints };
  }
}

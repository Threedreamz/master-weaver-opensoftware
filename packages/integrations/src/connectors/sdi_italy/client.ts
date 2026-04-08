import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  SdiClientConfig,
  FatturaPAInvoice,
  SdiSubmissionResult,
  SdiNotification,
  SdiReceivedInvoice,
} from "./types.js";

const SDI_BASE_URL = "https://sdi.fatturapa.gov.it/SdIRiceviFile";
const SDI_TEST_URL = "https://testservizi.fatturapa.gov.it/SdIRiceviFile";

/**
 * SDI (Sistema di Interscambio) client for Italian e-invoicing.
 *
 * Handles submission of FatturaPA XML invoices, status checking,
 * and retrieval of received invoices via Italy's SDI system.
 *
 * Uses custom certificate authentication (client TLS certificate)
 * as required by the Italian Revenue Agency (Agenzia delle Entrate).
 */
export class SdiItalyClient extends BaseIntegrationClient {
  private readonly channelId: string;
  private readonly intermediaryVatNumber?: string;
  private readonly certificatePath: string;
  private readonly certificatePassphrase: string;

  constructor(config: SdiClientConfig) {
    const baseUrl =
      config.environment === "test" ? SDI_TEST_URL : SDI_BASE_URL;

    super({
      baseUrl,
      authType: "custom",
      credentials: {
        certificatePath: config.certificatePath,
        certificatePassphrase: config.certificatePassphrase,
      },
      timeout: config.timeout ?? 60_000,
      rateLimit: { requestsPerMinute: 30 },
      defaultHeaders: {
        "Content-Type": "application/xml",
        Accept: "application/xml",
      },
    });

    this.channelId = config.channelId;
    this.intermediaryVatNumber = config.intermediaryVatNumber;
    this.certificatePath = config.certificatePath;
    this.certificatePassphrase = config.certificatePassphrase;
  }

  // ==================== Invoice Submission ====================

  /**
   * Submit a FatturaPA XML invoice to SDI.
   *
   * The XML must be a valid FatturaPA document (FPA12 or FPR12 format).
   * The file is transmitted via SDI's SdIRiceviFile service using
   * the configured client certificate for authentication.
   */
  async submitInvoice(
    fatturaPaXml: string,
    filename: string
  ): Promise<ApiResponse<SdiSubmissionResult>> {
    const base64Content = typeof btoa === "function"
      ? btoa(fatturaPaXml)
      : Buffer.from(fatturaPaXml, "utf-8").toString("base64");

    return this.post<SdiSubmissionResult>("/v1/invoices/submit", {
      file: base64Content,
      filename,
      channelId: this.channelId,
      intermediaryVatNumber: this.intermediaryVatNumber,
    });
  }

  /**
   * Submit a pre-built FatturaPA invoice object.
   *
   * This method serializes the invoice data to FatturaPA XML
   * before submitting. For pre-built XML, use `submitInvoice` directly.
   */
  async submitInvoiceData(
    invoice: FatturaPAInvoice
  ): Promise<ApiResponse<SdiSubmissionResult>> {
    const filename = `${invoice.seller.countryCode}${invoice.seller.vatNumber ?? "00000000000"}_${invoice.invoiceNumber}.xml`;
    // Caller is expected to provide serialized XML; this is a convenience wrapper
    // that would integrate with an XML serializer in a full implementation.
    throw new IntegrationError(
      "VALIDATION_ERROR",
      "Use submitInvoice() with pre-serialized FatturaPA XML. Direct invoice object submission requires an XML serializer."
    );
  }

  // ==================== Status Checking ====================

  /**
   * Check the status and notifications for a submitted invoice.
   *
   * Returns the latest notification from SDI for the given identifier,
   * including delivery receipts, rejections, and outcome notifications.
   */
  async checkStatus(
    sdiIdentifier: string
  ): Promise<ApiResponse<SdiNotification>> {
    return this.get<SdiNotification>(
      `/v1/invoices/${sdiIdentifier}/status`
    );
  }

  /**
   * Get all notifications for a submitted invoice.
   *
   * Returns the full history of SDI notifications (RC, NS, MC, NE, etc.)
   * for the given SDI identifier.
   */
  async getNotifications(
    sdiIdentifier: string
  ): Promise<ApiResponse<SdiNotification[]>> {
    return this.get<SdiNotification[]>(
      `/v1/invoices/${sdiIdentifier}/notifications`
    );
  }

  // ==================== Receiving Invoices ====================

  /**
   * Retrieve received invoices from SDI.
   *
   * Returns invoices delivered to the configured channel,
   * optionally filtered by date range.
   */
  async receiveInvoices(params?: {
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<SdiReceivedInvoice[]>> {
    const queryParams: Record<string, string> = {};
    if (params?.dateFrom) queryParams.date_from = params.dateFrom;
    if (params?.dateTo) queryParams.date_to = params.dateTo;
    if (params?.limit != null) queryParams.limit = String(params.limit);
    if (params?.offset != null) queryParams.offset = String(params.offset);

    return this.get<SdiReceivedInvoice[]>(
      "/v1/invoices/received",
      queryParams
    );
  }

  /**
   * Get a specific received invoice by its SDI identifier.
   */
  async getReceivedInvoice(
    sdiIdentifier: string
  ): Promise<ApiResponse<SdiReceivedInvoice>> {
    return this.get<SdiReceivedInvoice>(
      `/v1/invoices/received/${sdiIdentifier}`
    );
  }

  /**
   * Acknowledge receipt of a received invoice.
   *
   * Sends an EC (Notifica esito cedente/cessionario) notification
   * back to SDI confirming or rejecting the received invoice.
   */
  async acknowledgeInvoice(
    sdiIdentifier: string,
    outcome: "accepted" | "rejected",
    rejectionReason?: string
  ): Promise<ApiResponse<SdiNotification>> {
    return this.post<SdiNotification>(
      `/v1/invoices/received/${sdiIdentifier}/acknowledge`,
      {
        outcome,
        rejectionReason,
      }
    );
  }

  // ==================== Connection Test ====================

  /** Test the connection by verifying certificate authentication with SDI. */
  async testConnection(): Promise<boolean> {
    try {
      await this.get("/v1/health");
      return true;
    } catch {
      return false;
    }
  }
}

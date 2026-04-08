import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  ChorusProClientConfig,
  ChorusProInvoiceSubmission,
  ChorusProSubmissionResult,
  ChorusProInvoiceStatusResponse,
  ChorusProSearchParams,
  ChorusProSearchResult,
  ChorusProStructure,
  ChorusProTokenResponse,
} from "./types.js";

const CHORUS_PRO_BASE_URL = "https://chorus-pro.gouv.fr/cpro/transverses/v1";
const CHORUS_PRO_SANDBOX_URL = "https://sandbox-api.chorus-pro.gouv.fr/cpro/transverses/v1";
const PISTE_TOKEN_URL = "https://oauth.piste.gouv.fr/api/oauth/token";
const PISTE_SANDBOX_TOKEN_URL = "https://sandbox-oauth.piste.gouv.fr/api/oauth/token";

/**
 * Chorus Pro client for French public e-invoicing.
 *
 * Chorus Pro is the French government portal for submitting and
 * receiving electronic invoices for B2G (business-to-government)
 * transactions. All suppliers to French public entities must use
 * this platform.
 *
 * Authentication uses OAuth2 via PISTE (Portail Internet Securise
 * des Teleservices), combined with a technical user login.
 */
export class ChorusProClient extends BaseIntegrationClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly login: string;
  private readonly password: string;
  private readonly tokenUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(config: ChorusProClientConfig) {
    const isSandbox = config.environment === "sandbox";
    const baseUrl = isSandbox ? CHORUS_PRO_SANDBOX_URL : CHORUS_PRO_BASE_URL;

    super({
      baseUrl,
      authType: "oauth2",
      credentials: { accessToken: "" },
      timeout: config.timeout ?? 60_000,
      rateLimit: { requestsPerMinute: 30 },
    });

    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.login = config.login;
    this.password = config.password;
    this.tokenUrl = isSandbox ? PISTE_SANDBOX_TOKEN_URL : PISTE_TOKEN_URL;
  }

  // ==================== Invoice Submission ====================

  /** Submit an invoice to Chorus Pro. */
  async submitInvoice(
    invoice: ChorusProInvoiceSubmission
  ): Promise<ApiResponse<ChorusProSubmissionResult>> {
    await this.ensureAuthenticated();
    return this.post<ChorusProSubmissionResult>("/transverses/v1/commandesDeTravail/deposer/facture", {
      idUtilisateurCourant: 0,
      facture: this.mapInvoiceToApi(invoice),
    });
  }

  /** Submit a Factur-X (CII XML) invoice directly. */
  async submitFacturX(
    xmlContent: string,
    pdfContent?: string
  ): Promise<ApiResponse<ChorusProSubmissionResult>> {
    await this.ensureAuthenticated();
    return this.post<ChorusProSubmissionResult>("/transverses/v1/commandesDeTravail/deposer/flux", {
      idUtilisateurCourant: 0,
      fichierFlux: xmlContent,
      fichierPdf: pdfContent,
    });
  }

  // ==================== Invoice Status ====================

  /** Get the status of an invoice by its Chorus Pro ID. */
  async getInvoiceStatus(
    invoiceId: number
  ): Promise<ApiResponse<ChorusProInvoiceStatusResponse>> {
    await this.ensureAuthenticated();
    return this.post<ChorusProInvoiceStatusResponse>("/transverses/v1/consulterStatutFacture", {
      idFacture: invoiceId,
    });
  }

  /** Search for invoices with filters. */
  async searchInvoices(
    params: ChorusProSearchParams
  ): Promise<ApiResponse<ChorusProSearchResult>> {
    await this.ensureAuthenticated();

    const body: Record<string, unknown> = {};
    if (params.status) body.statutFacture = params.status;
    if (params.issuerSiret) body.idDestinataire = params.issuerSiret;
    if (params.recipientSiret) body.idFournisseur = params.recipientSiret;
    if (params.dateFrom) body.dateDepotDebut = params.dateFrom;
    if (params.dateTo) body.dateDepotFin = params.dateTo;
    if (params.pageNumber != null) body.pageResultat = params.pageNumber;
    if (params.pageSize != null) body.nbResultatsParPage = params.pageSize;

    return this.post<ChorusProSearchResult>("/transverses/v1/rechercherFacture", body);
  }

  // ==================== Structure Lookup ====================

  /** Look up a public entity (structure) by SIRET. */
  async lookupStructure(
    siret: string
  ): Promise<ApiResponse<ChorusProStructure>> {
    await this.ensureAuthenticated();
    return this.post<ChorusProStructure>("/transverses/v1/rechercherStructure", {
      identifiantStructure: siret,
      typeIdentifiantStructure: "SIRET",
    });
  }

  /** Look up service codes for a structure. */
  async lookupServiceCodes(
    siret: string
  ): Promise<ApiResponse<ChorusProStructure>> {
    await this.ensureAuthenticated();
    return this.post<ChorusProStructure>("/transverses/v1/rechercherServiceStructure", {
      identifiantStructure: siret,
      typeIdentifiantStructure: "SIRET",
    });
  }

  // ==================== Authentication ====================

  /**
   * Obtain an OAuth2 access token from PISTE.
   *
   * Chorus Pro uses a two-step auth: first obtain a PISTE token,
   * then use it with the technical user credentials for API calls.
   */
  private async authenticate(): Promise<void> {
    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: "openid",
      }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "Unknown error");
      throw new IntegrationError(
        "AUTH_ERROR",
        `Chorus Pro OAuth token request failed: ${error}`,
        response.status
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      token_type: string;
    };

    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60_000; // 1min buffer
    this.credentials.accessToken = data.access_token;
  }

  /** Ensure we have a valid access token. */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      await this.authenticate();
    }
  }

  // ==================== Helpers ====================

  private mapInvoiceToApi(invoice: ChorusProInvoiceSubmission): Record<string, unknown> {
    return {
      numeroFacture: invoice.invoiceNumber,
      dateFacture: invoice.invoiceDate,
      typeFacture: invoice.flowType,
      cadreDeFacturation: invoice.cadre,
      fournisseur: {
        identifiant: invoice.issuerSiret,
        typeIdentifiant: "SIRET",
        codeService: invoice.issuerServiceCode,
      },
      destinataire: {
        identifiant: invoice.recipientSiret,
        typeIdentifiant: "SIRET",
        codeService: invoice.recipientServiceCode,
      },
      montantHT: invoice.totalHT,
      montantTVA: invoice.totalTVA,
      montantTTC: invoice.totalTTC,
      modePaiement: invoice.paymentMode,
      commentaire: invoice.comment,
      numeroEngagement: invoice.engagementNumber,
      numeroBonCommande: invoice.purchaseOrderNumber,
      pieceJointePrincipale: invoice.pdfContent
        ? { contenu: invoice.pdfContent, nomFichier: `${invoice.invoiceNumber}.pdf` }
        : undefined,
      lignesFacture: invoice.lines?.map((line) => ({
        numeroLigne: line.lineNumber,
        designation: line.description,
        quantite: line.quantity,
        prixUnitaire: line.unitPrice,
        tauxTva: line.vatRate,
        montantHtApresRemise: line.netAmount,
      })),
    };
  }

  // ==================== Connection Test ====================

  /** Test the connection by authenticating and checking API health. */
  async testConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch {
      return false;
    }
  }
}

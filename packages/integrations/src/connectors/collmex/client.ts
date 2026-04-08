import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  CollmexCustomer,
  CollmexInvoice,
  CollmexProduct,
  CollmexBooking,
  CollmexResponse,
  CollmexClientConfig,
} from "./types.js";

const COLLMEX_BASE_URL = "https://www.collmex.de/cgi-bin/cgi.exe";

/**
 * Collmex API client.
 *
 * German accounting/ERP platform with a CSV-based HTTP API.
 * All requests send CSV data to a single endpoint. Authentication is
 * done by prepending a LOGIN record to each request.
 *
 * Supported resources: Customers, Invoices, Products, Bookings.
 */
export class CollmexClient extends BaseIntegrationClient {
  private customerId: string;
  private username: string;
  private password: string;
  private companyNr: number;

  constructor(config: CollmexClientConfig) {
    super({
      baseUrl: COLLMEX_BASE_URL,
      authType: "custom",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
      defaultHeaders: {
        "Content-Type": "text/csv; charset=UTF-8",
      },
    });
    this.customerId = config.customerId;
    this.username = config.username;
    this.password = config.password;
    this.companyNr = config.companyNr ?? 1;
  }

  /**
   * Build CSV lines for a request, prepending the LOGIN record.
   */
  private buildCsvRequest(lines: string[]): string {
    const loginLine = this.csvLine(["LOGIN", this.username, this.password]);
    return [loginLine, ...lines].join("\n");
  }

  /**
   * Convert an array of values to a semicolon-separated CSV line.
   */
  private csvLine(values: (string | number | undefined | null)[]): string {
    return values
      .map((v) => {
        if (v == null) return "";
        const str = String(v);
        if (str.includes(";") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(";");
  }

  /**
   * Parse a Collmex CSV response into structured data.
   */
  private parseCsvResponse(csvText: string): CollmexResponse {
    const rows: Record<string, string | number>[] = [];
    const errors: string[] = [];
    const messages: string[] = [];
    let hasError = false;

    const lines = csvText.trim().split("\n");
    for (const line of lines) {
      const fields = this.parseCsvLine(line);
      if (fields.length === 0) continue;

      const recordType = fields[0];
      if (recordType === "MESSAGE") {
        const messageType = fields[1];
        const messageText = fields[3] ?? "";
        if (messageType === "E") {
          hasError = true;
          errors.push(messageText);
        } else {
          messages.push(messageText);
        }
      } else if (recordType !== "NEW_LINE_ID") {
        const row: Record<string, string | number> = { Satzart: recordType };
        for (let i = 1; i < fields.length; i++) {
          row[`field_${i}`] = fields[i];
        }
        rows.push(row);
      }
    }

    return { rows, hasError, errors, messages };
  }

  /**
   * Parse a single CSV line (semicolon-delimited, with quote escaping).
   */
  private parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ";") {
          fields.push(current);
          current = "";
        } else {
          current += char;
        }
      }
    }
    fields.push(current);
    return fields;
  }

  /**
   * Send a CSV request to Collmex and parse the response.
   */
  private async csvRequest(lines: string[]): Promise<ApiResponse<CollmexResponse>> {
    const body = this.buildCsvRequest(lines);
    const response = await this.request<string>({
      method: "POST",
      path: `/${this.customerId}`,
      body,
      headers: {
        "Content-Type": "text/csv; charset=UTF-8",
        Accept: "text/csv",
      },
    });

    // The base client will try to JSON parse, but Collmex returns CSV.
    // We handle the raw text in the parsed response.
    const parsed = this.parseCsvResponse(String(response.data));

    if (parsed.hasError) {
      throw new Error(`Collmex error: ${parsed.errors.join("; ")}`);
    }

    return {
      data: parsed,
      status: response.status,
      headers: response.headers,
    };
  }

  // ==================== Customers ====================

  /** Get customers, optionally filtered by customer number. */
  async getCustomers(
    customerNr?: number
  ): Promise<ApiResponse<CollmexResponse>> {
    const filter = ["CUSTOMER_GET", customerNr ?? "", this.companyNr];
    return this.csvRequest([this.csvLine(filter)]);
  }

  /** Create or update a customer. */
  async upsertCustomer(
    customer: CollmexCustomer
  ): Promise<ApiResponse<CollmexResponse>> {
    const line = this.csvLine([
      customer.Satzart,
      customer.Kundennummer ?? "",
      customer.Firma_Nr ?? this.companyNr,
      customer.Anrede ?? "",
      customer.Titel ?? "",
      customer.Vorname ?? "",
      customer.Name,
      customer.Firma ?? "",
      customer.Abteilung ?? "",
      customer.Strasse ?? "",
      customer.PLZ ?? "",
      customer.Ort ?? "",
      customer.Land ?? "",
      customer.Telefon ?? "",
      customer.Telefax ?? "",
      customer.EMail ?? "",
      customer.Kontonr ?? "",
      customer.BLZ ?? "",
      customer.IBAN ?? "",
      customer.BIC ?? "",
      customer.Bankname ?? "",
      customer.Steuernummer ?? "",
      customer.USt_IdNr ?? "",
      customer.Zahlungsbedingung ?? "",
      customer.Rabattgruppe ?? "",
      customer.Lieferbedingung ?? "",
      customer.Lieferbedingung_Zusatz ?? "",
      customer.Ausgabemedium ?? "",
      customer.Kontoinhaber ?? "",
      customer.Adressgruppe ?? "",
      customer.Waehrung ?? "",
      customer.Bemerkung ?? "",
      customer.Inaktiv ?? 0,
    ]);
    return this.csvRequest([line]);
  }

  // ==================== Invoices ====================

  /** Get invoices, optionally filtered. */
  async getInvoices(
    invoiceNr?: number,
    customerNr?: number,
    fromDate?: string,
    toDate?: string
  ): Promise<ApiResponse<CollmexResponse>> {
    const filter = [
      "INVOICE_GET",
      invoiceNr ?? "",
      this.companyNr,
      "", // invoice type
      customerNr ?? "",
      fromDate ?? "",
      toDate ?? "",
      "", // only changed
      "", // system name
      "", // status
      "", // output format
    ];
    return this.csvRequest([this.csvLine(filter)]);
  }

  /** Create or update an invoice (send all positions as separate lines). */
  async upsertInvoice(
    lines: CollmexInvoice[]
  ): Promise<ApiResponse<CollmexResponse>> {
    const csvLines = lines.map((inv) =>
      this.csvLine([
        inv.Satzart,
        inv.Rechnungsnummer ?? "",
        inv.Position ?? "",
        inv.Rechnungsart ?? 0,
        inv.Firma_Nr ?? this.companyNr,
        inv.Auftragsnummer ?? "",
        inv.Kundennummer,
        inv.Anrede_Rechnungsadresse ?? "",
        inv.Titel_Rechnungsadresse ?? "",
        inv.Vorname_Rechnungsadresse ?? "",
        inv.Name_Rechnungsadresse ?? "",
        inv.Firma_Rechnungsadresse ?? "",
        inv.Abteilung_Rechnungsadresse ?? "",
        inv.Strasse_Rechnungsadresse ?? "",
        inv.PLZ_Rechnungsadresse ?? "",
        inv.Ort_Rechnungsadresse ?? "",
        inv.Land_Rechnungsadresse ?? "",
        inv.Rechnungsdatum ?? "",
        inv.Preisdatum ?? "",
        inv.Zahlungsbedingung ?? "",
        inv.Waehrung ?? "EUR",
        inv.Preisgruppe ?? "",
        inv.Rabattgruppe ?? "",
        inv.Schlusstext ?? "",
        inv.Internes_Memo ?? "",
        "", // reserved
        inv.Artikelnummer ?? "",
        inv.Artikelbeschreibung ?? "",
        inv.Menge ?? "",
        inv.Mengeneinheit ?? "",
        inv.Einzelpreis ?? "",
        inv.Preismenge ?? "",
        inv.Positionsrabatt ?? "",
        inv.Positionswert ?? "",
        inv.Produktart ?? "",
        inv.Steuerklassifikation ?? "",
        inv.Steuersatz ?? "",
      ])
    );
    return this.csvRequest(csvLines);
  }

  // ==================== Products ====================

  /** Get products, optionally filtered. */
  async getProducts(
    productNr?: string
  ): Promise<ApiResponse<CollmexResponse>> {
    const filter = [
      "PRODUCT_GET",
      this.companyNr,
      productNr ?? "",
    ];
    return this.csvRequest([this.csvLine(filter)]);
  }

  /** Create or update a product. */
  async upsertProduct(
    product: CollmexProduct
  ): Promise<ApiResponse<CollmexResponse>> {
    const line = this.csvLine([
      product.Satzart,
      product.Produktnummer,
      product.Firma_Nr ?? this.companyNr,
      product.Bezeichnung,
      product.Bezeichnung_Eng ?? "",
      product.Mengeneinheit ?? "",
      product.Produktgruppe ?? "",
      product.Verkaufspreis ?? "",
      product.Einkaufspreis ?? "",
      product.Produktart ?? 0,
      product.Steuerklassifikation ?? "",
      product.Gewicht ?? "",
      product.Gewichteinheit ?? "",
      product.EAN ?? "",
      product.Bemerkung ?? "",
      product.Inaktiv ?? 0,
    ]);
    return this.csvRequest([line]);
  }

  // ==================== Bookings ====================

  /** Get bookings for a date range. */
  async getBookings(
    fromDate: string,
    toDate: string
  ): Promise<ApiResponse<CollmexResponse>> {
    const filter = [
      "ACCBAL_GET",
      this.companyNr,
      "", // fiscal year
      fromDate,
      toDate,
    ];
    return this.csvRequest([this.csvLine(filter)]);
  }

  /** Create a booking. */
  async createBooking(
    booking: CollmexBooking
  ): Promise<ApiResponse<CollmexResponse>> {
    const line = this.csvLine([
      booking.Satzart,
      booking.Belegnummer ?? "",
      booking.Position ?? "",
      booking.Firma_Nr ?? this.companyNr,
      booking.Buchungsdatum,
      booking.Belegdatum ?? "",
      booking.Konto_Soll,
      booking.Konto_Haben,
      booking.Betrag,
      booking.Waehrung ?? "EUR",
      booking.Buchungstext ?? "",
      booking.Steuersatz ?? "",
      booking.Kostenstelle ?? "",
      booking.Kundennummer ?? "",
      booking.Lieferantennummer ?? "",
      booking.Belegnummer_Extern ?? "",
      booking.Systemname ?? "",
    ]);
    return this.csvRequest([line]);
  }
}

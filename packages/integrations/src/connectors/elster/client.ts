// ==================== ELSTER (ERiC) Client ====================
// TypeScript interface layer for the ELSTER ERiC library.
// Actual XML construction and ERiC FFI calls are abstracted here.
// The ERiC library handles certificate auth, XML signing, and transport.

import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type {
  ElsterCertificateConfig,
  ElsterDeclarationType,
  ElsterFilingPeriod,
  ElsterValidationResult,
  ElsterValidationError,
  ElsterValidationWarning,
  ElsterSubmissionResult,
  ElsterTransferTicket,
  ElsterProtocolEntry,
  ElsterProtocolQuery,
  ElsterSubmitOptions,
  UStVAData,
  ZMData,
  ZMEntry,
} from "./types.js";

// ==================== XML Builders ====================

/** Kennzahl mapping for USt-VA fields */
const USTVA_FIELD_MAP: Record<string, string> = {
  taxExemptRevenue: "43",
  taxableRevenue19: "81",
  taxableRevenue7: "86",
  intraCommunitySupplies: "41",
  inputTax: "66",
  outputTax19: "Kz81-USt",
  outputTax7: "Kz86-USt",
  vatPayable: "83",
  deductibleInputTax: "67",
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

function buildUStVAXml(data: UStVAData): string {
  const periodTag = data.period.periodType === "monthly"
    ? `<Zeitraum>${String(data.period.period ?? 1).padStart(2, "0")}/${data.period.year}</Zeitraum>`
    : `<Zeitraum>Q${data.period.period ?? 1}/${data.period.year}</Zeitraum>`;

  const fields: string[] = [];

  const addField = (kz: string, value: number): void => {
    if (value !== 0) {
      fields.push(`      <Kz${kz}>${formatAmount(value)}</Kz${kz}>`);
    }
  };

  addField("43", data.taxExemptRevenue);
  addField("81", data.taxableRevenue19);
  addField("86", data.taxableRevenue7);
  addField("41", data.intraCommunitySupplies);
  addField("66", data.inputTax);
  addField("83", data.vatPayable);
  addField("67", data.deductibleInputTax);

  if (data.additionalFields) {
    for (const [kz, value] of Object.entries(data.additionalFields)) {
      addField(kz, value);
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Elster xmlns="http://www.elster.de/elsterxml/schema/v11">',
    "  <TransferHeader>",
    "    <Verfahren>ElsterAnmeldung</Verfahren>",
    "    <DatenArt>UStVA</DatenArt>",
    "    <Vorgang>send-NoSig</Vorgang>",
    "  </TransferHeader>",
    "  <DatenTeil>",
    "    <Nutzdatenblock>",
    "      <NutzdatenHeader>",
    `        <Steuernummer>${escapeXml(data.taxNumber)}</Steuernummer>`,
    `        ${periodTag}`,
    "      </NutzdatenHeader>",
    "      <Nutzdaten>",
    ...fields,
    "      </Nutzdaten>",
    "    </Nutzdatenblock>",
    "  </DatenTeil>",
    "</Elster>",
  ].join("\n");
}

function buildZMXml(data: ZMData): string {
  const entryXml = data.entries.map((entry: ZMEntry) => [
    "        <ZM-Eintrag>",
    `          <USt-IdNr>${escapeXml(entry.recipientVatId)}</USt-IdNr>`,
    `          <Laendercode>${escapeXml(entry.countryCode)}</Laendercode>`,
    `          <Betrag>${formatAmount(entry.amountInCents)}</Betrag>`,
    `          <Art>${entry.supplyType === "goods" ? "L" : entry.supplyType === "services" ? "S" : "D"}</Art>`,
    "        </ZM-Eintrag>",
  ].join("\n")).join("\n");

  const periodTag = data.period.periodType === "monthly"
    ? `<Zeitraum>${String(data.period.period ?? 1).padStart(2, "0")}/${data.period.year}</Zeitraum>`
    : `<Zeitraum>Q${data.period.period ?? 1}/${data.period.year}</Zeitraum>`;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Elster xmlns="http://www.elster.de/elsterxml/schema/v11">',
    "  <TransferHeader>",
    "    <Verfahren>ElsterAnmeldung</Verfahren>",
    "    <DatenArt>ZM</DatenArt>",
    "    <Vorgang>send-NoSig</Vorgang>",
    "  </TransferHeader>",
    "  <DatenTeil>",
    "    <Nutzdatenblock>",
    "      <NutzdatenHeader>",
    `        <USt-IdNr>${escapeXml(data.vatId)}</USt-IdNr>`,
    `        ${periodTag}`,
    "      </NutzdatenHeader>",
    "      <Nutzdaten>",
    entryXml,
    "      </Nutzdaten>",
    "    </Nutzdatenblock>",
    "  </DatenTeil>",
    "</Elster>",
  ].join("\n");
}

// ==================== XML Parsers ====================

function parseValidationResponse(xml: string): ElsterValidationResult {
  const errors: ElsterValidationError[] = [];
  const warnings: ElsterValidationWarning[] = [];

  const errorMatches = xml.matchAll(
    /<Fehler>\s*<Code>(\d+)<\/Code>\s*<Meldung>(.*?)<\/Meldung>(?:\s*<Kennzahl>(.*?)<\/Kennzahl>)?\s*<\/Fehler>/gs
  );
  for (const match of errorMatches) {
    errors.push({
      code: parseInt(match[1]!, 10),
      message: match[2]!,
      fieldReference: match[3] ?? undefined,
    });
  }

  const warningMatches = xml.matchAll(
    /<Hinweis>\s*<Code>(\d+)<\/Code>\s*<Meldung>(.*?)<\/Meldung>(?:\s*<Kennzahl>(.*?)<\/Kennzahl>)?\s*<\/Hinweis>/gs
  );
  for (const match of warningMatches) {
    warnings.push({
      code: parseInt(match[1]!, 10),
      message: match[2]!,
      fieldReference: match[3] ?? undefined,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    validatedXml: errors.length === 0 ? xml : undefined,
  };
}

function parseTransferTicket(xml: string): ElsterTransferTicket | undefined {
  const ticketMatch = xml.match(/<TransferTicket>(.*?)<\/TransferTicket>/s);
  const taxOfficeMatch = xml.match(/<Finanzamt>(.*?)<\/Finanzamt>/s);
  const taxNumberMatch = xml.match(/<Steuernummer>(.*?)<\/Steuernummer>/s);

  if (!ticketMatch?.[1]) return undefined;

  return {
    ticketNumber: ticketMatch[1].trim(),
    submittedAt: new Date().toISOString(),
    taxOfficeNumber: taxOfficeMatch?.[1]?.trim() ?? "",
    taxNumber: taxNumberMatch?.[1]?.trim() ?? "",
  };
}

function parseProtocolEntries(xml: string): ElsterProtocolEntry[] {
  const entries: ElsterProtocolEntry[] = [];
  const entryMatches = xml.matchAll(
    /<Protokolleintrag>(.*?)<\/Protokolleintrag>/gs
  );

  for (const match of entryMatches) {
    const block = match[1]!;
    const ticket = block.match(/<TransferTicket>(.*?)<\/TransferTicket>/)?.[1] ?? "";
    const datenArt = block.match(/<DatenArt>(.*?)<\/DatenArt>/)?.[1] ?? "";
    const zeitraum = block.match(/<Zeitraum>(.*?)<\/Zeitraum>/)?.[1] ?? "";
    const status = block.match(/<Status>(.*?)<\/Status>/)?.[1] ?? "";
    const timestamp = block.match(/<Zeitstempel>(.*?)<\/Zeitstempel>/)?.[1] ?? "";

    const periodParts = zeitraum.split("/");
    const year = parseInt(periodParts[1] ?? periodParts[0] ?? "0", 10);
    const periodValue = parseInt(periodParts[0]?.replace("Q", "") ?? "0", 10);
    const isQuarterly = zeitraum.startsWith("Q");

    entries.push({
      ticketNumber: ticket,
      declarationType: datenArt as ElsterDeclarationType,
      period: {
        year,
        period: periodValue || undefined,
        periodType: isQuarterly ? "quarterly" : zeitraum.includes("/") ? "monthly" : "annual",
      },
      submittedAt: timestamp,
      status: mapElsterStatus(status),
      responseXml: block,
    });
  }

  return entries;
}

function mapElsterStatus(raw: string): ElsterProtocolEntry["status"] {
  const normalized = raw.toLowerCase().trim();
  const statusMap: Record<string, ElsterProtocolEntry["status"]> = {
    angenommen: "accepted",
    abgelehnt: "rejected",
    verarbeitet: "accepted",
    fehler: "error",
    gesendet: "submitted",
  };
  return statusMap[normalized] ?? "submitted";
}

// ==================== ELSTER Client ====================

/**
 * ElsterClient provides a TypeScript interface to the German ELSTER tax system.
 *
 * Actual communication goes through the ERiC (ELSTER Rich Client) library.
 * This client builds the XML payloads, delegates to ERiC for signing/transport,
 * and parses the responses.
 *
 * The BaseIntegrationClient is extended for any HTTP-based status checks,
 * but the primary submit/validate flows use the ERiC callback mechanism.
 */
export class ElsterClient extends BaseIntegrationClient {
  private readonly certificatePath: string;
  private readonly certificatePin: string;
  private readonly ericLibraryPath: string | undefined;
  private readonly isTestMode: boolean;

  /** Callback for ERiC library XML validation. Must be injected by the host application. */
  private ericValidateCallback:
    | ((xml: string, declarationType: string, certPath: string, certPin: string) => Promise<string>)
    | undefined;

  /** Callback for ERiC library XML submission. Must be injected by the host application. */
  private ericSubmitCallback:
    | ((xml: string, declarationType: string, certPath: string, certPin: string, testMode: boolean) => Promise<string>)
    | undefined;

  /** Callback for ERiC library protocol fetch. Must be injected by the host application. */
  private ericProtocolCallback:
    | ((certPath: string, certPin: string, query: ElsterProtocolQuery) => Promise<string>)
    | undefined;

  constructor(config: ElsterCertificateConfig) {
    const baseUrl = config.testMode
      ? "https://erika.tes.elster.de"
      : "https://www.elster.de/elsterweb/softwarehersteller";

    super({
      baseUrl,
      authType: "custom",
      credentials: {
        certificatePath: config.certificatePath,
        certificatePin: config.certificatePin,
      },
      rateLimit: { requestsPerMinute: 10 },
      timeout: 120_000, // Tax submissions can be slow
    });

    this.certificatePath = config.certificatePath;
    this.certificatePin = config.certificatePin;
    this.ericLibraryPath = config.ericLibraryPath;
    this.isTestMode = config.testMode ?? false;
  }

  // ==================== ERiC Callback Registration ====================

  /**
   * Register the ERiC validation callback.
   * The host application must provide this to bridge to the native ERiC library.
   * The callback receives XML, declaration type, cert path, cert PIN and returns response XML.
   */
  registerValidateCallback(
    callback: (xml: string, declarationType: string, certPath: string, certPin: string) => Promise<string>
  ): void {
    this.ericValidateCallback = callback;
  }

  /**
   * Register the ERiC submission callback.
   * The callback receives XML, declaration type, cert path, cert PIN, test flag and returns response XML.
   */
  registerSubmitCallback(
    callback: (xml: string, declarationType: string, certPath: string, certPin: string, testMode: boolean) => Promise<string>
  ): void {
    this.ericSubmitCallback = callback;
  }

  /**
   * Register the ERiC protocol fetch callback.
   * The callback receives cert path, cert PIN, and query options, returning protocol XML.
   */
  registerProtocolCallback(
    callback: (certPath: string, certPin: string, query: ElsterProtocolQuery) => Promise<string>
  ): void {
    this.ericProtocolCallback = callback;
  }

  // ==================== USt-VA (VAT Advance Return) ====================

  /**
   * Build the XML for a USt-VA (Umsatzsteuervoranmeldung).
   * Returns the raw XML string for inspection or manual submission.
   */
  buildUStVAXml(data: UStVAData): string {
    return buildUStVAXml(data);
  }

  /**
   * Validate a USt-VA declaration via the ERiC library.
   * This checks the XML structure and content without submitting.
   */
  async validateUStVA(data: UStVAData): Promise<ElsterValidationResult> {
    const xml = buildUStVAXml(data);
    return this.validateDeclaration("UStVA", xml);
  }

  /**
   * Submit a USt-VA declaration to the Finanzamt.
   * Validates first, then submits if valid.
   */
  async submitUStVA(data: UStVAData, testSubmission = false): Promise<ElsterSubmissionResult> {
    const xml = buildUStVAXml(data);
    return this.submitDeclaration({
      declarationType: "UStVA",
      xmlContent: xml,
      testSubmission,
    });
  }

  // ==================== ZM (Zusammenfassende Meldung) ====================

  /**
   * Build the XML for a Zusammenfassende Meldung (EC Sales List).
   */
  buildZMXml(data: ZMData): string {
    return buildZMXml(data);
  }

  /**
   * Validate a ZM declaration via the ERiC library.
   */
  async validateZM(data: ZMData): Promise<ElsterValidationResult> {
    const xml = buildZMXml(data);
    return this.validateDeclaration("ZM", xml);
  }

  /**
   * Submit a ZM declaration.
   */
  async submitZM(data: ZMData, testSubmission = false): Promise<ElsterSubmissionResult> {
    const xml = buildZMXml(data);
    return this.submitDeclaration({
      declarationType: "ZM",
      xmlContent: xml,
      testSubmission,
    });
  }

  // ==================== Generic Declaration Operations ====================

  /**
   * Validate any ELSTER declaration XML via the ERiC library.
   */
  async validateDeclaration(
    declarationType: ElsterDeclarationType,
    xml: string
  ): Promise<ElsterValidationResult> {
    if (!this.ericValidateCallback) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        "ERiC validate callback not registered. Call registerValidateCallback() first."
      );
    }

    const responseXml = await this.ericValidateCallback(
      xml,
      declarationType,
      this.certificatePath,
      this.certificatePin
    );

    return parseValidationResponse(responseXml);
  }

  /**
   * Submit a declaration to ELSTER via the ERiC library.
   * Validates first, then submits if valid.
   */
  async submitDeclaration(options: ElsterSubmitOptions): Promise<ElsterSubmissionResult> {
    if (!this.ericSubmitCallback) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        "ERiC submit callback not registered. Call registerSubmitCallback() first."
      );
    }

    // Validate first
    const validation = await this.validateDeclaration(
      options.declarationType,
      options.xmlContent
    );

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    const responseXml = await this.ericSubmitCallback(
      options.xmlContent,
      options.declarationType,
      this.certificatePath,
      this.certificatePin,
      options.testSubmission ?? this.isTestMode
    );

    const transferTicket = parseTransferTicket(responseXml);

    if (transferTicket) {
      return {
        success: true,
        transferTicket,
        serverResponse: responseXml,
      };
    }

    // Parse errors from response
    const errorResult = parseValidationResponse(responseXml);
    return {
      success: false,
      serverResponse: responseXml,
      errors: errorResult.errors.length > 0
        ? errorResult.errors
        : [{ code: 0, message: "Submission failed without specific error details" }],
    };
  }

  // ==================== Protocol / Status ====================

  /**
   * Fetch submission protocol entries from ELSTER.
   */
  async getProtocol(query: ElsterProtocolQuery = {}): Promise<ElsterProtocolEntry[]> {
    if (!this.ericProtocolCallback) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        "ERiC protocol callback not registered. Call registerProtocolCallback() first."
      );
    }

    const responseXml = await this.ericProtocolCallback(
      this.certificatePath,
      this.certificatePin,
      query
    );

    return parseProtocolEntries(responseXml);
  }

  /**
   * Test the connection by verifying certificate validity.
   * Attempts an ERiC validation with a minimal test XML.
   */
  async testConnection(): Promise<boolean> {
    if (!this.ericValidateCallback) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        "ERiC validate callback not registered. Cannot test connection."
      );
    }

    const testXml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Elster xmlns="http://www.elster.de/elsterxml/schema/v11">',
      "  <TransferHeader>",
      "    <Verfahren>ElsterAnmeldung</Verfahren>",
      "    <DatenArt>UStVA</DatenArt>",
      "    <Vorgang>send-NoSig</Vorgang>",
      "    <Testmerker>700000004</Testmerker>",
      "  </TransferHeader>",
      "  <DatenTeil/>",
      "</Elster>",
    ].join("\n");

    try {
      await this.ericValidateCallback(
        testXml,
        "UStVA",
        this.certificatePath,
        this.certificatePin
      );
      return true;
    } catch {
      return false;
    }
  }
}

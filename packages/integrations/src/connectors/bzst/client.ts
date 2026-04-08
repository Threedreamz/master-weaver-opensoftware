// ==================== BZSt (Bundeszentralamt fuer Steuern) Client ====================
// TypeScript interface for BZSt operations:
// - USt-IdNr validation (qualifizierte Bestaetigung)
// - Zusammenfassende Meldung (ZM) submission
// Uses certificate-based auth via the ERiC library (same as ELSTER).

import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type {
  BZStCertificateConfig,
  UStIdValidationRequest,
  UStIdValidationResult,
  BZStMatchResult,
  BZStZMSubmission,
  BZStZMEntry,
  BZStSubmissionResult,
  BZStSubmissionStatus,
  BZStError,
} from "./types.js";

// ==================== XML Builders ====================

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

function buildUStIdValidationXml(request: UStIdValidationRequest): string {
  const qualifiedFields: string[] = [];
  if (request.companyName) {
    qualifiedFields.push(`    <Firmenname>${escapeXml(request.companyName)}</Firmenname>`);
  }
  if (request.city) {
    qualifiedFields.push(`    <Ort>${escapeXml(request.city)}</Ort>`);
  }
  if (request.postalCode) {
    qualifiedFields.push(`    <PLZ>${escapeXml(request.postalCode)}</PLZ>`);
  }
  if (request.street) {
    qualifiedFields.push(`    <Strasse>${escapeXml(request.street)}</Strasse>`);
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<UStIdAbfrage>",
    `  <UStId_1>${escapeXml(request.ownUstIdNr)}</UStId_1>`,
    `  <UStId_2>${escapeXml(request.ustIdNr)}</UStId_2>`,
    ...(qualifiedFields.length > 0
      ? ["  <Qualifiziert>", ...qualifiedFields, "  </Qualifiziert>"]
      : []),
    `  <Druckbestaetigung>${request.printConfirmation ? "ja" : "nein"}</Druckbestaetigung>`,
    "</UStIdAbfrage>",
  ].join("\n");
}

function buildZMXml(submission: BZStZMSubmission): string {
  const periodTag = submission.period.month
    ? `<Meldezeitraum><Jahr>${submission.period.year}</Jahr><Monat>${String(submission.period.month).padStart(2, "0")}</Monat></Meldezeitraum>`
    : `<Meldezeitraum><Jahr>${submission.period.year}</Jahr><Quartal>${submission.period.quarter ?? 1}</Quartal></Meldezeitraum>`;

  const transactionTypeMap: Record<string, string> = {
    intra_community_supply: "L",
    intra_community_service: "S",
    triangular_transaction: "D",
    supply_installed_goods: "E",
  };

  const entriesXml = submission.entries.map((entry: BZStZMEntry) => [
    "      <ZM-Eintrag>",
    `        <USt-IdNr>${escapeXml(entry.recipientUstIdNr)}</USt-IdNr>`,
    `        <Betrag>${formatAmount(entry.amountInCents)}</Betrag>`,
    `        <Art>${transactionTypeMap[entry.transactionType] ?? "L"}</Art>`,
    "      </ZM-Eintrag>",
  ].join("\n")).join("\n");

  const correctionTag = submission.isCorrection
    ? `    <Berichtigung>ja</Berichtigung>\n    <Bezug>${escapeXml(submission.originalReference ?? "")}</Bezug>`
    : "";

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ZusammenfassendeMeldung xmlns="urn:bzst:zm:v1">',
    "  <Kopf>",
    `    <USt-IdNr>${escapeXml(submission.reporterUstIdNr)}</USt-IdNr>`,
    `    ${periodTag}`,
    correctionTag,
    "  </Kopf>",
    "  <Daten>",
    entriesXml,
    "  </Daten>",
    "</ZusammenfassendeMeldung>",
  ].filter(Boolean).join("\n");
}

// ==================== XML Parsers ====================

function parseMatchResult(value: string | undefined): BZStMatchResult {
  if (!value) return "not_requested";
  const normalized = value.trim().toUpperCase();
  const map: Record<string, BZStMatchResult> = {
    A: "match",
    B: "no_match",
    C: "not_requested",
    D: "not_available",
  };
  return map[normalized] ?? "not_available";
}

function parseUStIdValidationResponse(xml: string): UStIdValidationResult {
  const getTag = (tag: string): string | undefined => {
    const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`, "s"));
    return match?.[1]?.trim();
  };

  const errorCode = getTag("ErrorCode") ?? getTag("Fehlercode");
  const isValid = errorCode === "200" || errorCode === undefined;

  return {
    valid: isValid,
    ustIdNr: getTag("UStId_2") ?? "",
    nameMatch: parseMatchResult(getTag("Erg_Name")),
    cityMatch: parseMatchResult(getTag("Erg_Ort")),
    postalCodeMatch: parseMatchResult(getTag("Erg_PLZ")),
    streetMatch: parseMatchResult(getTag("Erg_Str")),
    validationDate: getTag("Datum") ?? new Date().toISOString().split("T")[0]!,
    errorCode: isValid ? undefined : errorCode,
    errorMessage: isValid ? undefined : getTag("ErrorMessage") ?? getTag("Fehlermeldung"),
    requestId: getTag("RequestId") ?? getTag("AnfrageId"),
  };
}

function parseZMSubmissionResponse(xml: string): BZStSubmissionResult {
  const getTag = (tag: string): string | undefined => {
    const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`, "s"));
    return match?.[1]?.trim();
  };

  const errors: BZStError[] = [];
  const errorMatches = xml.matchAll(
    /<Fehler>\s*<Code>(.*?)<\/Code>\s*<Meldung>(.*?)<\/Meldung>(?:\s*<Feld>(.*?)<\/Feld>)?\s*<\/Fehler>/gs
  );
  for (const match of errorMatches) {
    errors.push({
      code: match[1]!,
      message: match[2]!,
      field: match[3] ?? undefined,
    });
  }

  const warnings: string[] = [];
  const warningMatches = xml.matchAll(/<Hinweis>(.*?)<\/Hinweis>/gs);
  for (const match of warningMatches) {
    warnings.push(match[1]!);
  }

  const referenceNumber = getTag("Referenznummer") ?? getTag("TransferTicket");
  const success = errors.length === 0 && referenceNumber !== undefined;

  return {
    success,
    referenceNumber,
    acceptedAt: success ? new Date().toISOString() : undefined,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function parseSubmissionStatusResponse(xml: string): BZStSubmissionStatus {
  const getTag = (tag: string): string | undefined => {
    const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`, "s"));
    return match?.[1]?.trim();
  };

  const statusRaw = getTag("Status") ?? "pending";
  const statusMap: Record<string, BZStSubmissionStatus["status"]> = {
    wartend: "pending",
    verarbeitung: "processing",
    angenommen: "accepted",
    abgelehnt: "rejected",
    fehler: "error",
  };

  return {
    referenceNumber: getTag("Referenznummer") ?? "",
    status: statusMap[statusRaw.toLowerCase()] ?? "pending",
    details: getTag("Details"),
    updatedAt: getTag("Zeitstempel") ?? new Date().toISOString(),
  };
}

// ==================== BZSt Client ====================

/**
 * BZStClient provides a TypeScript interface to the Bundeszentralamt fuer Steuern.
 *
 * Supports:
 * - USt-IdNr validation (einfache and qualifizierte Bestaetigung)
 * - Zusammenfassende Meldung (ZM / EC Sales List) submission
 *
 * Certificate-based operations delegate to the ERiC library via callbacks.
 */
export class BZStClient extends BaseIntegrationClient {
  private readonly certificatePath: string;
  private readonly certificatePin: string;
  private readonly customerNumber: string;
  private readonly isTestMode: boolean;

  /** Callback for USt-IdNr validation via ERiC */
  private ericUStIdValidateCallback:
    | ((xml: string, certPath: string, certPin: string) => Promise<string>)
    | undefined;

  /** Callback for ZM submission via ERiC */
  private ericZMSubmitCallback:
    | ((xml: string, certPath: string, certPin: string, testMode: boolean) => Promise<string>)
    | undefined;

  /** Callback for ZM status query via ERiC */
  private ericZMStatusCallback:
    | ((referenceNumber: string, certPath: string, certPin: string) => Promise<string>)
    | undefined;

  constructor(config: BZStCertificateConfig) {
    const baseUrl = config.testMode
      ? "https://erika.tes.elster.de"
      : "https://www.bzst.de/SiteGlobals/Functions";

    super({
      baseUrl,
      authType: "custom",
      credentials: {
        certificatePath: config.certificatePath,
        certificatePin: config.certificatePin,
        customerNumber: config.customerNumber,
      },
      rateLimit: { requestsPerMinute: 10 },
      timeout: 60_000,
    });

    this.certificatePath = config.certificatePath;
    this.certificatePin = config.certificatePin;
    this.customerNumber = config.customerNumber;
    this.isTestMode = config.testMode ?? false;
  }

  // ==================== ERiC Callback Registration ====================

  /**
   * Register the ERiC callback for USt-IdNr validation.
   * The callback receives validation XML, cert path, cert PIN and returns response XML.
   */
  registerUStIdValidateCallback(
    callback: (xml: string, certPath: string, certPin: string) => Promise<string>
  ): void {
    this.ericUStIdValidateCallback = callback;
  }

  /**
   * Register the ERiC callback for ZM submission.
   * The callback receives ZM XML, cert path, cert PIN, test flag and returns response XML.
   */
  registerZMSubmitCallback(
    callback: (xml: string, certPath: string, certPin: string, testMode: boolean) => Promise<string>
  ): void {
    this.ericZMSubmitCallback = callback;
  }

  /**
   * Register the ERiC callback for ZM status queries.
   * The callback receives reference number, cert path, cert PIN and returns status XML.
   */
  registerZMStatusCallback(
    callback: (referenceNumber: string, certPath: string, certPin: string) => Promise<string>
  ): void {
    this.ericZMStatusCallback = callback;
  }

  // ==================== USt-IdNr Validation ====================

  /**
   * Validate a foreign USt-IdNr (einfache Bestaetigung).
   * Only checks whether the VAT ID is valid; does not verify company details.
   */
  async validateUStIdSimple(
    ustIdNr: string,
    ownUstIdNr: string
  ): Promise<UStIdValidationResult> {
    return this.validateUStId({
      ustIdNr,
      ownUstIdNr,
    });
  }

  /**
   * Validate a foreign USt-IdNr with company details (qualifizierte Bestaetigung).
   * Checks the VAT ID and verifies the company name, city, postal code, and street.
   */
  async validateUStIdQualified(
    request: UStIdValidationRequest
  ): Promise<UStIdValidationResult> {
    if (!request.companyName && !request.city && !request.postalCode && !request.street) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        "Qualified validation requires at least one of: companyName, city, postalCode, street"
      );
    }
    return this.validateUStId(request);
  }

  /**
   * Core USt-IdNr validation logic.
   */
  private async validateUStId(
    request: UStIdValidationRequest
  ): Promise<UStIdValidationResult> {
    if (!this.ericUStIdValidateCallback) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        "ERiC USt-IdNr validate callback not registered. Call registerUStIdValidateCallback() first."
      );
    }

    const normalizedUstId = request.ustIdNr.replace(/\s/g, "").toUpperCase();
    if (!/^[A-Z]{2}[A-Z0-9]{2,12}$/.test(normalizedUstId)) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        `Invalid USt-IdNr format: ${request.ustIdNr}. Expected format: CC followed by 2-12 alphanumeric characters.`
      );
    }

    const xml = buildUStIdValidationXml({
      ...request,
      ustIdNr: normalizedUstId,
    });

    const responseXml = await this.ericUStIdValidateCallback(
      xml,
      this.certificatePath,
      this.certificatePin
    );

    return parseUStIdValidationResponse(responseXml);
  }

  // ==================== Zusammenfassende Meldung (ZM) ====================

  /**
   * Build the XML for a Zusammenfassende Meldung submission.
   */
  buildZMXml(submission: BZStZMSubmission): string {
    return buildZMXml(submission);
  }

  /**
   * Submit a Zusammenfassende Meldung to BZSt.
   * Validates entry data before submission.
   */
  async submitZM(
    submission: BZStZMSubmission,
    testSubmission = false
  ): Promise<BZStSubmissionResult> {
    if (!this.ericZMSubmitCallback) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        "ERiC ZM submit callback not registered. Call registerZMSubmitCallback() first."
      );
    }

    // Validate entries
    for (const entry of submission.entries) {
      const normalized = entry.recipientUstIdNr.replace(/\s/g, "").toUpperCase();
      if (!/^[A-Z]{2}[A-Z0-9]{2,12}$/.test(normalized)) {
        throw new IntegrationError(
          "VALIDATION_ERROR",
          `Invalid recipient USt-IdNr: ${entry.recipientUstIdNr}`
        );
      }
      if (entry.amountInCents < 0) {
        throw new IntegrationError(
          "VALIDATION_ERROR",
          `Negative amount not allowed for recipient ${entry.recipientUstIdNr}`
        );
      }
    }

    if (submission.entries.length === 0) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        "ZM submission must contain at least one entry"
      );
    }

    const xml = buildZMXml(submission);

    const responseXml = await this.ericZMSubmitCallback(
      xml,
      this.certificatePath,
      this.certificatePin,
      testSubmission ?? this.isTestMode
    );

    return parseZMSubmissionResponse(responseXml);
  }

  /**
   * Check the status of a previously submitted ZM.
   */
  async getZMStatus(referenceNumber: string): Promise<BZStSubmissionStatus> {
    if (!this.ericZMStatusCallback) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        "ERiC ZM status callback not registered. Call registerZMStatusCallback() first."
      );
    }

    const responseXml = await this.ericZMStatusCallback(
      referenceNumber,
      this.certificatePath,
      this.certificatePin
    );

    return parseSubmissionStatusResponse(responseXml);
  }

  /**
   * Test the connection by verifying certificate validity.
   */
  async testConnection(): Promise<boolean> {
    if (!this.ericUStIdValidateCallback) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        "ERiC callback not registered. Cannot test connection."
      );
    }

    // Use a known-valid German USt-IdNr format for a simple test
    const testXml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<UStIdAbfrage>",
      "  <UStId_1>DE000000000</UStId_1>",
      "  <UStId_2>DE000000000</UStId_2>",
      "  <Druckbestaetigung>nein</Druckbestaetigung>",
      "</UStIdAbfrage>",
    ].join("\n");

    try {
      await this.ericUStIdValidateCallback(
        testXml,
        this.certificatePath,
        this.certificatePin
      );
      return true;
    } catch {
      return false;
    }
  }
}

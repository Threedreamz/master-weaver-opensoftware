import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  SVMeldeportalConfig,
  DEUEVAnmeldung,
  DEUEVAbmeldung,
  DEUEVJahresmeldung,
  DEUEVSofortmeldung,
  DEUEVDatenaustauschBatch,
  DEUEVDatenaustauschStatus,
  SVMeldungErgebnis,
  SVMeldungFehler,
  SVMeldungAbfrage,
  Beitragsgruppenschluessel,
} from "./types.js";

const SV_MELDE_BASE_URL = "https://www.sv-meldeportal.de/api";
const SV_MELDE_TEST_URL = "https://test.sv-meldeportal.de/api";

// ==================== XML Builders ====================

function buildDEUEVHeader(
  absender: string,
  empfaenger: string,
  erstellungsdatum: string,
  dateinummer: number
): string {
  return `<VOSZ>
    <VFMM>DEUEV</VFMM>
    <BBNRAB>${escapeXml(absender)}</BBNRAB>
    <BBNREP>${escapeXml(empfaenger)}</BBNREP>
    <ED>${escapeXml(erstellungsdatum)}</ED>
    <DTEFNR>${String(dateinummer).padStart(6, "0")}</DTEFNR>
  </VOSZ>`;
}

function buildBeitragsgruppe(bg: Beitragsgruppenschluessel): string {
  return `${bg.krankenversicherung}${bg.rentenversicherung}${bg.arbeitslosenversicherung}${bg.pflegeversicherung}`;
}

function buildAnmeldungXml(meldung: DEUEVAnmeldung): string {
  return `<DSME>
    <KENNZDS>DEUEV</KENNZDS>
    <MMME>DSME</MMME>
    <GD>${escapeXml(meldung.meldegrund)}</GD>
    <BBNRAG>${escapeXml(meldung.betriebsnummerArbeitgeber)}</BBNRAG>
    <BBNRKK>${escapeXml(meldung.betriebsnummerEinzugsstelle)}</BBNRKK>
    <VSNR>${escapeXml(meldung.versicherungsnummer)}</VSNR>
    <NAME>${escapeXml(meldung.familienname)}</NAME>
    <VNAME>${escapeXml(meldung.vorname)}</VNAME>
    <GBDT>${escapeXml(meldung.geburtsdatum)}</GBDT>
    <GE>${escapeXml(meldung.geschlecht)}</GE>
    <PERSGR>${escapeXml(meldung.personengruppe)}</PERSGR>
    <BYGRSC>${buildBeitragsgruppe(meldung.beitragsgruppenschluessel)}</BYGRSC>
    <TTSC>${escapeXml(meldung.taetigkeitsschluessel)}</TTSC>
    <STAAT>${escapeXml(meldung.staatsangehoerigkeit)}</STAAT>
    <BEBG>${escapeXml(meldung.beschaeftigungsbeginn)}</BEBG>
    ${meldung.betriebsnummerVorigerArbeitgeber ? `<BBNRAGVOR>${escapeXml(meldung.betriebsnummerVorigerArbeitgeber)}</BBNRAGVOR>` : ""}
    ${meldung.strasse ? `<STR>${escapeXml(meldung.strasse)}</STR>` : ""}
    ${meldung.hausnummer ? `<HNR>${escapeXml(meldung.hausnummer)}</HNR>` : ""}
    ${meldung.postleitzahl ? `<PLZ>${escapeXml(meldung.postleitzahl)}</PLZ>` : ""}
    ${meldung.ort ? `<ORT>${escapeXml(meldung.ort)}</ORT>` : ""}
    ${meldung.aktenzeichen ? `<AZ>${escapeXml(meldung.aktenzeichen)}</AZ>` : ""}
  </DSME>`;
}

function buildAbmeldungXml(meldung: DEUEVAbmeldung): string {
  return `<DSME>
    <KENNZDS>DEUEV</KENNZDS>
    <MMME>DSME</MMME>
    <GD>${escapeXml(meldung.meldegrund)}</GD>
    <BBNRAG>${escapeXml(meldung.betriebsnummerArbeitgeber)}</BBNRAG>
    <BBNRKK>${escapeXml(meldung.betriebsnummerEinzugsstelle)}</BBNRKK>
    <VSNR>${escapeXml(meldung.versicherungsnummer)}</VSNR>
    <NAME>${escapeXml(meldung.familienname)}</NAME>
    <VNAME>${escapeXml(meldung.vorname)}</VNAME>
    <GBDT>${escapeXml(meldung.geburtsdatum)}</GBDT>
    <GE>${escapeXml(meldung.geschlecht)}</GE>
    <PERSGR>${escapeXml(meldung.personengruppe)}</PERSGR>
    <BYGRSC>${buildBeitragsgruppe(meldung.beitragsgruppenschluessel)}</BYGRSC>
    <BEBG>${escapeXml(meldung.beschaeftigungsbeginn)}</BEBG>
    <BEEN>${escapeXml(meldung.beschaeftigungsende)}</BEEN>
    <BPEG>${meldung.beitragspflichtigesEntgelt}</BPEG>
    ${meldung.einmalentgelt != null ? `<EMEG>${meldung.einmalentgelt}</EMEG>` : ""}
    ${meldung.betriebsnummerNachfolgerArbeitgeber ? `<BBNRAGNF>${escapeXml(meldung.betriebsnummerNachfolgerArbeitgeber)}</BBNRAGNF>` : ""}
    ${meldung.aktenzeichen ? `<AZ>${escapeXml(meldung.aktenzeichen)}</AZ>` : ""}
  </DSME>`;
}

function buildJahresmeldungXml(meldung: DEUEVJahresmeldung): string {
  return `<DSME>
    <KENNZDS>DEUEV</KENNZDS>
    <MMME>DSME</MMME>
    <GD>${escapeXml(meldung.meldegrund)}</GD>
    <BBNRAG>${escapeXml(meldung.betriebsnummerArbeitgeber)}</BBNRAG>
    <BBNRKK>${escapeXml(meldung.betriebsnummerEinzugsstelle)}</BBNRKK>
    <VSNR>${escapeXml(meldung.versicherungsnummer)}</VSNR>
    <NAME>${escapeXml(meldung.familienname)}</NAME>
    <VNAME>${escapeXml(meldung.vorname)}</VNAME>
    <GBDT>${escapeXml(meldung.geburtsdatum)}</GBDT>
    <GE>${escapeXml(meldung.geschlecht)}</GE>
    <PERSGR>${escapeXml(meldung.personengruppe)}</PERSGR>
    <BYGRSC>${buildBeitragsgruppe(meldung.beitragsgruppenschluessel)}</BYGRSC>
    <MELDEJAHR>${meldung.meldejahr}</MELDEJAHR>
    <BEBG>${escapeXml(meldung.beschaeftigungsbeginn)}</BEBG>
    <BEEN>${escapeXml(meldung.beschaeftigungsende)}</BEEN>
    <BPEG>${meldung.beitragspflichtigesEntgelt}</BPEG>
    ${meldung.einmalentgelt != null ? `<EMEG>${meldung.einmalentgelt}</EMEG>` : ""}
    ${meldung.aktenzeichen ? `<AZ>${escapeXml(meldung.aktenzeichen)}</AZ>` : ""}
  </DSME>`;
}

function buildSofortmeldungXml(meldung: DEUEVSofortmeldung): string {
  return `<DSME>
    <KENNZDS>DEUEV</KENNZDS>
    <MMME>DSME</MMME>
    <GD>${escapeXml(meldung.meldegrund)}</GD>
    <BBNRAG>${escapeXml(meldung.betriebsnummerArbeitgeber)}</BBNRAG>
    <NAME>${escapeXml(meldung.familienname)}</NAME>
    <VNAME>${escapeXml(meldung.vorname)}</VNAME>
    <GBDT>${escapeXml(meldung.geburtsdatum)}</GBDT>
    <GE>${escapeXml(meldung.geschlecht)}</GE>
    <STAAT>${escapeXml(meldung.staatsangehoerigkeit)}</STAAT>
    <BEBG>${escapeXml(meldung.beschaeftigungsbeginn)}</BEBG>
    ${meldung.versicherungsnummer ? `<VSNR>${escapeXml(meldung.versicherungsnummer)}</VSNR>` : ""}
    ${meldung.branchenSchluessel ? `<BRANCHE>${escapeXml(meldung.branchenSchluessel)}</BRANCHE>` : ""}
    ${meldung.strasse ? `<STR>${escapeXml(meldung.strasse)}</STR>` : ""}
    ${meldung.hausnummer ? `<HNR>${escapeXml(meldung.hausnummer)}</HNR>` : ""}
    ${meldung.postleitzahl ? `<PLZ>${escapeXml(meldung.postleitzahl)}</PLZ>` : ""}
    ${meldung.ort ? `<ORT>${escapeXml(meldung.ort)}</ORT>` : ""}
  </DSME>`;
}

function buildMeldungXml(
  meldung: DEUEVAnmeldung | DEUEVAbmeldung | DEUEVJahresmeldung | DEUEVSofortmeldung
): string {
  switch (meldung.meldegrund) {
    case "10":
    case "11":
    case "12":
    case "13":
      return buildAnmeldungXml(meldung as DEUEVAnmeldung);
    case "30":
    case "31":
    case "32":
    case "33":
    case "34":
    case "35":
    case "36":
      return buildAbmeldungXml(meldung as DEUEVAbmeldung);
    case "50":
      return buildJahresmeldungXml(meldung as DEUEVJahresmeldung);
    case "20":
      return buildSofortmeldungXml(meldung as DEUEVSofortmeldung);
    case "40":
      // Simultaneous An- and Abmeldung — uses Anmeldung structure
      return buildAnmeldungXml(meldung as DEUEVAnmeldung);
    default:
      throw new IntegrationError(
        "VALIDATION_ERROR",
        `Unbekannter Meldegrund: ${(meldung as { meldegrund: string }).meldegrund}`
      );
  }
}

function buildBatchXml(batch: DEUEVDatenaustauschBatch): string {
  const header = buildDEUEVHeader(
    batch.absenderBetriebsnummer,
    batch.empfaengerBetriebsnummer,
    batch.erstellungsdatum,
    batch.dateinummer
  );

  const meldungenXml = batch.meldungen
    .map((m) => buildMeldungXml(m))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<DEUEV>
  ${header}
  ${meldungenXml}
  <NCSZ>
    <VFMM>DEUEV</VFMM>
    <BBNRAB>${escapeXml(batch.absenderBetriebsnummer)}</BBNRAB>
    <BBNREP>${escapeXml(batch.empfaengerBetriebsnummer)}</BBNREP>
    <ANZDS>${batch.meldungen.length}</ANZDS>
  </NCSZ>
</DEUEV>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ==================== Response Parsers ====================

function parseSVFehler(responseXml: string): SVMeldungFehler[] {
  const fehlerList: SVMeldungFehler[] = [];
  const pattern = /<Fehler>\s*<Code>([^<]*)<\/Code>\s*<Nachricht>([^<]*)<\/Nachricht>(?:\s*<Feldname>([^<]*)<\/Feldname>)?\s*<\/Fehler>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(responseXml)) !== null) {
    fehlerList.push({
      code: match[1],
      nachricht: match[2],
      feldname: match[3],
      schweregrad: "fehler",
    });
  }
  return fehlerList;
}

function parseSVWarnungen(responseXml: string): SVMeldungFehler[] {
  const warnungen: SVMeldungFehler[] = [];
  const pattern = /<Warnung>\s*<Code>([^<]*)<\/Code>\s*<Nachricht>([^<]*)<\/Nachricht>(?:\s*<Feldname>([^<]*)<\/Feldname>)?\s*<\/Warnung>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(responseXml)) !== null) {
    warnungen.push({
      code: match[1],
      nachricht: match[2],
      feldname: match[3],
      schweregrad: "warnung",
    });
  }
  return warnungen;
}

function extractXmlValue(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return match?.[1];
}

// ==================== Client ====================

/**
 * SV-Meldeportal client for social insurance notifications.
 *
 * Handles DEUEV messages: Anmeldung, Abmeldung, Jahresmeldung, Sofortmeldung.
 * Uses certificate-based authentication.
 */
export class SVMeldeportalClient extends BaseIntegrationClient {
  private readonly betriebsnummer: string;
  private readonly absenderBetriebsnummer: string;

  constructor(config: SVMeldeportalConfig) {
    const baseUrl = config.testMode ? SV_MELDE_TEST_URL : SV_MELDE_BASE_URL;

    super({
      baseUrl,
      authType: "custom",
      credentials: {
        certificatePath: config.certificatePath,
        certificatePassword: config.certificatePassword,
      },
      timeout: config.timeout ?? 60_000,
      rateLimit: { requestsPerMinute: 30 },
      defaultHeaders: {
        "Content-Type": "application/xml",
        Accept: "application/xml",
      },
    });

    this.betriebsnummer = config.betriebsnummer;
    this.absenderBetriebsnummer = config.absenderBetriebsnummer ?? config.betriebsnummer;
  }

  // ==================== Individual Messages ====================

  /** Submit a DEUEV Anmeldung (employee registration). */
  async submitAnmeldung(meldung: DEUEVAnmeldung): Promise<SVMeldungErgebnis> {
    return this.submitSingleMeldung(meldung);
  }

  /** Submit a DEUEV Abmeldung (employee deregistration). */
  async submitAbmeldung(meldung: DEUEVAbmeldung): Promise<SVMeldungErgebnis> {
    return this.submitSingleMeldung(meldung);
  }

  /** Submit a DEUEV Jahresmeldung (annual notification). */
  async submitJahresmeldung(meldung: DEUEVJahresmeldung): Promise<SVMeldungErgebnis> {
    return this.submitSingleMeldung(meldung);
  }

  /** Submit a DEUEV Sofortmeldung (immediate notification). */
  async submitSofortmeldung(meldung: DEUEVSofortmeldung): Promise<SVMeldungErgebnis> {
    return this.submitSingleMeldung(meldung);
  }

  // ==================== Batch ====================

  /** Submit a batch of DEUEV messages. */
  async submitBatch(batch: DEUEVDatenaustauschBatch): Promise<SVMeldungErgebnis> {
    const xml = buildBatchXml(batch);

    const response = await this.request<string>({
      method: "POST",
      path: "/v1/deuev/batch",
      body: xml,
      headers: {
        "Content-Type": "application/xml",
        "X-SV-Betriebsnummer": this.betriebsnummer,
        "X-SV-Absender": this.absenderBetriebsnummer,
      },
    });

    return this.parseSubmissionResponse(response);
  }

  /** Get the status of a previously submitted batch. */
  async getBatchStatus(datensatzId: string): Promise<ApiResponse<DEUEVDatenaustauschStatus>> {
    return this.get<DEUEVDatenaustauschStatus>(
      `/v1/deuev/status/${datensatzId}`,
      { betriebsnummer: this.betriebsnummer }
    );
  }

  // ==================== History / Query ====================

  /** Query submitted messages with optional filters. */
  async queryMeldungen(
    abfrage?: SVMeldungAbfrage
  ): Promise<ApiResponse<SVMeldungErgebnis[]>> {
    const params: Record<string, string> = {
      betriebsnummer: abfrage?.betriebsnummer ?? this.betriebsnummer,
    };
    if (abfrage?.vonDatum) params["vonDatum"] = abfrage.vonDatum;
    if (abfrage?.bisDatum) params["bisDatum"] = abfrage.bisDatum;
    if (abfrage?.meldungsart) params["meldungsart"] = abfrage.meldungsart;
    if (abfrage?.limit) params["limit"] = String(abfrage.limit);

    return this.get<SVMeldungErgebnis[]>("/v1/deuev/meldungen", params);
  }

  // ==================== Helpers ====================

  /** Build and submit a single DEUEV message as a batch of one. */
  private async submitSingleMeldung(
    meldung: DEUEVAnmeldung | DEUEVAbmeldung | DEUEVJahresmeldung | DEUEVSofortmeldung
  ): Promise<SVMeldungErgebnis> {
    const today = new Date();
    const erstellungsdatum = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("");

    const empfaenger = "betriebsnummerEinzugsstelle" in meldung
      ? meldung.betriebsnummerEinzugsstelle
      : this.betriebsnummer;

    const batch: DEUEVDatenaustauschBatch = {
      absenderBetriebsnummer: this.absenderBetriebsnummer,
      empfaengerBetriebsnummer: empfaenger,
      erstellungsdatum,
      dateinummer: 1,
      meldungen: [meldung],
    };

    return this.submitBatch(batch);
  }

  private parseSubmissionResponse(
    response: ApiResponse<string>
  ): SVMeldungErgebnis {
    const responseXml = typeof response.data === "string" ? response.data : String(response.data);
    const fehler = parseSVFehler(responseXml);
    const warnungen = parseSVWarnungen(responseXml);
    const datensatzId = extractXmlValue(responseXml, "DatensatzId");

    return {
      erfolg: fehler.length === 0,
      datensatzId,
      serverAntwort: responseXml,
      fehler: fehler.length > 0 ? fehler : undefined,
      warnungen: warnungen.length > 0 ? warnungen : undefined,
    };
  }
}

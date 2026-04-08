import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  ITSGGKVConfig,
  Beitragsnachweis,
  BeitragsnachweisEinzelposition,
  ErstattungsantragU1,
  ErstattungsantragU2,
  GKVDatenaustauschBatch,
  GKVDatenaustauschHeader,
  GKVDatenaustauschStatus,
  GKVSubmissionResult,
  GKVFehler,
  GKVAbfrage,
} from "./types.js";

const ITSG_BASE_URL = "https://www.itsg.de/gkv-datenaustausch/api";
const ITSG_TEST_URL = "https://test.itsg.de/gkv-datenaustausch/api";

// ==================== XML Builders ====================

function buildGKVHeader(header: GKVDatenaustauschHeader): string {
  return `<VOSZ>
    <VFMM>${escapeXml(header.verfahren)}</VFMM>
    <BBNRAB>${escapeXml(header.absenderBetriebsnummer)}</BBNRAB>
    <BBNREP>${escapeXml(header.empfaengerBetriebsnummer)}</BBNREP>
    <ED>${escapeXml(header.erstellungsdatum)}</ED>
    <DTEFNR>${String(header.dateinummer).padStart(6, "0")}</DTEFNR>
    <VERNR>${escapeXml(header.versionsnummer)}</VERNR>
  </VOSZ>`;
}

function buildBeitragsnachweisXml(bn: Beitragsnachweis): string {
  return `<DSBN>
    <KENNZDS>BWNAC</KENNZDS>
    <BBNRAG>${escapeXml(bn.betriebsnummerArbeitgeber)}</BBNRAG>
    <BBNRKK>${escapeXml(bn.betriebsnummerEinzugsstelle)}</BBNRKK>
    <BMON>${escapeXml(bn.beitragsmonat)}</BMON>
    <ED>${escapeXml(bn.erstellungsdatum)}</ED>
    ${bn.berichtigteMeldung ? "<KENNZBER>J</KENNZBER>" : ""}
    ${bn.stornierung ? "<KENNZSTO>J</KENNZSTO>" : ""}
    <KVAG>${bn.kvBeitragAllgemein}</KVAG>
    <KVERM>${bn.kvBeitragErmaessigt}</KVERM>
    <KVZUS>${bn.kvZusatzbeitrag}</KVZUS>
    <RV>${bn.rvBeitrag}</RV>
    <ALV>${bn.alvBeitrag}</ALV>
    <PV>${bn.pvBeitrag}</PV>
    <PVZK>${bn.pvZuschlagKinderlose}</PVZK>
    <INSO>${bn.insolvenzgeldumlage}</INSO>
    <U1>${bn.umlageU1}</U1>
    <U2>${bn.umlageU2}</U2>
    <GESAMT>${bn.gesamtbeitrag}</GESAMT>
    ${bn.pauschalBeitraegeMinijob != null ? `<PAUSCH>${bn.pauschalBeitraegeMinijob}</PAUSCH>` : ""}
    ${bn.einzelpositionen ? bn.einzelpositionen.map(buildEinzelpositionXml).join("\n") : ""}
  </DSBN>`;
}

function buildEinzelpositionXml(pos: BeitragsnachweisEinzelposition): string {
  return `<DBEP>
      <VSNR>${escapeXml(pos.versicherungsnummer)}</VSNR>
      <NAME>${escapeXml(pos.familienname)}</NAME>
      <VNAME>${escapeXml(pos.vorname)}</VNAME>
      <PERSGR>${escapeXml(pos.personengruppe)}</PERSGR>
      <BYGRSC>${escapeXml(pos.beitragsgruppe)}</BYGRSC>
      <BPEG>${pos.beitragspflichtigesEntgelt}</BPEG>
      <KVBY>${pos.kvBeitrag}</KVBY>
      <RVBY>${pos.rvBeitrag}</RVBY>
      <ALVBY>${pos.alvBeitrag}</ALVBY>
      <PVBY>${pos.pvBeitrag}</PVBY>
    </DBEP>`;
}

function buildErstattungsantragU1Xml(antrag: ErstattungsantragU1): string {
  return `<DSEA>
    <KENNZDS>EAAGU1</KENNZDS>
    <BBNRAG>${escapeXml(antrag.betriebsnummerArbeitgeber)}</BBNRAG>
    <BBNRKK>${escapeXml(antrag.betriebsnummerEinzugsstelle)}</BBNRKK>
    <VSNR>${escapeXml(antrag.versicherungsnummer)}</VSNR>
    <NAME>${escapeXml(antrag.familienname)}</NAME>
    <VNAME>${escapeXml(antrag.vorname)}</VNAME>
    <GBDT>${escapeXml(antrag.geburtsdatum)}</GBDT>
    <AUBG>${escapeXml(antrag.auBeginn)}</AUBG>
    <AUEN>${escapeXml(antrag.auEnde)}</AUEN>
    <EZRBG>${escapeXml(antrag.erstattungszeitraumBeginn)}</EZRBG>
    <EZREN>${escapeXml(antrag.erstattungszeitraumEnde)}</EZREN>
    <EBEFZ>${antrag.erstattungsbetragEntgeltfortzahlung}</EBEFZ>
    <EBAGSV>${antrag.erstattungsbetragAGAnteileSV}</EBAGSV>
    <EGES>${antrag.gesamterstattungsbetrag}</EGES>
    <IBAN>${escapeXml(antrag.iban)}</IBAN>
    ${antrag.bic ? `<BIC>${escapeXml(antrag.bic)}</BIC>` : ""}
    <ANART>${antrag.antragsart === "erstantrag" ? "E" : "F"}</ANART>
  </DSEA>`;
}

function buildErstattungsantragU2Xml(antrag: ErstattungsantragU2): string {
  return `<DSEA>
    <KENNZDS>EAAGU2</KENNZDS>
    <BBNRAG>${escapeXml(antrag.betriebsnummerArbeitgeber)}</BBNRAG>
    <BBNRKK>${escapeXml(antrag.betriebsnummerEinzugsstelle)}</BBNRKK>
    <VSNR>${escapeXml(antrag.versicherungsnummer)}</VSNR>
    <NAME>${escapeXml(antrag.familienname)}</NAME>
    <VNAME>${escapeXml(antrag.vorname)}</VNAME>
    <GBDT>${escapeXml(antrag.geburtsdatum)}</GBDT>
    <MSBG>${escapeXml(antrag.mutterschutzBeginn)}</MSBG>
    <MSEN>${escapeXml(antrag.mutterschutzEnde)}</MSEN>
    ${antrag.entbindungstag ? `<ENTBTAG>${escapeXml(antrag.entbindungstag)}</ENTBTAG>` : ""}
    <EZRBG>${escapeXml(antrag.erstattungszeitraumBeginn)}</EZRBG>
    <EZREN>${escapeXml(antrag.erstattungszeitraumEnde)}</EZREN>
    <ZMGTAG>${antrag.zuschussMutterschaftsgeldProTag}</ZMGTAG>
    <EBZM>${antrag.erstattungsbetragZuschuss}</EBZM>
    <EBAGSV>${antrag.erstattungsbetragAGAnteileSV}</EBAGSV>
    <EGES>${antrag.gesamterstattungsbetrag}</EGES>
    <IBAN>${escapeXml(antrag.iban)}</IBAN>
    ${antrag.bic ? `<BIC>${escapeXml(antrag.bic)}</BIC>` : ""}
  </DSEA>`;
}

function buildBatchXml(batch: GKVDatenaustauschBatch): string {
  const headerXml = buildGKVHeader(batch.header);

  const records: string[] = [];

  if (batch.beitragsnachweise) {
    for (const bn of batch.beitragsnachweise) {
      records.push(buildBeitragsnachweisXml(bn));
    }
  }
  if (batch.erstattungsantraegeU1) {
    for (const ea of batch.erstattungsantraegeU1) {
      records.push(buildErstattungsantragU1Xml(ea));
    }
  }
  if (batch.erstattungsantraegeU2) {
    for (const ea of batch.erstattungsantraegeU2) {
      records.push(buildErstattungsantragU2Xml(ea));
    }
  }

  const totalRecords =
    (batch.beitragsnachweise?.length ?? 0) +
    (batch.erstattungsantraegeU1?.length ?? 0) +
    (batch.erstattungsantraegeU2?.length ?? 0);

  return `<?xml version="1.0" encoding="UTF-8"?>
<GKV>
  ${headerXml}
  ${records.join("\n  ")}
  <NCSZ>
    <VFMM>${escapeXml(batch.header.verfahren)}</VFMM>
    <BBNRAB>${escapeXml(batch.header.absenderBetriebsnummer)}</BBNRAB>
    <BBNREP>${escapeXml(batch.header.empfaengerBetriebsnummer)}</BBNREP>
    <ANZDS>${totalRecords}</ANZDS>
  </NCSZ>
</GKV>`;
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

function parseGKVFehler(responseXml: string): GKVFehler[] {
  const fehlerList: GKVFehler[] = [];
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

function parseGKVWarnungen(responseXml: string): GKVFehler[] {
  const warnungen: GKVFehler[] = [];
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
 * ITSG GKV Datenaustausch client for statutory health insurance communication.
 *
 * Handles Beitragsnachweise (contribution proofs), Erstattungsantraege (AAG U1/U2),
 * and message history queries. Certificate-based authentication.
 */
export class ITSGGKVClient extends BaseIntegrationClient {
  private readonly betriebsnummer: string;
  private readonly absenderBetriebsnummer: string;

  constructor(config: ITSGGKVConfig) {
    const baseUrl = config.testMode ? ITSG_TEST_URL : ITSG_BASE_URL;

    super({
      baseUrl,
      authType: "custom",
      credentials: {
        certificatePath: config.certificatePath,
        certificatePassword: config.certificatePassword,
      },
      timeout: config.timeout ?? 60_000,
      rateLimit: { requestsPerMinute: 20 },
      defaultHeaders: {
        "Content-Type": "application/xml",
        Accept: "application/xml",
      },
    });

    this.betriebsnummer = config.betriebsnummer;
    this.absenderBetriebsnummer = config.absenderBetriebsnummer ?? config.betriebsnummer;
  }

  // ==================== Beitragsnachweise ====================

  /** Submit a Beitragsnachweis (monthly contribution proof) to a Krankenkasse. */
  async submitBeitragsnachweis(
    nachweis: Beitragsnachweis
  ): Promise<GKVSubmissionResult> {
    const header = this.buildHeader(nachweis.betriebsnummerEinzugsstelle, "BWNAC");
    const batch: GKVDatenaustauschBatch = {
      header,
      beitragsnachweise: [nachweis],
    };

    return this.submitBatch(batch);
  }

  /** Submit multiple Beitragsnachweise (grouped by Einzugsstelle). */
  async submitBeitragsnachweiseBatch(
    nachweise: Beitragsnachweis[]
  ): Promise<GKVSubmissionResult> {
    if (nachweise.length === 0) {
      throw new IntegrationError("VALIDATION_ERROR", "Keine Beitragsnachweise zum Senden");
    }

    // All must go to the same Einzugsstelle in one batch
    const einzugsstelle = nachweise[0].betriebsnummerEinzugsstelle;
    const allSame = nachweise.every((n) => n.betriebsnummerEinzugsstelle === einzugsstelle);
    if (!allSame) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        "Alle Beitragsnachweise in einem Batch muessen an dieselbe Einzugsstelle gehen"
      );
    }

    const header = this.buildHeader(einzugsstelle, "BWNAC");
    const batch: GKVDatenaustauschBatch = {
      header,
      beitragsnachweise: nachweise,
    };

    return this.submitBatch(batch);
  }

  // ==================== Erstattungsantraege (AAG) ====================

  /** Submit an AAG U1 reimbursement claim (Entgeltfortzahlung). */
  async submitErstattungsantragU1(
    antrag: ErstattungsantragU1
  ): Promise<GKVSubmissionResult> {
    const header = this.buildHeader(antrag.betriebsnummerEinzugsstelle, "EAAG");
    const batch: GKVDatenaustauschBatch = {
      header,
      erstattungsantraegeU1: [antrag],
    };

    return this.submitBatch(batch);
  }

  /** Submit an AAG U2 reimbursement claim (Mutterschaftsgeld). */
  async submitErstattungsantragU2(
    antrag: ErstattungsantragU2
  ): Promise<GKVSubmissionResult> {
    const header = this.buildHeader(antrag.betriebsnummerEinzugsstelle, "EAAG");
    const batch: GKVDatenaustauschBatch = {
      header,
      erstattungsantraegeU2: [antrag],
    };

    return this.submitBatch(batch);
  }

  // ==================== Batch / Status ====================

  /** Submit a full GKV data exchange batch. */
  async submitBatch(batch: GKVDatenaustauschBatch): Promise<GKVSubmissionResult> {
    const xml = buildBatchXml(batch);

    const response = await this.request<string>({
      method: "POST",
      path: "/v1/datenaustausch/submit",
      body: xml,
      headers: {
        "Content-Type": "application/xml",
        "X-ITSG-Betriebsnummer": this.betriebsnummer,
        "X-ITSG-Absender": this.absenderBetriebsnummer,
        "X-ITSG-Verfahren": batch.header.verfahren,
      },
    });

    return this.parseSubmissionResponse(response);
  }

  /** Get the status of a previous submission. */
  async getSubmissionStatus(
    datensatzId: string
  ): Promise<ApiResponse<GKVDatenaustauschStatus>> {
    return this.get<GKVDatenaustauschStatus>(
      `/v1/datenaustausch/status/${datensatzId}`,
      { betriebsnummer: this.betriebsnummer }
    );
  }

  // ==================== Query / History ====================

  /** Query submitted GKV messages. */
  async queryMeldungen(
    abfrage?: GKVAbfrage
  ): Promise<ApiResponse<GKVSubmissionResult[]>> {
    const params: Record<string, string> = {
      betriebsnummer: abfrage?.betriebsnummer ?? this.betriebsnummer,
    };
    if (abfrage?.einzugsstelle) params["einzugsstelle"] = abfrage.einzugsstelle;
    if (abfrage?.meldungsart) params["meldungsart"] = abfrage.meldungsart;
    if (abfrage?.beitragsmonat) params["beitragsmonat"] = abfrage.beitragsmonat;
    if (abfrage?.vonDatum) params["vonDatum"] = abfrage.vonDatum;
    if (abfrage?.bisDatum) params["bisDatum"] = abfrage.bisDatum;
    if (abfrage?.limit) params["limit"] = String(abfrage.limit);

    return this.get<GKVSubmissionResult[]>("/v1/datenaustausch/meldungen", params);
  }

  // ==================== Helpers ====================

  private buildHeader(empfaenger: string, verfahren: string): GKVDatenaustauschHeader {
    const today = new Date();
    const erstellungsdatum = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("");

    return {
      verfahren,
      absenderBetriebsnummer: this.absenderBetriebsnummer,
      empfaengerBetriebsnummer: empfaenger,
      erstellungsdatum,
      dateinummer: 1,
      versionsnummer: "05",
    };
  }

  private parseSubmissionResponse(
    response: ApiResponse<string>
  ): GKVSubmissionResult {
    const responseXml = typeof response.data === "string" ? response.data : String(response.data);
    const fehler = parseGKVFehler(responseXml);
    const warnungen = parseGKVWarnungen(responseXml);
    const datensatzId = extractXmlValue(responseXml, "DatensatzId");
    const verarbeitungskennzeichen = extractXmlValue(responseXml, "Verarbeitungskennzeichen");

    return {
      erfolg: fehler.length === 0,
      datensatzId,
      verarbeitungskennzeichen,
      serverAntwort: responseXml,
      fehler: fehler.length > 0 ? fehler : undefined,
      warnungen: warnungen.length > 0 ? warnungen : undefined,
    };
  }
}

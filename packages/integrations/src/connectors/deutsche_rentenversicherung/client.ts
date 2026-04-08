import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  DRVConfig,
  RVBeitragsgrundlagen,
  RVUVEntgelt,
  RVUnterbrechungsmeldung,
  VSNRAnfrage,
  VSNRErgebnis,
  VSNRKandidat,
  KontenklärungsAnfrage,
  KontenklärungsErgebnis,
  BeitragszeitEintrag,
  Zeitluecke,
  DRVDatenaustauschBatch,
  DRVDatenaustauschStatus,
  DRVSubmissionResult,
  DRVFehler,
  DRVAbfrage,
  RVMeldungBasisfelder,
} from "./types.js";

const DRV_BASE_URL = "https://dsrv.deutsche-rentenversicherung.de/api";
const DRV_TEST_URL = "https://dsrv-test.deutsche-rentenversicherung.de/api";

// ==================== XML Builders ====================

function buildDSRVHeader(
  absender: string,
  empfaenger: string,
  erstellungsdatum: string,
  dateinummer: number,
  verfahren: string
): string {
  return `<VOSZ>
    <VFMM>${escapeXml(verfahren)}</VFMM>
    <BBNRAB>${escapeXml(absender)}</BBNRAB>
    <BBNREP>${escapeXml(empfaenger)}</BBNREP>
    <ED>${escapeXml(erstellungsdatum)}</ED>
    <DTEFNR>${String(dateinummer).padStart(6, "0")}</DTEFNR>
  </VOSZ>`;
}

function buildBasisfelderXml(basis: RVMeldungBasisfelder): string {
  return `<BBNRAG>${escapeXml(basis.betriebsnummerArbeitgeber)}</BBNRAG>
    <VSNR>${escapeXml(basis.versicherungsnummer)}</VSNR>
    <NAME>${escapeXml(basis.familienname)}</NAME>
    <VNAME>${escapeXml(basis.vorname)}</VNAME>
    <GBDT>${escapeXml(basis.geburtsdatum)}</GBDT>
    <PERSGR>${escapeXml(basis.personengruppe)}</PERSGR>
    <GD>${escapeXml(basis.abgabegrund)}</GD>
    ${basis.aktenzeichen ? `<AZ>${escapeXml(basis.aktenzeichen)}</AZ>` : ""}`;
}

function buildBeitragsgrundlagenXml(bg: RVBeitragsgrundlagen): string {
  return `<DSME>
    <KENNZDS>DEUEV</KENNZDS>
    <MMME>DSME</MMME>
    ${buildBasisfelderXml(bg)}
    <MZBG>${escapeXml(bg.meldezeitraumBeginn)}</MZBG>
    <MZEN>${escapeXml(bg.meldezeitraumEnde)}</MZEN>
    <BPEGRV>${bg.beitragspflichtigesEntgeltRV}</BPEGRV>
    ${bg.beitragspflichtigesEntgeltKnRV != null ? `<BPEGKNRV>${bg.beitragspflichtigesEntgeltKnRV}</BPEGKNRV>` : ""}
    <BYGRSC_RV>${escapeXml(bg.beitragsgruppeRV)}</BYGRSC_RV>
    <TTSC>${escapeXml(bg.taetigkeitsschluessel)}</TTSC>
    <BBNRKK>${escapeXml(bg.betriebsnummerEinzugsstelle)}</BBNRKK>
    ${bg.einmalentgelt != null ? `<EMEG>${bg.einmalentgelt}</EMEG>` : ""}
    ${bg.berichtigung ? "<KENNZBER>J</KENNZBER>" : ""}
    ${bg.stornierung ? "<KENNZSTO>J</KENNZSTO>" : ""}
  </DSME>`;
}

function buildUVEntgeltXml(uv: RVUVEntgelt): string {
  return `<DSUV>
    <KENNZDS>DEUEV</KENNZDS>
    <MMME>DSUV</MMME>
    ${buildBasisfelderXml(uv)}
    <UVMJ>${uv.uvMeldejahr}</UVMJ>
    <UVEG>${uv.uvEntgelt}</UVEG>
    <ARBSTD>${uv.arbeitsstunden}</ARBSTD>
    <GFTS>${escapeXml(uv.gefahrtarifstelle)}</GFTS>
    <MGNRUV>${escapeXml(uv.mitgliedsnummerUV)}</MGNRUV>
    <BBNRUV>${escapeXml(uv.betriebsnummerUVTraeger)}</BBNRUV>
  </DSUV>`;
}

function buildUnterbrechungsmeldungXml(um: RVUnterbrechungsmeldung): string {
  return `<DSME>
    <KENNZDS>DEUEV</KENNZDS>
    <MMME>DSME</MMME>
    ${buildBasisfelderXml(um)}
    <UBGBG>${escapeXml(um.unterbrechungBeginn)}</UBGBG>
    ${um.unterbrechungEnde ? `<UBGEN>${escapeXml(um.unterbrechungEnde)}</UBGEN>` : ""}
    <UBGGD>${escapeXml(um.unterbrechungsgrund)}</UBGGD>
    <LTMEG>${escapeXml(um.letzterTagMitEntgelt)}</LTMEG>
    <BPEG>${um.beitragspflichtigesEntgelt}</BPEG>
  </DSME>`;
}

function buildVSNRAnfrageXml(anfrage: VSNRAnfrage): string {
  return `<DSVA>
    <KENNZDS>DSRV</KENNZDS>
    <BBNRAG>${escapeXml(anfrage.betriebsnummerArbeitgeber)}</BBNRAG>
    <NAME>${escapeXml(anfrage.familienname)}</NAME>
    ${anfrage.geburtsname ? `<GBNAME>${escapeXml(anfrage.geburtsname)}</GBNAME>` : ""}
    <VNAME>${escapeXml(anfrage.vorname)}</VNAME>
    <GBDT>${escapeXml(anfrage.geburtsdatum)}</GBDT>
    <GE>${escapeXml(anfrage.geschlecht)}</GE>
    ${anfrage.geburtsort ? `<GBOT>${escapeXml(anfrage.geburtsort)}</GBOT>` : ""}
    <STAAT>${escapeXml(anfrage.staatsangehoerigkeit)}</STAAT>
    ${anfrage.strasse ? `<STR>${escapeXml(anfrage.strasse)}</STR>` : ""}
    ${anfrage.hausnummer ? `<HNR>${escapeXml(anfrage.hausnummer)}</HNR>` : ""}
    ${anfrage.postleitzahl ? `<PLZ>${escapeXml(anfrage.postleitzahl)}</PLZ>` : ""}
    ${anfrage.ort ? `<ORT>${escapeXml(anfrage.ort)}</ORT>` : ""}
  </DSVA>`;
}

function buildKontenklärungXml(anfrage: KontenklärungsAnfrage, absender: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<DSRV>
  <DSKK>
    <KENNZDS>DSRV</KENNZDS>
    <BBNRAG>${escapeXml(anfrage.betriebsnummerArbeitgeber)}</BBNRAG>
    <BBNRAB>${escapeXml(absender)}</BBNRAB>
    <VSNR>${escapeXml(anfrage.versicherungsnummer)}</VSNR>
    <KZRVON>${escapeXml(anfrage.klaerungszeitraumVon)}</KZRVON>
    <KZRBIS>${escapeXml(anfrage.klaerungszeitraumBis)}</KZRBIS>
  </DSKK>
</DSRV>`;
}

function buildBatchXml(batch: DRVDatenaustauschBatch): string {
  const records: string[] = [];

  if (batch.beitragsgrundlagen) {
    for (const bg of batch.beitragsgrundlagen) {
      records.push(buildBeitragsgrundlagenXml(bg));
    }
  }
  if (batch.uvEntgelte) {
    for (const uv of batch.uvEntgelte) {
      records.push(buildUVEntgeltXml(uv));
    }
  }
  if (batch.unterbrechungsmeldungen) {
    for (const um of batch.unterbrechungsmeldungen) {
      records.push(buildUnterbrechungsmeldungXml(um));
    }
  }
  if (batch.vsnrAnfragen) {
    for (const va of batch.vsnrAnfragen) {
      records.push(buildVSNRAnfrageXml(va));
    }
  }

  const totalRecords =
    (batch.beitragsgrundlagen?.length ?? 0) +
    (batch.uvEntgelte?.length ?? 0) +
    (batch.unterbrechungsmeldungen?.length ?? 0) +
    (batch.vsnrAnfragen?.length ?? 0);

  const headerXml = buildDSRVHeader(
    batch.absenderBetriebsnummer,
    batch.empfaengerBetriebsnummer,
    batch.erstellungsdatum,
    batch.dateinummer,
    "DEUEV"
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<DSRV>
  ${headerXml}
  ${records.join("\n  ")}
  <NCSZ>
    <VFMM>DEUEV</VFMM>
    <BBNRAB>${escapeXml(batch.absenderBetriebsnummer)}</BBNRAB>
    <BBNREP>${escapeXml(batch.empfaengerBetriebsnummer)}</BBNREP>
    <ANZDS>${totalRecords}</ANZDS>
  </NCSZ>
</DSRV>`;
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

function parseDRVFehler(responseXml: string): DRVFehler[] {
  const fehlerList: DRVFehler[] = [];
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

function parseDRVWarnungen(responseXml: string): DRVFehler[] {
  const warnungen: DRVFehler[] = [];
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

function parseVSNRErgebnis(responseXml: string): VSNRErgebnis {
  const fehler = parseDRVFehler(responseXml);
  const vsnr = extractXmlValue(responseXml, "VSNR");
  const statusRaw = extractXmlValue(responseXml, "Status");

  let status: VSNRErgebnis["status"] = "fehler";
  if (statusRaw === "gefunden" || statusRaw === "vergeben" || statusRaw === "nicht_gefunden" || statusRaw === "mehrdeutig") {
    status = statusRaw;
  } else if (vsnr && fehler.length === 0) {
    status = "gefunden";
  }

  const kandidaten: VSNRKandidat[] = [];
  const kandidatPattern = /<Kandidat>([\s\S]*?)<\/Kandidat>/g;
  let kandidatMatch: RegExpExecArray | null;
  while ((kandidatMatch = kandidatPattern.exec(responseXml)) !== null) {
    const kXml = kandidatMatch[1];
    kandidaten.push({
      versicherungsnummer: extractXmlValue(kXml, "VSNR") ?? "",
      familienname: extractXmlValue(kXml, "NAME") ?? "",
      vorname: extractXmlValue(kXml, "VNAME") ?? "",
      geburtsdatum: extractXmlValue(kXml, "GBDT") ?? "",
    });
  }

  return {
    erfolg: fehler.length === 0 && (vsnr != null || kandidaten.length > 0),
    versicherungsnummer: vsnr,
    status,
    kandidaten: kandidaten.length > 0 ? kandidaten : undefined,
    fehler: fehler.length > 0 ? fehler : undefined,
  };
}

function parseKontenklärungsErgebnis(responseXml: string): KontenklärungsErgebnis {
  const fehler = parseDRVFehler(responseXml);
  const vsnr = extractXmlValue(responseXml, "VSNR") ?? "";

  const beitragszeiten: BeitragszeitEintrag[] = [];
  const bzPattern = /<Beitragszeit>([\s\S]*?)<\/Beitragszeit>/g;
  let bzMatch: RegExpExecArray | null;
  while ((bzMatch = bzPattern.exec(responseXml)) !== null) {
    const xml = bzMatch[1];
    beitragszeiten.push({
      zeitraumBeginn: extractXmlValue(xml, "ZeitraumBeginn") ?? "",
      zeitraumEnde: extractXmlValue(xml, "ZeitraumEnde") ?? "",
      betriebsnummerArbeitgeber: extractXmlValue(xml, "BBNRAG") ?? "",
      beitragspflichtigesEntgelt: parseInt(extractXmlValue(xml, "BPEG") ?? "0", 10),
      art: (extractXmlValue(xml, "Art") ?? "pflichtbeitrag") as BeitragszeitEintrag["art"],
    });
  }

  const luecken: Zeitluecke[] = [];
  const lueckePattern = /<Luecke>([\s\S]*?)<\/Luecke>/g;
  let lueckeMatch: RegExpExecArray | null;
  while ((lueckeMatch = lueckePattern.exec(responseXml)) !== null) {
    const xml = lueckeMatch[1];
    luecken.push({
      beginn: extractXmlValue(xml, "Beginn") ?? "",
      ende: extractXmlValue(xml, "Ende") ?? "",
      dauerMonate: parseInt(extractXmlValue(xml, "DauerMonate") ?? "0", 10),
    });
  }

  return {
    versicherungsnummer: vsnr,
    erfolg: fehler.length === 0,
    beitragszeiten: beitragszeiten.length > 0 ? beitragszeiten : undefined,
    luecken: luecken.length > 0 ? luecken : undefined,
    fehler: fehler.length > 0 ? fehler : undefined,
  };
}

// ==================== Client ====================

/**
 * Deutsche Rentenversicherung (DRV/DSRV) client.
 *
 * Handles Rentenversicherungsmeldungen: Beitragsgrundlagen, UV-Entgelt,
 * Unterbrechungsmeldungen, VSNR-Anfragen, and Kontenklaerung.
 * Certificate-based authentication.
 */
export class DeutscheRentenversicherungClient extends BaseIntegrationClient {
  private readonly betriebsnummer: string;
  private readonly absenderBetriebsnummer: string;
  /** Default DRV-Bund Betriebsnummer */
  private readonly drvBundBetriebsnummer = "66667777";

  constructor(config: DRVConfig) {
    const baseUrl = config.testMode ? DRV_TEST_URL : DRV_BASE_URL;

    super({
      baseUrl,
      authType: "custom",
      credentials: {
        certificatePath: config.certificatePath,
        certificatePassword: config.certificatePassword,
      },
      timeout: config.timeout ?? 60_000,
      rateLimit: { requestsPerMinute: 15 },
      defaultHeaders: {
        "Content-Type": "application/xml",
        Accept: "application/xml",
      },
    });

    this.betriebsnummer = config.betriebsnummer;
    this.absenderBetriebsnummer = config.absenderBetriebsnummer ?? config.betriebsnummer;
  }

  // ==================== Beitragsgrundlagen ====================

  /** Submit Beitragsgrundlagen (contribution base data) for one or more employees. */
  async submitBeitragsgrundlagen(
    meldungen: RVBeitragsgrundlagen[]
  ): Promise<DRVSubmissionResult> {
    if (meldungen.length === 0) {
      throw new IntegrationError("VALIDATION_ERROR", "Keine Beitragsgrundlagen-Meldungen zum Senden");
    }

    const batch = this.buildBatch({ beitragsgrundlagen: meldungen });
    return this.submitBatch(batch);
  }

  // ==================== UV-Entgelt ====================

  /** Submit UV-Entgelt (accident insurance wage data). */
  async submitUVEntgelt(meldungen: RVUVEntgelt[]): Promise<DRVSubmissionResult> {
    if (meldungen.length === 0) {
      throw new IntegrationError("VALIDATION_ERROR", "Keine UV-Entgelt-Meldungen zum Senden");
    }

    const batch = this.buildBatch({ uvEntgelte: meldungen });
    return this.submitBatch(batch);
  }

  // ==================== Unterbrechungsmeldungen ====================

  /** Submit an interruption notification (Unterbrechungsmeldung). */
  async submitUnterbrechungsmeldung(
    meldung: RVUnterbrechungsmeldung
  ): Promise<DRVSubmissionResult> {
    const batch = this.buildBatch({ unterbrechungsmeldungen: [meldung] });
    return this.submitBatch(batch);
  }

  // ==================== VSNR ====================

  /** Request or look up a Versicherungsnummer via DSRV. */
  async anfrageVersicherungsnummer(
    anfrage: VSNRAnfrage
  ): Promise<VSNRErgebnis> {
    const batch = this.buildBatch({ vsnrAnfragen: [anfrage] });
    const xml = buildBatchXml(batch);

    const response = await this.request<string>({
      method: "POST",
      path: "/v1/dsrv/vsnr",
      body: xml,
      headers: {
        "Content-Type": "application/xml",
        "X-DRV-Betriebsnummer": this.betriebsnummer,
        "X-DRV-Absender": this.absenderBetriebsnummer,
      },
    });

    const responseXml = typeof response.data === "string" ? response.data : String(response.data);
    return parseVSNRErgebnis(responseXml);
  }

  // ==================== Kontenklaerung ====================

  /** Request Kontenklaerung (account clarification) for an insured person. */
  async anfrageKontenklärung(
    anfrage: KontenklärungsAnfrage
  ): Promise<KontenklärungsErgebnis> {
    const xml = buildKontenklärungXml(anfrage, this.absenderBetriebsnummer);

    const response = await this.request<string>({
      method: "POST",
      path: "/v1/dsrv/kontenklaerung",
      body: xml,
      headers: {
        "Content-Type": "application/xml",
        "X-DRV-Betriebsnummer": this.betriebsnummer,
        "X-DRV-Absender": this.absenderBetriebsnummer,
      },
    });

    const responseXml = typeof response.data === "string" ? response.data : String(response.data);
    return parseKontenklärungsErgebnis(responseXml);
  }

  // ==================== Batch / Status ====================

  /** Submit a full DRV data exchange batch. */
  async submitBatch(batch: DRVDatenaustauschBatch): Promise<DRVSubmissionResult> {
    const xml = buildBatchXml(batch);

    const response = await this.request<string>({
      method: "POST",
      path: "/v1/datenaustausch/submit",
      body: xml,
      headers: {
        "Content-Type": "application/xml",
        "X-DRV-Betriebsnummer": this.betriebsnummer,
        "X-DRV-Absender": this.absenderBetriebsnummer,
      },
    });

    return this.parseSubmissionResponse(response);
  }

  /** Get the status of a previous submission. */
  async getSubmissionStatus(
    datensatzId: string
  ): Promise<ApiResponse<DRVDatenaustauschStatus>> {
    return this.get<DRVDatenaustauschStatus>(
      `/v1/datenaustausch/status/${datensatzId}`,
      { betriebsnummer: this.betriebsnummer }
    );
  }

  // ==================== Query / History ====================

  /** Query submitted DRV messages. */
  async queryMeldungen(
    abfrage?: DRVAbfrage
  ): Promise<ApiResponse<DRVSubmissionResult[]>> {
    const params: Record<string, string> = {
      betriebsnummer: abfrage?.betriebsnummer ?? this.betriebsnummer,
    };
    if (abfrage?.abgabegrund) params["abgabegrund"] = abfrage.abgabegrund;
    if (abfrage?.vonDatum) params["vonDatum"] = abfrage.vonDatum;
    if (abfrage?.bisDatum) params["bisDatum"] = abfrage.bisDatum;
    if (abfrage?.limit) params["limit"] = String(abfrage.limit);

    return this.get<DRVSubmissionResult[]>("/v1/datenaustausch/meldungen", params);
  }

  // ==================== Helpers ====================

  private buildBatch(
    data: Partial<Pick<DRVDatenaustauschBatch, "beitragsgrundlagen" | "uvEntgelte" | "unterbrechungsmeldungen" | "vsnrAnfragen">>
  ): DRVDatenaustauschBatch {
    const today = new Date();
    const erstellungsdatum = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("");

    return {
      absenderBetriebsnummer: this.absenderBetriebsnummer,
      empfaengerBetriebsnummer: this.drvBundBetriebsnummer,
      erstellungsdatum,
      dateinummer: 1,
      ...data,
    };
  }

  private parseSubmissionResponse(
    response: ApiResponse<string>
  ): DRVSubmissionResult {
    const responseXml = typeof response.data === "string" ? response.data : String(response.data);
    const fehler = parseDRVFehler(responseXml);
    const warnungen = parseDRVWarnungen(responseXml);
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

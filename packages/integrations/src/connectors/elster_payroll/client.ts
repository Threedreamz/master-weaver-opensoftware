import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  ElsterPayrollCertificateConfig,
  LohnsteueranmeldungDaten,
  LStASubmissionResult,
  ELStAMAnmeldung,
  ELStAMAbmeldung,
  ELStAMErgebnis,
  ELStAMDaten,
  ELStAMAenderung,
  ElsterPayrollValidierung,
  ElsterPayrollProtokoll,
  ElsterPayrollFehler,
  LStAAnmeldungszeitraum,
} from "./types.js";

const ELSTER_BASE_URL = "https://www.elster.de/elsterweb/softwarehersteller";
const ELSTER_TEST_URL = "https://eportal-test.elster.de/elsterwebtk";

// ==================== XML Builders ====================

function buildLStAXml(daten: LohnsteueranmeldungDaten, testfall: boolean): string {
  const zeitraumKz = zeitraumToKennzeichen(daten.anmeldungszeitraum, daten.zeitraum);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Elster xmlns="http://www.elster.de/elsterxml/schema/v11">
  <TransferHeader>
    <Verfahren>ElsterLohn</Verfahren>
    <DatenArt>LStA</DatenArt>
    <Vorgang>${testfall ? "send-NoSig-Testfall" : "send-Auth"}</Vorgang>
    <Testmerker>${testfall ? "700000004" : "0"}</Testmerker>
    <HerstelID>00000</HerstellerID>
    <DatenLieferant>OpenSoftware Payroll</DatenLieferant>
  </TransferHeader>
  <DatenTeil>
    <Nutzdatenblock>
      <NutzdatenHeader>
        <NutzdatenTicket>1</NutzdatenTicket>
        <Empfaenger id="F">F${daten.finanzamtsnummer}</Empfaenger>
      </NutzdatenHeader>
      <Nutzdaten>
        <Anmeldungssteuern art="LStA" version="202401">
          <Steuerfall>
            <Steuernummer>${escapeXml(daten.steuernummer)}</Steuernummer>
            <Zeitraum>${zeitraumKz}</Zeitraum>
            <Jahr>${daten.jahr}</Jahr>
            ${daten.berichtigteAnmeldung ? "<BerichtigteAnmeldung>1</BerichtigteAnmeldung>" : ""}
            ${daten.verrechnungErwuenscht ? "<VerrechnungErwuenscht>1</VerrechnungErwuenscht>" : ""}
            <Kz41>${daten.anzahlArbeitnehmer}</Kz41>
            <Kz42>${daten.summeLohnsteuer}</Kz42>
            <Kz43>${daten.solidaritaetszuschlag}</Kz43>
            <Kz44>${daten.kirchensteuerEvangelisch}</Kz44>
            <Kz45>${daten.kirchensteuerKatholisch}</Kz45>
            ${daten.pauschaleLohnsteuer37b != null ? `<Kz46>${daten.pauschaleLohnsteuer37b}</Kz46>` : ""}
            ${daten.pauschaleLohnsteuer40 != null ? `<Kz47>${daten.pauschaleLohnsteuer40}</Kz47>` : ""}
            ${daten.pauschaleLohnsteuer40a != null ? `<Kz48>${daten.pauschaleLohnsteuer40a}</Kz48>` : ""}
            ${daten.pauschaleLohnsteuer40b != null ? `<Kz49>${daten.pauschaleLohnsteuer40b}</Kz49>` : ""}
            ${daten.anrechnungLohnsteuer != null ? `<Kz50>${daten.anrechnungLohnsteuer}</Kz50>` : ""}
            ${buildZusaetzlicheKennzahlenXml(daten.zusaetzlicheKennzahlen)}
          </Steuerfall>
        </Anmeldungssteuern>
      </Nutzdaten>
    </Nutzdatenblock>
  </DatenTeil>
</Elster>`;
}

function buildELStAMAnmeldungXml(anmeldung: ELStAMAnmeldung): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Elster xmlns="http://www.elster.de/elsterxml/schema/v11">
  <TransferHeader>
    <Verfahren>ElsterLohn</Verfahren>
    <DatenArt>ELStAM</DatenArt>
    <Vorgang>send-Auth</Vorgang>
  </TransferHeader>
  <DatenTeil>
    <Nutzdatenblock>
      <NutzdatenHeader>
        <NutzdatenTicket>1</NutzdatenTicket>
      </NutzdatenHeader>
      <Nutzdaten>
        <ELStAM>
          <Anmeldung>
            <IdNr>${escapeXml(anmeldung.identifikationsnummer)}</IdNr>
            <Geburtsdatum>${escapeXml(anmeldung.geburtsdatum)}</Geburtsdatum>
            <ErstesDienstverhaeltnis>${anmeldung.erstesDienstverhaeltnis ? "1" : "0"}</ErstesDienstverhaeltnis>
            <Referenznummer>${escapeXml(anmeldung.referenznummer)}</Referenznummer>
            <Beschaeftigungsbeginn>${escapeXml(anmeldung.beschaeftigungsbeginn)}</Beschaeftigungsbeginn>
            <ArbeitgeberStNr>${escapeXml(anmeldung.arbeitgeberSteuernummer)}</ArbeitgeberStNr>
          </Anmeldung>
        </ELStAM>
      </Nutzdaten>
    </Nutzdatenblock>
  </DatenTeil>
</Elster>`;
}

function buildELStAMAbmeldungXml(abmeldung: ELStAMAbmeldung): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Elster xmlns="http://www.elster.de/elsterxml/schema/v11">
  <TransferHeader>
    <Verfahren>ElsterLohn</Verfahren>
    <DatenArt>ELStAM</DatenArt>
    <Vorgang>send-Auth</Vorgang>
  </TransferHeader>
  <DatenTeil>
    <Nutzdatenblock>
      <NutzdatenHeader>
        <NutzdatenTicket>1</NutzdatenTicket>
      </NutzdatenHeader>
      <Nutzdaten>
        <ELStAM>
          <Abmeldung>
            <IdNr>${escapeXml(abmeldung.identifikationsnummer)}</IdNr>
            <Referenznummer>${escapeXml(abmeldung.referenznummer)}</Referenznummer>
            <Beschaeftigungsende>${escapeXml(abmeldung.beschaeftigungsende)}</Beschaeftigungsende>
            <ArbeitgeberStNr>${escapeXml(abmeldung.arbeitgeberSteuernummer)}</ArbeitgeberStNr>
          </Abmeldung>
        </ELStAM>
      </Nutzdaten>
    </Nutzdatenblock>
  </DatenTeil>
</Elster>`;
}

function zeitraumToKennzeichen(
  anmeldungszeitraum: LStAAnmeldungszeitraum,
  zeitraum: number
): string {
  switch (anmeldungszeitraum) {
    case "monatlich":
      return String(zeitraum).padStart(2, "0");
    case "vierteljaehrlich":
      return `Q${zeitraum}`;
    case "jaehrlich":
      return "00";
  }
}

function buildZusaetzlicheKennzahlenXml(
  kennzahlen?: Record<string, number>
): string {
  if (!kennzahlen) return "";
  return Object.entries(kennzahlen)
    .map(([kz, betrag]) => `<Kz${escapeXml(kz)}>${betrag}</Kz${escapeXml(kz)}>`)
    .join("\n            ");
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

function parseTransferTicket(responseXml: string): string | undefined {
  const match = responseXml.match(/<TransferTicket>([^<]+)<\/TransferTicket>/);
  return match?.[1];
}

function parseFehler(responseXml: string): ElsterPayrollFehler[] {
  const fehlerList: ElsterPayrollFehler[] = [];
  const fehlerPattern = /<Fehler>\s*<Code>(\d+)<\/Code>\s*<Nachricht>([^<]*)<\/Nachricht>(?:\s*<FeldReferenz>([^<]*)<\/FeldReferenz>)?\s*<\/Fehler>/g;
  let match: RegExpExecArray | null;
  while ((match = fehlerPattern.exec(responseXml)) !== null) {
    fehlerList.push({
      code: parseInt(match[1], 10),
      nachricht: match[2],
      feldReferenz: match[3],
      schweregrad: "fehler",
    });
  }
  return fehlerList;
}

function parseELStAMDaten(responseXml: string): ELStAMDaten[] {
  const datenList: ELStAMDaten[] = [];
  const blockPattern = /<ELStAMDaten>([\s\S]*?)<\/ELStAMDaten>/g;
  let block: RegExpExecArray | null;

  while ((block = blockPattern.exec(responseXml)) !== null) {
    const xml = block[1];
    datenList.push({
      identifikationsnummer: extractXmlValue(xml, "IdNr") ?? "",
      referenznummer: extractXmlValue(xml, "Referenznummer") ?? "",
      steuerklasse: parseInt(extractXmlValue(xml, "Steuerklasse") ?? "1", 10) as 1 | 2 | 3 | 4 | 5 | 6,
      faktor: extractXmlValue(xml, "Faktor") ? parseFloat(extractXmlValue(xml, "Faktor")!) : undefined,
      kinderfreibetraege: parseFloat(extractXmlValue(xml, "Kinderfreibetraege") ?? "0"),
      konfessionArbeitnehmer: (extractXmlValue(xml, "KonfessionArbeitnehmer") ?? "none") as ELStAMDaten["konfessionArbeitnehmer"],
      konfessionEhegatte: extractXmlValue(xml, "KonfessionEhegatte") as ELStAMDaten["konfessionEhegatte"],
      freibetragMonatlich: extractXmlNumberValue(xml, "FreibetragMonatlich"),
      freibetragJaehrlich: extractXmlNumberValue(xml, "FreibetragJaehrlich"),
      hinzurechnungsbetragMonatlich: extractXmlNumberValue(xml, "HinzurechnungsbetragMonatlich"),
      hinzurechnungsbetragJaehrlich: extractXmlNumberValue(xml, "HinzurechnungsbetragJaehrlich"),
      gueltigAb: extractXmlValue(xml, "GueltigAb") ?? "",
      gueltigBis: extractXmlValue(xml, "GueltigBis"),
    });
  }

  return datenList;
}

function parseELStAMAenderungen(responseXml: string): ELStAMAenderung[] {
  const aenderungen: ELStAMAenderung[] = [];
  const blockPattern = /<Aenderung>([\s\S]*?)<\/Aenderung>/g;
  let block: RegExpExecArray | null;

  while ((block = blockPattern.exec(responseXml)) !== null) {
    const xml = block[1];
    const neueDatenXml = xml.match(/<NeueDaten>([\s\S]*?)<\/NeueDaten>/)?.[1] ?? "";
    const neueDatenList = parseELStAMDaten(`<ELStAMDaten>${neueDatenXml}</ELStAMDaten>`);

    aenderungen.push({
      identifikationsnummer: extractXmlValue(xml, "IdNr") ?? "",
      referenznummer: extractXmlValue(xml, "Referenznummer") ?? "",
      aenderungsdatum: extractXmlValue(xml, "Aenderungsdatum") ?? "",
      neueDaten: neueDatenList[0] ?? {
        identifikationsnummer: "",
        referenznummer: "",
        steuerklasse: 1,
        kinderfreibetraege: 0,
        konfessionArbeitnehmer: "none",
        gueltigAb: "",
      },
    });
  }

  return aenderungen;
}

function extractXmlValue(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return match?.[1];
}

function extractXmlNumberValue(xml: string, tag: string): number | undefined {
  const val = extractXmlValue(xml, tag);
  return val != null ? parseInt(val, 10) : undefined;
}

// ==================== Client ====================

/**
 * ELSTER Lohnsteuer client for payroll tax operations.
 *
 * Handles Lohnsteueranmeldung (LStA) and ELStAM
 * (Elektronische Lohnsteuerabzugsmerkmale) via the ELSTER/ERiC interface.
 *
 * Certificate-based authentication is required.
 */
export class ElsterPayrollClient extends BaseIntegrationClient {
  private readonly arbeitgeberSteuernummer: string;
  private readonly finanzamtsnummer: string;
  private readonly testMode: boolean;

  constructor(config: ElsterPayrollCertificateConfig) {
    const baseUrl = config.testMode ? ELSTER_TEST_URL : ELSTER_BASE_URL;

    super({
      baseUrl,
      authType: "custom",
      credentials: {
        certificatePath: config.certificatePath,
        certificatePin: config.certificatePin,
      },
      timeout: config.timeout ?? 60_000,
      rateLimit: { requestsPerMinute: 10 },
      defaultHeaders: {
        "Content-Type": "application/xml",
        Accept: "application/xml",
      },
    });

    this.arbeitgeberSteuernummer = config.arbeitgeberSteuernummer;
    this.finanzamtsnummer = config.finanzamtsnummer;
    this.testMode = config.testMode ?? false;
  }

  // ==================== LStA ====================

  /** Validate a Lohnsteueranmeldung before submission. */
  async validateLohnsteueranmeldung(
    daten: LohnsteueranmeldungDaten
  ): Promise<ElsterPayrollValidierung> {
    const xml = buildLStAXml(daten, this.testMode);

    const response = await this.request<string>({
      method: "POST",
      path: "/api/v1/validate",
      body: xml,
      headers: {
        "Content-Type": "application/xml",
        "X-ELSTER-Vorgang": "validate",
        "X-ELSTER-DatenArt": "LStA",
      },
    });

    const responseXml = typeof response.data === "string" ? response.data : String(response.data);
    const fehler = parseFehler(responseXml);
    const gueltig = fehler.length === 0;

    return {
      gueltig,
      fehler,
      validierterXmlInhalt: gueltig ? xml : undefined,
    };
  }

  /** Submit a Lohnsteueranmeldung (payroll tax declaration). */
  async submitLohnsteueranmeldung(
    daten: LohnsteueranmeldungDaten
  ): Promise<LStASubmissionResult> {
    const xml = buildLStAXml(daten, this.testMode);

    const response = await this.request<string>({
      method: "POST",
      path: "/api/v1/submit",
      body: xml,
      headers: {
        "Content-Type": "application/xml",
        "X-ELSTER-Vorgang": this.testMode ? "send-NoSig-Testfall" : "send-Auth",
        "X-ELSTER-DatenArt": "LStA",
        "X-ELSTER-Steuernummer": this.arbeitgeberSteuernummer,
      },
    });

    const responseXml = typeof response.data === "string" ? response.data : String(response.data);
    const fehler = parseFehler(responseXml);
    const transferTicket = parseTransferTicket(responseXml);

    return {
      erfolg: fehler.length === 0 && transferTicket != null,
      transferTicket,
      serverAntwort: responseXml,
      fehler: fehler.length > 0 ? fehler : undefined,
    };
  }

  // ==================== ELStAM ====================

  /** Register a new employee for ELStAM data retrieval (Anmeldung). */
  async elstamAnmeldung(
    anmeldung: ELStAMAnmeldung
  ): Promise<ELStAMErgebnis> {
    const xml = buildELStAMAnmeldungXml(anmeldung);

    const response = await this.request<string>({
      method: "POST",
      path: "/api/v1/elstam/anmeldung",
      body: xml,
      headers: {
        "Content-Type": "application/xml",
        "X-ELSTER-DatenArt": "ELStAM",
        "X-ELSTER-Steuernummer": this.arbeitgeberSteuernummer,
      },
    });

    const responseXml = typeof response.data === "string" ? response.data : String(response.data);
    const fehler = parseFehler(responseXml);
    const transferTicket = parseTransferTicket(responseXml);

    return {
      erfolg: fehler.length === 0,
      transferTicket,
      fehler: fehler.length > 0 ? fehler : undefined,
    };
  }

  /** Deregister an employee from ELStAM (Abmeldung). */
  async elstamAbmeldung(
    abmeldung: ELStAMAbmeldung
  ): Promise<ELStAMErgebnis> {
    const xml = buildELStAMAbmeldungXml(abmeldung);

    const response = await this.request<string>({
      method: "POST",
      path: "/api/v1/elstam/abmeldung",
      body: xml,
      headers: {
        "Content-Type": "application/xml",
        "X-ELSTER-DatenArt": "ELStAM",
        "X-ELSTER-Steuernummer": this.arbeitgeberSteuernummer,
      },
    });

    const responseXml = typeof response.data === "string" ? response.data : String(response.data);
    const fehler = parseFehler(responseXml);
    const transferTicket = parseTransferTicket(responseXml);

    return {
      erfolg: fehler.length === 0,
      transferTicket,
      fehler: fehler.length > 0 ? fehler : undefined,
    };
  }

  /** Retrieve current ELStAM data for an employee (Abruf). */
  async elstamAbruf(
    identifikationsnummer: string,
    referenznummer: string
  ): Promise<ELStAMErgebnis> {
    const response = await this.request<string>({
      method: "POST",
      path: "/api/v1/elstam/abruf",
      body: `<?xml version="1.0" encoding="UTF-8"?>
<Elster xmlns="http://www.elster.de/elsterxml/schema/v11">
  <TransferHeader>
    <Verfahren>ElsterLohn</Verfahren>
    <DatenArt>ELStAM</DatenArt>
    <Vorgang>send-Auth</Vorgang>
  </TransferHeader>
  <DatenTeil>
    <Nutzdatenblock>
      <NutzdatenHeader>
        <NutzdatenTicket>1</NutzdatenTicket>
      </NutzdatenHeader>
      <Nutzdaten>
        <ELStAM>
          <Abruf>
            <IdNr>${escapeXml(identifikationsnummer)}</IdNr>
            <Referenznummer>${escapeXml(referenznummer)}</Referenznummer>
            <ArbeitgeberStNr>${escapeXml(this.arbeitgeberSteuernummer)}</ArbeitgeberStNr>
          </Abruf>
        </ELStAM>
      </Nutzdaten>
    </Nutzdatenblock>
  </DatenTeil>
</Elster>`,
      headers: {
        "Content-Type": "application/xml",
        "X-ELSTER-DatenArt": "ELStAM",
        "X-ELSTER-Steuernummer": this.arbeitgeberSteuernummer,
      },
    });

    const responseXml = typeof response.data === "string" ? response.data : String(response.data);
    const fehler = parseFehler(responseXml);
    const daten = parseELStAMDaten(responseXml);
    const transferTicket = parseTransferTicket(responseXml);

    return {
      erfolg: fehler.length === 0,
      daten: daten.length > 0 ? daten : undefined,
      transferTicket,
      fehler: fehler.length > 0 ? fehler : undefined,
    };
  }

  /** Retrieve the ELStAM changes list (Aenderungsliste). */
  async elstamAenderungsliste(): Promise<ELStAMErgebnis> {
    const response = await this.request<string>({
      method: "POST",
      path: "/api/v1/elstam/aenderungsliste",
      body: `<?xml version="1.0" encoding="UTF-8"?>
<Elster xmlns="http://www.elster.de/elsterxml/schema/v11">
  <TransferHeader>
    <Verfahren>ElsterLohn</Verfahren>
    <DatenArt>ELStAM</DatenArt>
    <Vorgang>send-Auth</Vorgang>
  </TransferHeader>
  <DatenTeil>
    <Nutzdatenblock>
      <NutzdatenHeader>
        <NutzdatenTicket>1</NutzdatenTicket>
      </NutzdatenHeader>
      <Nutzdaten>
        <ELStAM>
          <Aenderungsliste>
            <ArbeitgeberStNr>${escapeXml(this.arbeitgeberSteuernummer)}</ArbeitgeberStNr>
          </Aenderungsliste>
        </ELStAM>
      </Nutzdaten>
    </Nutzdatenblock>
  </DatenTeil>
</Elster>`,
      headers: {
        "Content-Type": "application/xml",
        "X-ELSTER-DatenArt": "ELStAM",
        "X-ELSTER-Steuernummer": this.arbeitgeberSteuernummer,
      },
    });

    const responseXml = typeof response.data === "string" ? response.data : String(response.data);
    const fehler = parseFehler(responseXml);
    const aenderungen = parseELStAMAenderungen(responseXml);
    const transferTicket = parseTransferTicket(responseXml);

    return {
      erfolg: fehler.length === 0,
      aenderungen: aenderungen.length > 0 ? aenderungen : undefined,
      transferTicket,
      fehler: fehler.length > 0 ? fehler : undefined,
    };
  }

  // ==================== Protocol ====================

  /** Retrieve submission protocols (Bescheide). */
  async getProtokolle(
    options?: { vorgangstyp?: ElsterPayrollProtokoll["vorgangstyp"]; limit?: number }
  ): Promise<ApiResponse<ElsterPayrollProtokoll[]>> {
    const params: Record<string, string> = {};
    if (options?.vorgangstyp) params["vorgangstyp"] = options.vorgangstyp;
    if (options?.limit) params["limit"] = String(options.limit);

    return this.get<ElsterPayrollProtokoll[]>("/api/v1/protokolle", params);
  }
}

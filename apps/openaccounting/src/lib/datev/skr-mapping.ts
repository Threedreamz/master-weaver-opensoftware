/**
 * SKR03 and SKR04 standard chart of accounts (Kontenrahmen) mappings.
 *
 * These are the two most widely used standard charts of accounts in Germany:
 *   - SKR03: Process-oriented (Prozessgliederungsprinzip)
 *   - SKR04: Function-oriented (Abschlussgliederungsprinzip)
 *
 * The mappings below cover the most commonly used accounts.
 * A full SKR has ~1000+ accounts; this includes the essential ones
 * needed for basic bookkeeping and DATEV export.
 */

export interface SkrAccount {
  name: string;
  category: "Aktiv" | "Passiv" | "Aufwand" | "Ertrag" | "Neutral";
}

// ==================== SKR03 ====================

export const SKR03: Record<string, SkrAccount> = {
  // Klasse 0: Anlage- und Kapitalkonten
  "0200": { name: "Technische Anlagen und Maschinen", category: "Aktiv" },
  "0400": { name: "Betriebs- und Geschaeftsausstattung", category: "Aktiv" },
  "0650": { name: "Bueroeinrichtung", category: "Aktiv" },
  "0800": { name: "Gezeichnetes Kapital", category: "Passiv" },

  // Klasse 1: Finanz- und Privatkonten
  "1000": { name: "Kasse", category: "Aktiv" },
  "1200": { name: "Bank", category: "Aktiv" },
  "1210": { name: "Bank 2", category: "Aktiv" },
  "1300": { name: "Wechsel", category: "Aktiv" },
  "1360": { name: "Geldtransit", category: "Aktiv" },
  "1400": { name: "Forderungen aus Lieferungen und Leistungen", category: "Aktiv" },
  "1500": { name: "Sonstige Vermoegensgegenstande", category: "Aktiv" },
  "1548": { name: "Vorsteuer im Folgejahr abziehbar", category: "Aktiv" },
  "1570": { name: "Abziehbare Vorsteuer 7%", category: "Aktiv" },
  "1576": { name: "Abziehbare Vorsteuer 19%", category: "Aktiv" },
  "1580": { name: "Abziehbare Vorsteuer nach §13b UStG", category: "Aktiv" },
  "1590": { name: "Durchlaufende Posten", category: "Aktiv" },
  "1600": { name: "Verbindlichkeiten aus Lieferungen und Leistungen", category: "Passiv" },
  "1700": { name: "Sonstige Verbindlichkeiten", category: "Passiv" },
  "1740": { name: "Verbindlichkeiten aus Steuern und Abgaben", category: "Passiv" },
  "1755": { name: "Lohnsteuer", category: "Passiv" },
  "1770": { name: "Umsatzsteuer 7%", category: "Passiv" },
  "1775": { name: "Umsatzsteuer 19%", category: "Passiv" },
  "1776": { name: "Umsatzsteuer nicht faellig", category: "Passiv" },
  "1780": { name: "Umsatzsteuer-Vorauszahlung", category: "Passiv" },
  "1790": { name: "Umsatzsteuer Vorjahr", category: "Passiv" },
  "1800": { name: "Privatentnahmen allgemein", category: "Neutral" },
  "1890": { name: "Privateinlagen", category: "Neutral" },

  // Klasse 2: Abgrenzungskonten (not commonly needed for basic bookkeeping)

  // Klasse 3: Wareneingangskonten
  "3000": { name: "Roh-, Hilfs- und Betriebsstoffe", category: "Aufwand" },
  "3100": { name: "Fremdleistungen", category: "Aufwand" },
  "3300": { name: "Wareneingang 7% Vorsteuer", category: "Aufwand" },
  "3400": { name: "Wareneingang 19% Vorsteuer", category: "Aufwand" },

  // Klasse 4: Betriebliche Aufwendungen
  "4100": { name: "Loehne", category: "Aufwand" },
  "4120": { name: "Gehaelter", category: "Aufwand" },
  "4130": { name: "Gesetzliche soziale Aufwendungen", category: "Aufwand" },
  "4200": { name: "Raumkosten", category: "Aufwand" },
  "4210": { name: "Miete (unbewegliche Wirtschaftsgueter)", category: "Aufwand" },
  "4240": { name: "Heizung", category: "Aufwand" },
  "4250": { name: "Strom, Gas, Wasser", category: "Aufwand" },
  "4260": { name: "Reinigung", category: "Aufwand" },
  "4300": { name: "Beitraege und Versicherungen", category: "Aufwand" },
  "4360": { name: "Buerokosten", category: "Aufwand" },
  "4400": { name: "Erloese 19% USt", category: "Ertrag" },
  "4500": { name: "Fahrzeugkosten", category: "Aufwand" },
  "4510": { name: "Kfz-Steuer", category: "Aufwand" },
  "4520": { name: "Kfz-Versicherung", category: "Aufwand" },
  "4530": { name: "Kfz-Reparaturen", category: "Aufwand" },
  "4540": { name: "Kfz-Betriebskosten", category: "Aufwand" },
  "4600": { name: "Werbekosten", category: "Aufwand" },
  "4610": { name: "Werbekosten 19% Vorsteuer", category: "Aufwand" },
  "4650": { name: "Bewirtungskosten", category: "Aufwand" },
  "4654": { name: "Nicht abzugsfaehige Bewirtungskosten", category: "Aufwand" },
  "4660": { name: "Reisekosten Unternehmer", category: "Aufwand" },
  "4670": { name: "Reisekosten Arbeitnehmer", category: "Aufwand" },
  "4700": { name: "Kosten der Warenabgabe", category: "Aufwand" },
  "4780": { name: "Fremdarbeiten / Fremdleistungen", category: "Aufwand" },
  "4800": { name: "Reparatur und Instandhaltung", category: "Aufwand" },
  "4830": { name: "Abschreibungen auf Sachanlagen", category: "Aufwand" },
  "4900": { name: "Sonstige betriebliche Aufwendungen", category: "Aufwand" },
  "4910": { name: "Porto", category: "Aufwand" },
  "4920": { name: "Telefon", category: "Aufwand" },
  "4930": { name: "Buromaterial", category: "Aufwand" },
  "4940": { name: "Zeitungen, Buecher", category: "Aufwand" },
  "4950": { name: "Rechts- und Beratungskosten", category: "Aufwand" },
  "4955": { name: "Buchfuehrungskosten", category: "Aufwand" },
  "4960": { name: "Nebenkosten des Geldverkehrs", category: "Aufwand" },
  "4970": { name: "Kosten des Geldverkehrs", category: "Aufwand" },

  // Klasse 8: Erloeskonten
  "8000": { name: "Erloese Inland", category: "Ertrag" },
  "8100": { name: "Steuerfreie Umsaetze §4 Nr. 1a UStG", category: "Ertrag" },
  "8120": { name: "Steuerfreie innergemeinschaftliche Lieferungen", category: "Ertrag" },
  "8125": { name: "Steuerfreie ig Lieferungen §4 Nr. 1b UStG", category: "Ertrag" },
  "8300": { name: "Erloese 7% USt", category: "Ertrag" },
  "8400": { name: "Erloese 19% USt", category: "Ertrag" },
  "8500": { name: "Provisionserlöse", category: "Ertrag" },
  "8700": { name: "Erloese aus Anlageverkaeufen", category: "Ertrag" },
  "8900": { name: "Sonstige Erloese", category: "Ertrag" },
};

// ==================== SKR04 ====================

export const SKR04: Record<string, SkrAccount> = {
  // Klasse 0: Anlagevermögen
  "0200": { name: "Technische Anlagen und Maschinen", category: "Aktiv" },
  "0400": { name: "Betriebs- und Geschaeftsausstattung", category: "Aktiv" },
  "0650": { name: "Bueroeinrichtung", category: "Aktiv" },

  // Klasse 1: Umlaufvermögen
  "1000": { name: "Kasse", category: "Aktiv" },
  "1200": { name: "Bank", category: "Aktiv" },
  "1210": { name: "Bank 2", category: "Aktiv" },
  "1400": { name: "Forderungen aus Lieferungen und Leistungen", category: "Aktiv" },
  "1500": { name: "Sonstige Vermoegensgegenstaende", category: "Aktiv" },
  "1570": { name: "Abziehbare Vorsteuer 7%", category: "Aktiv" },
  "1576": { name: "Abziehbare Vorsteuer 19%", category: "Aktiv" },

  // Klasse 2: Eigenkapital
  "2000": { name: "Gezeichnetes Kapital", category: "Passiv" },

  // Klasse 3: Verbindlichkeiten
  "3300": { name: "Verbindlichkeiten aus Lieferungen und Leistungen", category: "Passiv" },
  "3500": { name: "Sonstige Verbindlichkeiten", category: "Passiv" },
  "3800": { name: "Umsatzsteuer 19%", category: "Passiv" },
  "3801": { name: "Umsatzsteuer 7%", category: "Passiv" },
  "3806": { name: "Umsatzsteuer-Vorauszahlung", category: "Passiv" },
  "3820": { name: "Umsatzsteuer Vorjahr", category: "Passiv" },

  // Klasse 4: Erloese
  "4000": { name: "Umsatzerloese", category: "Ertrag" },
  "4100": { name: "Steuerfreie Umsaetze", category: "Ertrag" },
  "4120": { name: "Steuerfreie innergemeinschaftliche Lieferungen", category: "Ertrag" },
  "4300": { name: "Erloese 7% USt", category: "Ertrag" },
  "4400": { name: "Erloese 19% USt", category: "Ertrag" },

  // Klasse 5: Material- und Wareneinkauf
  "5000": { name: "Aufwendungen fuer Roh-, Hilfs- und Betriebsstoffe", category: "Aufwand" },
  "5100": { name: "Einkauf von Waren", category: "Aufwand" },
  "5300": { name: "Fremdleistungen", category: "Aufwand" },

  // Klasse 6: Personalkosten und sonstige Aufwendungen
  "6000": { name: "Loehne", category: "Aufwand" },
  "6020": { name: "Gehaelter", category: "Aufwand" },
  "6100": { name: "Soziale Abgaben und Aufwendungen", category: "Aufwand" },
  "6200": { name: "Abschreibungen", category: "Aufwand" },
  "6300": { name: "Sonstige betriebliche Aufwendungen", category: "Aufwand" },
  "6310": { name: "Miete", category: "Aufwand" },
  "6320": { name: "Heizung, Strom, Wasser", category: "Aufwand" },
  "6400": { name: "Versicherungen", category: "Aufwand" },
  "6500": { name: "Fahrzeugkosten", category: "Aufwand" },
  "6600": { name: "Werbekosten", category: "Aufwand" },
  "6700": { name: "Reisekosten", category: "Aufwand" },
  "6800": { name: "Porto, Telefon", category: "Aufwand" },
  "6815": { name: "Telefon", category: "Aufwand" },
  "6820": { name: "Burobedarf", category: "Aufwand" },
  "6825": { name: "Rechts- und Beratungskosten", category: "Aufwand" },
  "6830": { name: "Buchfuehrungskosten", category: "Aufwand" },
  "6855": { name: "Nebenkosten des Geldverkehrs", category: "Aufwand" },
  "6900": { name: "Sonstige Aufwendungen", category: "Aufwand" },
};

/**
 * Cross-reference table: maps SKR03 accounts to their SKR04 equivalents
 * and vice versa. Used when switching Kontenrahmen or for DATEV export
 * compatibility.
 */
export const SKR03_TO_SKR04: Record<string, string> = {
  "1000": "1000", // Kasse
  "1200": "1200", // Bank
  "1400": "1400", // Forderungen
  "1570": "1570", // Vorsteuer 7%
  "1576": "1576", // Vorsteuer 19%
  "1600": "3300", // Verbindlichkeiten
  "1775": "3800", // USt 19%
  "1770": "3801", // USt 7%
  "4120": "6020", // Gehaelter
  "4210": "6310", // Miete
  "8300": "4300", // Erloese 7%
  "8400": "4400", // Erloese 19%
  "8120": "4120", // ig Lieferungen
  "4600": "6600", // Werbekosten
  "4660": "6700", // Reisekosten
  "4910": "6800", // Porto
  "4920": "6815", // Telefon
  "4950": "6825", // Beratungskosten
  "4955": "6830", // Buchfuehrungskosten
  "4960": "6855", // Nebenkosten Geldverkehr
};

/**
 * Get the full SKR mapping for a given Kontenrahmen.
 */
export function getSkrMapping(kontenrahmen: "SKR03" | "SKR04"): Record<string, SkrAccount> {
  return kontenrahmen === "SKR03" ? SKR03 : SKR04;
}

/**
 * Look up an account name for a given number and Kontenrahmen.
 * Returns the account name or undefined if not found.
 */
export function lookupAccount(
  kontonummer: string,
  kontenrahmen: "SKR03" | "SKR04"
): SkrAccount | undefined {
  const mapping = getSkrMapping(kontenrahmen);
  return mapping[kontonummer];
}

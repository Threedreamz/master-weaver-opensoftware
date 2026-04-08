"use server";

// ==================== VIES VAT Validation ====================

export type ViesResult = {
  countryCode: string;
  vatNumber: string;
  valid: boolean;
  name: string;
  address: string;
  requestDate: string;
};

export type VatCheckResult = {
  success: boolean;
  data?: ViesResult;
  error?: string;
};

/**
 * Validate a VAT ID using the EU VIES REST API.
 * Free, no API key required. Works for all EU member states.
 * Note: Germany does not disclose company names via VIES (privacy law).
 */
export async function checkVatNumber(
  countryCode: string,
  vatNumber: string
): Promise<VatCheckResult> {
  try {
    const cleanVat = vatNumber.replace(/\s+/g, "").replace(/^[A-Z]{2}/i, "");

    const response = await fetch(
      "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: countryCode.toUpperCase(),
          vatNumber: cleanVat,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        success: false,
        error: `VIES API error (${response.status}): ${text}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        countryCode: data.countryCode,
        vatNumber: data.vatNumber,
        valid: data.valid,
        name: data.name !== "---" ? data.name : "",
        address: data.address !== "---" ? data.address : "",
        requestDate: data.requestDate,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "VAT check failed",
    };
  }
}

// ==================== Handelsregister Links ====================

export type RegisterLink = {
  name: string;
  url: string;
  description: string;
};

/**
 * Get direct links to German register search pages.
 * Since the registers don't offer public REST APIs,
 * we link users to the official search interfaces.
 */
export async function getRegisterLinks(): Promise<RegisterLink[]> {
  return [
    {
      name: "Handelsregister",
      url: "https://www.handelsregister.de/rp_web/normalesuche.xhtml",
      description: "Official German Commercial Register — search by company name, register number, or court",
    },
    {
      name: "Unternehmensregister",
      url: "https://www.unternehmensregister.de/ureg/de/suche",
      description: "German Company Register — financial statements, shareholder lists, announcements",
    },
    {
      name: "Bundesanzeiger",
      url: "https://www.bundesanzeiger.de/pub/de/suchen",
      description: "Federal Gazette — published annual reports, insolvency notices, corporate actions",
    },
    {
      name: "Insolvenzbekanntmachungen",
      url: "https://www.insolvenzbekanntmachungen.de/cgi-bin/bl_suche.pl",
      description: "Insolvency announcements — check for active insolvency proceedings",
    },
    {
      name: "EU VIES",
      url: "https://ec.europa.eu/taxation_customs/vies/",
      description: "EU VAT Information Exchange System — validate VAT numbers across all EU countries",
    },
  ];
}

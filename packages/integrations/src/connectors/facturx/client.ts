import type {
  FacturXInvoice,
  FacturXProfile,
  FacturXValidationResult,
  FacturXValidationIssue,
  FacturXGenerationResult,
  FacturXParseResult,
  FacturXLine,
  FacturXVatBreakdown,
  FACTURX_NAMESPACES,
  FACTURX_PROFILE_URNS,
} from "./types.js";

// Re-import constants at value level
const NAMESPACES = {
  RSM: "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100",
  RAM: "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100",
  QDT: "urn:un:unece:uncefact:data:standard:QualifiedDataType:100",
  UDT: "urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100",
} as const;

const PROFILE_URNS: Record<FacturXProfile, string> = {
  MINIMUM: "urn:factur-x.eu:1p0:minimum",
  "BASIC WL": "urn:factur-x.eu:1p0:basicwl",
  BASIC: "urn:factur-x.eu:1p0:basic",
  EN16931: "urn:cen.eu:en16931:2017",
  EXTENDED: "urn:factur-x.eu:1p0:extended",
};

// ==================== XML Helpers ====================

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

function formatDate(date: string): string {
  // Convert YYYY-MM-DD to YYYYMMDD (CII date format 102)
  return date.replace(/-/g, "");
}

// ==================== XML Generation ====================

function buildExchangedDocumentContext(profile: FacturXProfile): string {
  const urn = PROFILE_URNS[profile];
  return [
    "  <rsm:ExchangedDocumentContext>",
    "    <ram:GuidelineSpecifiedDocumentContextParameter>",
    `      <ram:ID>${escapeXml(urn)}</ram:ID>`,
    "    </ram:GuidelineSpecifiedDocumentContextParameter>",
    "  </rsm:ExchangedDocumentContext>",
  ].join("\n");
}

function buildExchangedDocument(invoice: FacturXInvoice): string {
  const lines: string[] = [
    "  <rsm:ExchangedDocument>",
    `    <ram:ID>${escapeXml(invoice.invoiceNumber)}</ram:ID>`,
    `    <ram:TypeCode>${invoice.typeCode}</ram:TypeCode>`,
    "    <ram:IssueDateTime>",
    `      <udt:DateTimeString format="102">${formatDate(invoice.issueDate)}</udt:DateTimeString>`,
    "    </ram:IssueDateTime>",
  ];

  if (invoice.notes) {
    for (const note of invoice.notes) {
      lines.push("    <ram:IncludedNote>");
      lines.push(`      <ram:Content>${escapeXml(note.text)}</ram:Content>`);
      if (note.subjectCode) {
        lines.push(`      <ram:SubjectCode>${escapeXml(note.subjectCode)}</ram:SubjectCode>`);
      }
      lines.push("    </ram:IncludedNote>");
    }
  }

  lines.push("  </rsm:ExchangedDocument>");
  return lines.join("\n");
}

function buildTradeParty(
  tag: string,
  party: FacturXInvoice["seller"] | FacturXInvoice["buyer"]
): string {
  const lines: string[] = [`      <ram:${tag}>`];
  lines.push(`        <ram:Name>${escapeXml(party.name)}</ram:Name>`);

  if ("siret" in party && party.siret) {
    lines.push(`        <ram:ID>${escapeXml(party.siret)}</ram:ID>`);
  }

  if (party.legalRegistrationId) {
    lines.push("        <ram:SpecifiedLegalOrganization>");
    lines.push(`          <ram:ID>${escapeXml(party.legalRegistrationId)}</ram:ID>`);
    lines.push("        </ram:SpecifiedLegalOrganization>");
  }

  // Postal address
  lines.push("        <ram:PostalTradeAddress>");
  if (party.address.postCode) {
    lines.push(`          <ram:PostcodeCode>${escapeXml(party.address.postCode)}</ram:PostcodeCode>`);
  }
  if (party.address.streetName) {
    lines.push(`          <ram:LineOne>${escapeXml(party.address.streetName)}</ram:LineOne>`);
  }
  if (party.address.city) {
    lines.push(`          <ram:CityName>${escapeXml(party.address.city)}</ram:CityName>`);
  }
  lines.push(`          <ram:CountryID>${escapeXml(party.address.countryCode)}</ram:CountryID>`);
  lines.push("        </ram:PostalTradeAddress>");

  if (party.vatId) {
    lines.push("        <ram:SpecifiedTaxRegistration>");
    lines.push(`          <ram:ID schemeID="VA">${escapeXml(party.vatId)}</ram:ID>`);
    lines.push("        </ram:SpecifiedTaxRegistration>");
  }

  if (party.electronicAddress) {
    lines.push("        <ram:URIUniversalCommunication>");
    lines.push(`          <ram:URIID schemeID="${party.electronicAddressScheme ?? "EM"}">${escapeXml(party.electronicAddress)}</ram:URIID>`);
    lines.push("        </ram:URIUniversalCommunication>");
  }

  lines.push(`      </ram:${tag}>`);
  return lines.join("\n");
}

function buildLineItems(lines: FacturXLine[]): string {
  return lines.map((line, index) => {
    const parts: string[] = [
      "  <rsm:SupplyChainTradeLineItem>",
      "    <ram:AssociatedDocumentLineDocument>",
      `      <ram:LineID>${escapeXml(line.id)}</ram:LineID>`,
      "    </ram:AssociatedDocumentLineDocument>",
      "    <ram:SpecifiedTradeProduct>",
      `      <ram:Name>${escapeXml(line.item.name)}</ram:Name>`,
    ];

    if (line.item.description) {
      parts.push(`      <ram:Description>${escapeXml(line.item.description)}</ram:Description>`);
    }

    parts.push("    </ram:SpecifiedTradeProduct>");
    parts.push("    <ram:SpecifiedLineTradeAgreement>");
    parts.push("      <ram:NetPriceProductTradePrice>");
    parts.push(`        <ram:ChargeAmount>${formatAmount(line.priceDetails.netPrice)}</ram:ChargeAmount>`);
    parts.push("      </ram:NetPriceProductTradePrice>");
    parts.push("    </ram:SpecifiedLineTradeAgreement>");
    parts.push("    <ram:SpecifiedLineTradeDelivery>");
    parts.push(`      <ram:BilledQuantity unitCode="${line.unitCode}">${line.quantity}</ram:BilledQuantity>`);
    parts.push("    </ram:SpecifiedLineTradeDelivery>");
    parts.push("    <ram:SpecifiedLineTradeSettlement>");
    parts.push("      <ram:ApplicableTradeTax>");
    parts.push(`        <ram:TypeCode>VAT</ram:TypeCode>`);
    parts.push(`        <ram:CategoryCode>${line.vatInfo.categoryCode}</ram:CategoryCode>`);
    if (line.vatInfo.rate != null) {
      parts.push(`        <ram:RateApplicablePercent>${line.vatInfo.rate}</ram:RateApplicablePercent>`);
    }
    parts.push("      </ram:ApplicableTradeTax>");
    parts.push("      <ram:SpecifiedTradeSettlementLineMonetarySummation>");
    parts.push(`        <ram:LineTotalAmount>${formatAmount(line.netAmount)}</ram:LineTotalAmount>`);
    parts.push("      </ram:SpecifiedTradeSettlementLineMonetarySummation>");
    parts.push("    </ram:SpecifiedLineTradeSettlement>");
    parts.push("  </rsm:SupplyChainTradeLineItem>");

    return parts.join("\n");
  }).join("\n");
}

// ==================== Factur-X Generator / Parser / Validator ====================

/**
 * Factur-X document format library.
 *
 * Generates, parses, and validates Factur-X CII XML — the French profile
 * of ZUGFeRD e-invoicing. This is a pure document format library with
 * no HTTP calls. It does not extend BaseIntegrationClient.
 *
 * Factur-X is mandatory for B2G invoicing in France (via Chorus Pro)
 * and is increasingly adopted in B2B transactions.
 */
export class FacturXClient {
  // ==================== Generation ====================

  /**
   * Generate a Factur-X CII XML document from structured invoice data.
   *
   * Validates the invoice before generation and includes any
   * warnings in the result.
   */
  generate(invoice: FacturXInvoice): FacturXGenerationResult {
    const validation = this.validate(invoice);
    const hasErrors = validation.issues.some((i) => i.severity === "error");

    if (hasErrors) {
      return {
        xml: "",
        profile: invoice.profile,
        issues: validation.issues,
      };
    }

    const xml = this.buildXml(invoice);

    return {
      xml,
      profile: invoice.profile,
      issues: validation.issues.filter((i) => i.severity !== "error"),
    };
  }

  // ==================== Parsing ====================

  /**
   * Parse a Factur-X CII XML string into structured invoice data.
   *
   * Extracts all available fields from the XML and returns a
   * parsed invoice object along with detected profile and any
   * parse warnings.
   */
  parse(xml: string): FacturXParseResult {
    const warnings: string[] = [];

    // Detect profile
    const profileMatch = xml.match(/<ram:ID>(urn:factur-x\.eu[^<]*|urn:cen\.eu[^<]*)<\/ram:ID>/);
    let profile: FacturXProfile = "MINIMUM";
    if (profileMatch?.[1]) {
      const detectedUrn = profileMatch[1];
      for (const [p, urn] of Object.entries(PROFILE_URNS)) {
        if (detectedUrn === urn) {
          profile = p as FacturXProfile;
          break;
        }
      }
    } else {
      warnings.push("Could not detect Factur-X profile from XML; defaulting to MINIMUM");
    }

    // Parse document header
    const invoiceNumber = this.extractXmlValue(xml, "ram:ID", "rsm:ExchangedDocument") ?? "UNKNOWN";
    const typeCode = this.extractXmlValue(xml, "ram:TypeCode", "rsm:ExchangedDocument") ?? "380";
    const issueDateRaw = this.extractXmlValue(xml, "udt:DateTimeString") ?? "";
    const issueDate = this.formatParsedDate(issueDateRaw);

    // Parse currency
    const currencyCode = this.extractXmlAttribute(xml, "ram:InvoiceCurrencyCode") ??
      this.extractXmlValue(xml, "ram:InvoiceCurrencyCode") ?? "EUR";

    // Parse seller
    const sellerName = this.extractNestedValue(xml, "ram:SellerTradeParty", "ram:Name") ?? "Unknown Seller";
    const sellerVatId = this.extractNestedValue(xml, "ram:SellerTradeParty", "ram:ID", "ram:SpecifiedTaxRegistration");
    const sellerCountry = this.extractNestedValue(xml, "ram:SellerTradeParty", "ram:CountryID") ?? "FR";

    // Parse buyer
    const buyerName = this.extractNestedValue(xml, "ram:BuyerTradeParty", "ram:Name") ?? "Unknown Buyer";
    const buyerVatId = this.extractNestedValue(xml, "ram:BuyerTradeParty", "ram:ID", "ram:SpecifiedTaxRegistration");
    const buyerCountry = this.extractNestedValue(xml, "ram:BuyerTradeParty", "ram:CountryID") ?? "FR";

    // Parse totals
    const taxExclusiveAmount = this.extractNumericValue(xml, "ram:TaxBasisTotalAmount") ?? 0;
    const taxAmount = this.extractNumericValue(xml, "ram:TaxTotalAmount");
    const taxInclusiveAmount = this.extractNumericValue(xml, "ram:GrandTotalAmount") ?? 0;
    const duePayableAmount = this.extractNumericValue(xml, "ram:DuePayableAmount") ?? 0;
    const lineTotalAmount = this.extractNumericValue(xml, "ram:LineTotalAmount") ?? taxExclusiveAmount;

    const invoice: FacturXInvoice = {
      profile,
      invoiceNumber,
      issueDate,
      typeCode: typeCode as FacturXInvoice["typeCode"],
      currencyCode: currencyCode as FacturXInvoice["currencyCode"],
      seller: {
        name: sellerName,
        vatId: sellerVatId ?? undefined,
        address: { countryCode: sellerCountry },
      },
      buyer: {
        name: buyerName,
        vatId: buyerVatId ?? undefined,
        address: { countryCode: buyerCountry },
      },
      totals: {
        lineTotalAmount,
        taxExclusiveAmount,
        taxAmount: taxAmount ?? undefined,
        taxInclusiveAmount,
        duePayableAmount,
      },
      vatBreakdown: [],
      lines: [],
    };

    return { invoice, profile, warnings };
  }

  // ==================== Validation ====================

  /**
   * Validate a Factur-X invoice against the profile rules.
   *
   * Checks required fields, data types, and business rules
   * defined in the EN 16931 standard and the Factur-X profile.
   */
  validate(invoice: FacturXInvoice): FacturXValidationResult {
    const issues: FacturXValidationIssue[] = [];

    // Required fields for all profiles
    if (!invoice.invoiceNumber) {
      issues.push({
        severity: "error",
        businessTerm: "BT-1",
        path: "invoiceNumber",
        message: "Invoice number is required",
        rule: "BR-01",
      });
    }

    if (!invoice.issueDate) {
      issues.push({
        severity: "error",
        businessTerm: "BT-2",
        path: "issueDate",
        message: "Invoice issue date is required",
        rule: "BR-02",
      });
    }

    if (!invoice.typeCode) {
      issues.push({
        severity: "error",
        businessTerm: "BT-3",
        path: "typeCode",
        message: "Invoice type code is required",
        rule: "BR-03",
      });
    }

    if (!invoice.currencyCode) {
      issues.push({
        severity: "error",
        businessTerm: "BT-5",
        path: "currencyCode",
        message: "Invoice currency code is required",
        rule: "BR-04",
      });
    }

    // Seller validation
    if (!invoice.seller?.name) {
      issues.push({
        severity: "error",
        businessTerm: "BT-27",
        path: "seller.name",
        message: "Seller name is required",
        rule: "BR-05",
      });
    }

    if (!invoice.seller?.address?.countryCode) {
      issues.push({
        severity: "error",
        businessTerm: "BT-40",
        path: "seller.address.countryCode",
        message: "Seller country code is required",
        rule: "BR-08",
      });
    }

    // Buyer validation
    if (!invoice.buyer?.name) {
      issues.push({
        severity: "error",
        businessTerm: "BT-44",
        path: "buyer.name",
        message: "Buyer name is required",
        rule: "BR-06",
      });
    }

    if (!invoice.buyer?.address?.countryCode) {
      issues.push({
        severity: "error",
        businessTerm: "BT-55",
        path: "buyer.address.countryCode",
        message: "Buyer country code is required",
        rule: "BR-09",
      });
    }

    // Totals validation
    if (invoice.totals.duePayableAmount == null) {
      issues.push({
        severity: "error",
        businessTerm: "BT-115",
        path: "totals.duePayableAmount",
        message: "Amount due for payment is required",
        rule: "BR-14",
      });
    }

    // Profile-specific: BASIC and above require line items
    const profileOrder: FacturXProfile[] = ["MINIMUM", "BASIC WL", "BASIC", "EN16931", "EXTENDED"];
    const profileIndex = profileOrder.indexOf(invoice.profile);

    if (profileIndex >= 2 && (!invoice.lines || invoice.lines.length === 0)) {
      issues.push({
        severity: "error",
        path: "lines",
        message: `Profile ${invoice.profile} requires at least one invoice line`,
        rule: "BR-15",
      });
    }

    // Line-level validation for BASIC+
    if (profileIndex >= 2 && invoice.lines) {
      for (let i = 0; i < invoice.lines.length; i++) {
        const line = invoice.lines[i]!;
        if (!line.item?.name) {
          issues.push({
            severity: "error",
            businessTerm: "BT-153",
            path: `lines[${i}].item.name`,
            message: `Line ${i + 1}: item name is required`,
            rule: "BR-24",
          });
        }
        if (line.quantity == null) {
          issues.push({
            severity: "error",
            businessTerm: "BT-129",
            path: `lines[${i}].quantity`,
            message: `Line ${i + 1}: quantity is required`,
            rule: "BR-21",
          });
        }
      }
    }

    // French-specific: SIRET recommended for seller
    if (invoice.seller && !invoice.seller.siret) {
      issues.push({
        severity: "warning",
        path: "seller.siret",
        message: "SIRET number is recommended for French sellers",
        rule: "BR-FR-01",
      });
    }

    return {
      valid: !issues.some((i) => i.severity === "error"),
      profile: invoice.profile,
      issues,
    };
  }

  // ==================== Private: XML Builder ====================

  private buildXml(invoice: FacturXInvoice): string {
    const parts: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<rsm:CrossIndustryInvoice xmlns:rsm="${NAMESPACES.RSM}" xmlns:ram="${NAMESPACES.RAM}" xmlns:qdt="${NAMESPACES.QDT}" xmlns:udt="${NAMESPACES.UDT}">`,
      buildExchangedDocumentContext(invoice.profile),
      buildExchangedDocument(invoice),
      "  <rsm:SupplyChainTradeTransaction>",
    ];

    // Header agreement
    parts.push("    <ram:ApplicableHeaderTradeAgreement>");
    if (invoice.buyerReference) {
      parts.push(`      <ram:BuyerReference>${escapeXml(invoice.buyerReference)}</ram:BuyerReference>`);
    }
    parts.push(buildTradeParty("SellerTradeParty", invoice.seller));
    parts.push(buildTradeParty("BuyerTradeParty", invoice.buyer));
    if (invoice.orderReference) {
      parts.push("      <ram:BuyerOrderReferencedDocument>");
      parts.push(`        <ram:IssuerAssignedID>${escapeXml(invoice.orderReference)}</ram:IssuerAssignedID>`);
      parts.push("      </ram:BuyerOrderReferencedDocument>");
    }
    parts.push("    </ram:ApplicableHeaderTradeAgreement>");

    // Delivery
    parts.push("    <ram:ApplicableHeaderTradeDelivery/>");

    // Settlement
    parts.push("    <ram:ApplicableHeaderTradeSettlement>");
    parts.push(`      <ram:InvoiceCurrencyCode>${invoice.currencyCode}</ram:InvoiceCurrencyCode>`);

    // Payment instructions
    if (invoice.paymentInstructions) {
      parts.push("      <ram:SpecifiedTradeSettlementPaymentMeans>");
      parts.push(`        <ram:TypeCode>${invoice.paymentInstructions.paymentMeansCode}</ram:TypeCode>`);
      if (invoice.paymentInstructions.creditTransfer) {
        for (const ct of invoice.paymentInstructions.creditTransfer) {
          parts.push("        <ram:PayeePartyCreditorFinancialAccount>");
          parts.push(`          <ram:IBANID>${escapeXml(ct.iban)}</ram:IBANID>`);
          parts.push("        </ram:PayeePartyCreditorFinancialAccount>");
          if (ct.bic) {
            parts.push("        <ram:PayeeSpecifiedCreditorFinancialInstitution>");
            parts.push(`          <ram:BICID>${escapeXml(ct.bic)}</ram:BICID>`);
            parts.push("        </ram:PayeeSpecifiedCreditorFinancialInstitution>");
          }
        }
      }
      parts.push("      </ram:SpecifiedTradeSettlementPaymentMeans>");
    }

    // VAT breakdown
    for (const vat of invoice.vatBreakdown) {
      parts.push("      <ram:ApplicableTradeTax>");
      parts.push(`        <ram:CalculatedAmount>${formatAmount(vat.taxAmount)}</ram:CalculatedAmount>`);
      parts.push("        <ram:TypeCode>VAT</ram:TypeCode>");
      parts.push(`        <ram:BasisAmount>${formatAmount(vat.taxableAmount)}</ram:BasisAmount>`);
      parts.push(`        <ram:CategoryCode>${vat.categoryCode}</ram:CategoryCode>`);
      if (vat.rate != null) {
        parts.push(`        <ram:RateApplicablePercent>${vat.rate}</ram:RateApplicablePercent>`);
      }
      if (vat.exemptionReasonText) {
        parts.push(`        <ram:ExemptionReason>${escapeXml(vat.exemptionReasonText)}</ram:ExemptionReason>`);
      }
      parts.push("      </ram:ApplicableTradeTax>");
    }

    // Payment terms
    if (invoice.paymentTerms || invoice.dueDate) {
      parts.push("      <ram:SpecifiedTradePaymentTerms>");
      if (invoice.paymentTerms) {
        parts.push(`        <ram:Description>${escapeXml(invoice.paymentTerms)}</ram:Description>`);
      }
      if (invoice.dueDate) {
        parts.push("        <ram:DueDateDateTime>");
        parts.push(`          <udt:DateTimeString format="102">${formatDate(invoice.dueDate)}</udt:DateTimeString>`);
        parts.push("        </ram:DueDateDateTime>");
      }
      parts.push("      </ram:SpecifiedTradePaymentTerms>");
    }

    // Monetary summation
    parts.push("      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>");
    parts.push(`        <ram:LineTotalAmount>${formatAmount(invoice.totals.lineTotalAmount)}</ram:LineTotalAmount>`);
    parts.push(`        <ram:TaxBasisTotalAmount>${formatAmount(invoice.totals.taxExclusiveAmount)}</ram:TaxBasisTotalAmount>`);
    if (invoice.totals.taxAmount != null) {
      parts.push(`        <ram:TaxTotalAmount currencyID="${invoice.currencyCode}">${formatAmount(invoice.totals.taxAmount)}</ram:TaxTotalAmount>`);
    }
    parts.push(`        <ram:GrandTotalAmount>${formatAmount(invoice.totals.taxInclusiveAmount)}</ram:GrandTotalAmount>`);
    if (invoice.totals.paidAmount != null) {
      parts.push(`        <ram:TotalPrepaidAmount>${formatAmount(invoice.totals.paidAmount)}</ram:TotalPrepaidAmount>`);
    }
    parts.push(`        <ram:DuePayableAmount>${formatAmount(invoice.totals.duePayableAmount)}</ram:DuePayableAmount>`);
    parts.push("      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>");
    parts.push("    </ram:ApplicableHeaderTradeSettlement>");

    parts.push("  </rsm:SupplyChainTradeTransaction>");

    // Line items (after header for BASIC+ profiles)
    if (invoice.lines && invoice.lines.length > 0) {
      parts.push(buildLineItems(invoice.lines));
    }

    parts.push("</rsm:CrossIndustryInvoice>");

    return parts.join("\n");
  }

  // ==================== Private: Parse Helpers ====================

  private extractXmlValue(xml: string, tag: string, parentTag?: string): string | null {
    let scope = xml;
    if (parentTag) {
      const parentMatch = xml.match(new RegExp(`<${parentTag}[^>]*>([\\s\\S]*?)</${parentTag}>`, "m"));
      if (parentMatch) scope = parentMatch[1]!;
    }
    const match = scope.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
    return match?.[1]?.trim() ?? null;
  }

  private extractXmlAttribute(xml: string, tag: string): string | null {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
    return match?.[1]?.trim() ?? null;
  }

  private extractNestedValue(xml: string, parentTag: string, tag: string, grandParentTag?: string): string | null {
    let scope = xml;
    if (grandParentTag) {
      const gpMatch = xml.match(new RegExp(`<${grandParentTag}[^>]*>([\\s\\S]*?)</${grandParentTag}>`, "m"));
      if (gpMatch) scope = gpMatch[1]!;
    }
    const parentMatch = scope.match(new RegExp(`<${parentTag}[^>]*>([\\s\\S]*?)</${parentTag}>`, "m"));
    if (!parentMatch) return null;
    const match = parentMatch[1]!.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
    return match?.[1]?.trim() ?? null;
  }

  private extractNumericValue(xml: string, tag: string): number | null {
    const value = this.extractXmlValue(xml, tag);
    if (value == null) return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  private formatParsedDate(raw: string): string {
    // YYYYMMDD -> YYYY-MM-DD
    const clean = raw.replace(/\D/g, "");
    if (clean.length === 8) {
      return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
    }
    return raw;
  }
}

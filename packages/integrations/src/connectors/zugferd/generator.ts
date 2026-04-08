// ==================== ZUGFeRD / XRechnung XML Generator ====================
// Generates UN/CEFACT Cross-Industry Invoice (CII) D16B XML
// conforming to ZUGFeRD 2.x / Factur-X / XRechnung profiles.

import type {
  ZugferdInvoice,
  ZugferdProfile,
  PostalAddress,
  ContactInfo,
  SellerParty,
  BuyerParty,
  PayeeParty,
  TaxRepresentativeParty,
  DeliveryInfo,
  PaymentInstructions,
  DocumentAllowance,
  DocumentCharge,
  VatBreakdown,
  InvoiceLine,
  SupportingDocument,
  CreditTransferInfo,
  DirectDebitInfo,
  LineAllowance,
  LineCharge,
} from "./types.js";
import {
  CII_NAMESPACES,
  PROFILE_URNS,
  XRECHNUNG_SPEC_IDS,
} from "./types.js";

// ==================== XML Escaping ====================

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ==================== Formatting Helpers ====================

/** Format date from YYYY-MM-DD to CII date format "102" (YYYYMMDD) */
function formatDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

/** Format a decimal amount with 2 decimal places */
function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/** Format a decimal amount with up to 8 decimal places (for unit prices) */
function formatPrice(price: number): string {
  // Remove trailing zeros but keep at least 2 decimals
  const raw = price.toFixed(8);
  const trimmed = raw.replace(/0+$/, "");
  const parts = trimmed.split(".");
  if (!parts[1] || parts[1].length < 2) {
    return price.toFixed(2);
  }
  return trimmed;
}

/** Format quantity (up to 4 decimal places) */
function formatQuantity(qty: number): string {
  const raw = qty.toFixed(4);
  return raw.replace(/0+$/, "").replace(/\.$/, ".0");
}

// ==================== XML Element Builders ====================

type XmlLine = string;

function el(tag: string, content: string, attrs?: Record<string, string>): XmlLine {
  const attrStr = attrs
    ? " " + Object.entries(attrs).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(" ")
    : "";
  return `<${tag}${attrStr}>${escapeXml(content)}</${tag}>`;
}

function elRaw(tag: string, innerXml: string, attrs?: Record<string, string>): XmlLine {
  const attrStr = attrs
    ? " " + Object.entries(attrs).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(" ")
    : "";
  return `<${tag}${attrStr}>${innerXml}</${tag}>`;
}

// ==================== Profile Gating ====================

const PROFILE_LEVELS: ZugferdProfile[] = [
  "MINIMUM",
  "BASIC WL",
  "BASIC",
  "EN16931",
  "EXTENDED",
];

function profileAtLeast(actual: ZugferdProfile, required: ZugferdProfile): boolean {
  return PROFILE_LEVELS.indexOf(actual) >= PROFILE_LEVELS.indexOf(required);
}

// ==================== Section Generators ====================

function generateExchangedDocumentContext(invoice: ZugferdInvoice): string {
  const lines: string[] = [];
  lines.push("<rsm:ExchangedDocumentContext>");

  // Business process
  if (invoice.processControl?.businessProcessType) {
    lines.push("  <ram:BusinessProcessSpecifiedDocumentContextParameter>");
    lines.push(`    ${el("ram:ID", invoice.processControl.businessProcessType)}`);
    lines.push("  </ram:BusinessProcessSpecifiedDocumentContextParameter>");
  }

  // Guideline (profile) specification
  let specId: string;
  if (invoice.xrechnung && invoice.xrechnungVersion) {
    specId = XRECHNUNG_SPEC_IDS[invoice.xrechnungVersion];
  } else {
    specId = PROFILE_URNS[invoice.profile];
  }

  lines.push("  <ram:GuidelineSpecifiedDocumentContextParameter>");
  lines.push(`    ${el("ram:ID", specId)}`);
  lines.push("  </ram:GuidelineSpecifiedDocumentContextParameter>");

  lines.push("</rsm:ExchangedDocumentContext>");
  return lines.join("\n");
}

function generateExchangedDocument(invoice: ZugferdInvoice): string {
  const lines: string[] = [];
  lines.push("<rsm:ExchangedDocument>");
  lines.push(`  ${el("ram:ID", invoice.invoiceNumber)}`);
  lines.push(`  ${el("ram:TypeCode", invoice.typeCode)}`);

  // Issue date
  lines.push("  <ram:IssueDateTime>");
  lines.push(`    ${el("udt:DateTimeString", formatDate(invoice.issueDate), { format: "102" })}`);
  lines.push("  </ram:IssueDateTime>");

  // Notes
  if (invoice.notes && profileAtLeast(invoice.profile, "BASIC WL")) {
    for (const note of invoice.notes) {
      lines.push("  <ram:IncludedNote>");
      lines.push(`    ${el("ram:Content", note.text)}`);
      if (note.subjectCode) {
        lines.push(`    ${el("ram:SubjectCode", note.subjectCode)}`);
      }
      lines.push("  </ram:IncludedNote>");
    }
  }

  lines.push("</rsm:ExchangedDocument>");
  return lines.join("\n");
}

function generateAddress(address: PostalAddress, indent: string): string {
  const lines: string[] = [];
  lines.push(`${indent}<ram:PostalTradeAddress>`);
  if (address.postCode) {
    lines.push(`${indent}  ${el("ram:PostcodeCode", address.postCode)}`);
  }
  if (address.streetName) {
    lines.push(`${indent}  ${el("ram:LineOne", address.streetName)}`);
  }
  if (address.additionalStreetName) {
    lines.push(`${indent}  ${el("ram:LineTwo", address.additionalStreetName)}`);
  }
  if (address.addressLine3) {
    lines.push(`${indent}  ${el("ram:LineThree", address.addressLine3)}`);
  }
  if (address.city) {
    lines.push(`${indent}  ${el("ram:CityName", address.city)}`);
  }
  lines.push(`${indent}  ${el("ram:CountryID", address.countryCode)}`);
  if (address.countrySubdivision) {
    lines.push(`${indent}  ${el("ram:CountrySubDivisionName", address.countrySubdivision)}`);
  }
  lines.push(`${indent}</ram:PostalTradeAddress>`);
  return lines.join("\n");
}

function generateContact(contact: ContactInfo, indent: string): string {
  const lines: string[] = [];
  lines.push(`${indent}<ram:DefinedTradeContact>`);
  if (contact.name) {
    lines.push(`${indent}  ${el("ram:PersonName", contact.name)}`);
  }
  if (contact.telephone) {
    lines.push(`${indent}  <ram:TelephoneUniversalCommunication>`);
    lines.push(`${indent}    ${el("ram:CompleteNumber", contact.telephone)}`);
    lines.push(`${indent}  </ram:TelephoneUniversalCommunication>`);
  }
  if (contact.email) {
    lines.push(`${indent}  <ram:EmailURIUniversalCommunication>`);
    lines.push(`${indent}    ${el("ram:URIID", contact.email)}`);
    lines.push(`${indent}  </ram:EmailURIUniversalCommunication>`);
  }
  lines.push(`${indent}</ram:DefinedTradeContact>`);
  return lines.join("\n");
}

function generateSellerParty(seller: SellerParty, profile: ZugferdProfile): string {
  const lines: string[] = [];
  lines.push("        <ram:SellerTradeParty>");

  if (seller.id) {
    const attrs: Record<string, string> = {};
    if (seller.idScheme) attrs.schemeID = seller.idScheme;
    lines.push(`          ${el("ram:ID", seller.id, attrs)}`);
  }

  if (seller.legalRegistrationId && profileAtLeast(profile, "BASIC WL")) {
    const attrs: Record<string, string> = {};
    if (seller.legalRegistrationScheme) attrs.schemeID = seller.legalRegistrationScheme;
    lines.push("          <ram:GlobalID>");
    lines.push(`            ${el("ram:ID", seller.legalRegistrationId, attrs)}`);
    lines.push("          </ram:GlobalID>");
  }

  lines.push(`          ${el("ram:Name", seller.name)}`);

  if (seller.tradingName && profileAtLeast(profile, "BASIC WL")) {
    lines.push(`          ${el("ram:Description", seller.tradingName)}`);
  }

  // Legal organization
  if (profileAtLeast(profile, "BASIC WL")) {
    lines.push("          <ram:SpecifiedLegalOrganization>");
    if (seller.legalRegistrationId) {
      const attrs: Record<string, string> = {};
      if (seller.legalRegistrationScheme) attrs.schemeID = seller.legalRegistrationScheme;
      lines.push(`            ${el("ram:ID", seller.legalRegistrationId, attrs)}`);
    }
    if (seller.tradingName) {
      lines.push(`            ${el("ram:TradingBusinessName", seller.tradingName)}`);
    }
    lines.push("          </ram:SpecifiedLegalOrganization>");
  }

  // Contact
  if (seller.contact && profileAtLeast(profile, "EN16931")) {
    lines.push(generateContact(seller.contact, "          "));
  }

  // Address
  lines.push(generateAddress(seller.address, "          "));

  // Electronic address
  if (seller.electronicAddress && profileAtLeast(profile, "BASIC WL")) {
    const attrs: Record<string, string> = {};
    if (seller.electronicAddressScheme) attrs.schemeID = seller.electronicAddressScheme;
    lines.push("          <ram:URIUniversalCommunication>");
    lines.push(`            ${el("ram:URIID", seller.electronicAddress, attrs)}`);
    lines.push("          </ram:URIUniversalCommunication>");
  }

  // Tax registration
  if (seller.vatId) {
    lines.push("          <ram:SpecifiedTaxRegistration>");
    lines.push(`            ${el("ram:ID", seller.vatId, { schemeID: "VA" })}`);
    lines.push("          </ram:SpecifiedTaxRegistration>");
  }
  if (seller.taxRegistrationId && profileAtLeast(profile, "BASIC WL")) {
    lines.push("          <ram:SpecifiedTaxRegistration>");
    lines.push(`            ${el("ram:ID", seller.taxRegistrationId, { schemeID: "FC" })}`);
    lines.push("          </ram:SpecifiedTaxRegistration>");
  }

  lines.push("        </ram:SellerTradeParty>");
  return lines.join("\n");
}

function generateBuyerParty(buyer: BuyerParty, profile: ZugferdProfile): string {
  const lines: string[] = [];
  lines.push("        <ram:BuyerTradeParty>");

  if (buyer.id) {
    const attrs: Record<string, string> = {};
    if (buyer.idScheme) attrs.schemeID = buyer.idScheme;
    lines.push(`          ${el("ram:ID", buyer.id, attrs)}`);
  }

  lines.push(`          ${el("ram:Name", buyer.name)}`);

  if (buyer.legalRegistrationId && profileAtLeast(profile, "BASIC WL")) {
    lines.push("          <ram:SpecifiedLegalOrganization>");
    const attrs: Record<string, string> = {};
    if (buyer.legalRegistrationScheme) attrs.schemeID = buyer.legalRegistrationScheme;
    lines.push(`            ${el("ram:ID", buyer.legalRegistrationId, attrs)}`);
    if (buyer.tradingName) {
      lines.push(`            ${el("ram:TradingBusinessName", buyer.tradingName)}`);
    }
    lines.push("          </ram:SpecifiedLegalOrganization>");
  }

  // Contact
  if (buyer.contact && profileAtLeast(profile, "EN16931")) {
    lines.push(generateContact(buyer.contact, "          "));
  }

  // Address
  if (profileAtLeast(profile, "BASIC WL")) {
    lines.push(generateAddress(buyer.address, "          "));
  }

  // Electronic address
  if (buyer.electronicAddress && profileAtLeast(profile, "BASIC WL")) {
    const attrs: Record<string, string> = {};
    if (buyer.electronicAddressScheme) attrs.schemeID = buyer.electronicAddressScheme;
    lines.push("          <ram:URIUniversalCommunication>");
    lines.push(`            ${el("ram:URIID", buyer.electronicAddress, attrs)}`);
    lines.push("          </ram:URIUniversalCommunication>");
  }

  // Tax registration
  if (buyer.vatId) {
    lines.push("          <ram:SpecifiedTaxRegistration>");
    lines.push(`            ${el("ram:ID", buyer.vatId, { schemeID: "VA" })}`);
    lines.push("          </ram:SpecifiedTaxRegistration>");
  }

  lines.push("        </ram:BuyerTradeParty>");
  return lines.join("\n");
}

function generatePayeeParty(payee: PayeeParty): string {
  const lines: string[] = [];
  lines.push("        <ram:PayeeTradeParty>");
  if (payee.id) {
    const attrs: Record<string, string> = {};
    if (payee.idScheme) attrs.schemeID = payee.idScheme;
    lines.push(`          ${el("ram:ID", payee.id, attrs)}`);
  }
  lines.push(`          ${el("ram:Name", payee.name)}`);
  if (payee.legalRegistrationId) {
    lines.push("          <ram:SpecifiedLegalOrganization>");
    const attrs: Record<string, string> = {};
    if (payee.legalRegistrationScheme) attrs.schemeID = payee.legalRegistrationScheme;
    lines.push(`            ${el("ram:ID", payee.legalRegistrationId, attrs)}`);
    lines.push("          </ram:SpecifiedLegalOrganization>");
  }
  lines.push("        </ram:PayeeTradeParty>");
  return lines.join("\n");
}

function generateTaxRepresentative(rep: TaxRepresentativeParty): string {
  const lines: string[] = [];
  lines.push("        <ram:SellerTaxRepresentativeTradeParty>");
  lines.push(`          ${el("ram:Name", rep.name)}`);
  lines.push(generateAddress(rep.address, "          "));
  lines.push("          <ram:SpecifiedTaxRegistration>");
  lines.push(`            ${el("ram:ID", rep.vatId, { schemeID: "VA" })}`);
  lines.push("          </ram:SpecifiedTaxRegistration>");
  lines.push("        </ram:SellerTaxRepresentativeTradeParty>");
  return lines.join("\n");
}

function generateDelivery(delivery: DeliveryInfo): string {
  const lines: string[] = [];

  // Ship-to party
  if (delivery.deliverToName || delivery.deliverToLocationId || delivery.deliverToAddress) {
    lines.push("        <ram:ShipToTradeParty>");
    if (delivery.deliverToLocationId) {
      const attrs: Record<string, string> = {};
      if (delivery.deliverToLocationScheme) attrs.schemeID = delivery.deliverToLocationScheme;
      lines.push(`          ${el("ram:ID", delivery.deliverToLocationId, attrs)}`);
    }
    if (delivery.deliverToName) {
      lines.push(`          ${el("ram:Name", delivery.deliverToName)}`);
    }
    if (delivery.deliverToAddress) {
      lines.push(generateAddress(delivery.deliverToAddress, "          "));
    }
    lines.push("        </ram:ShipToTradeParty>");
  }

  // Actual delivery event
  if (delivery.actualDeliveryDate) {
    lines.push("        <ram:ActualDeliverySupplyChainEvent>");
    lines.push("          <ram:OccurrenceDateTime>");
    lines.push(`            ${el("udt:DateTimeString", formatDate(delivery.actualDeliveryDate), { format: "102" })}`);
    lines.push("          </ram:OccurrenceDateTime>");
    lines.push("        </ram:ActualDeliverySupplyChainEvent>");
  }

  // Invoicing period at delivery level
  if (delivery.invoicingPeriod) {
    lines.push("        <ram:BillingSpecifiedPeriod>");
    if (delivery.invoicingPeriod.startDate) {
      lines.push("          <ram:StartDateTime>");
      lines.push(`            ${el("udt:DateTimeString", formatDate(delivery.invoicingPeriod.startDate), { format: "102" })}`);
      lines.push("          </ram:StartDateTime>");
    }
    if (delivery.invoicingPeriod.endDate) {
      lines.push("          <ram:EndDateTime>");
      lines.push(`            ${el("udt:DateTimeString", formatDate(delivery.invoicingPeriod.endDate), { format: "102" })}`);
      lines.push("          </ram:EndDateTime>");
    }
    lines.push("        </ram:BillingSpecifiedPeriod>");
  }

  return lines.join("\n");
}

function generateCreditTransfer(ct: CreditTransferInfo, indent: string): string {
  const lines: string[] = [];
  lines.push(`${indent}<ram:PayeePartyCreditorFinancialAccount>`);
  lines.push(`${indent}  ${el("ram:IBANID", ct.iban)}`);
  if (ct.accountName) {
    lines.push(`${indent}  ${el("ram:AccountName", ct.accountName)}`);
  }
  lines.push(`${indent}</ram:PayeePartyCreditorFinancialAccount>`);
  if (ct.bic) {
    lines.push(`${indent}<ram:PayeeSpecifiedCreditorFinancialInstitution>`);
    lines.push(`${indent}  ${el("ram:BICID", ct.bic)}`);
    lines.push(`${indent}</ram:PayeeSpecifiedCreditorFinancialInstitution>`);
  }
  return lines.join("\n");
}

function generateDirectDebit(dd: DirectDebitInfo, indent: string): string {
  const lines: string[] = [];
  lines.push(`${indent}<ram:DirectDebitMandateID>${escapeXml(dd.mandateReference)}</ram:DirectDebitMandateID>`);
  lines.push(`${indent}<ram:CreditorReferenceID>${escapeXml(dd.creditorId)}</ram:CreditorReferenceID>`);
  lines.push(`${indent}<ram:PayerPartyDebtorFinancialAccount>`);
  lines.push(`${indent}  ${el("ram:IBANID", dd.debitedAccountId)}`);
  lines.push(`${indent}</ram:PayerPartyDebtorFinancialAccount>`);
  return lines.join("\n");
}

function generatePaymentInstructions(pi: PaymentInstructions): string {
  const lines: string[] = [];
  lines.push("        <ram:SpecifiedTradeSettlementPaymentMeans>");
  lines.push(`          ${el("ram:TypeCode", pi.paymentMeansCode)}`);
  if (pi.paymentMeansText) {
    lines.push(`          ${el("ram:Information", pi.paymentMeansText)}`);
  }
  if (pi.paymentCard) {
    lines.push("          <ram:ApplicableTradeSettlementFinancialCard>");
    lines.push(`            ${el("ram:ID", pi.paymentCard.cardNumber)}`);
    if (pi.paymentCard.holderName) {
      lines.push(`            ${el("ram:CardholderName", pi.paymentCard.holderName)}`);
    }
    lines.push("          </ram:ApplicableTradeSettlementFinancialCard>");
  }
  if (pi.creditTransfer) {
    for (const ct of pi.creditTransfer) {
      lines.push(generateCreditTransfer(ct, "          "));
    }
  }
  if (pi.directDebit) {
    lines.push(generateDirectDebit(pi.directDebit, "          "));
  }
  lines.push("        </ram:SpecifiedTradeSettlementPaymentMeans>");
  return lines.join("\n");
}

function generateVatBreakdown(vb: VatBreakdown): string {
  const lines: string[] = [];
  lines.push("        <ram:ApplicableTradeTax>");
  lines.push(`          ${el("ram:CalculatedAmount", formatAmount(vb.taxAmount), { currencyID: "" })}`);
  lines.push(`          ${el("ram:TypeCode", "VAT")}`);
  if (vb.exemptionReasonText) {
    lines.push(`          ${el("ram:ExemptionReason", vb.exemptionReasonText)}`);
  }
  lines.push(`          ${el("ram:BasisAmount", formatAmount(vb.taxableAmount), { currencyID: "" })}`);
  lines.push(`          ${el("ram:CategoryCode", vb.categoryCode)}`);
  if (vb.exemptionReasonCode) {
    lines.push(`          ${el("ram:ExemptionReasonCode", vb.exemptionReasonCode)}`);
  }
  if (vb.rate !== undefined) {
    lines.push(`          ${el("ram:RateApplicablePercent", formatAmount(vb.rate))}`);
  }
  lines.push("        </ram:ApplicableTradeTax>");
  return lines.join("\n");
}

function generateDocumentAllowance(a: DocumentAllowance, currencyCode: string): string {
  const lines: string[] = [];
  lines.push("        <ram:SpecifiedTradeAllowanceCharge>");
  lines.push(`          ${el("ram:ChargeIndicator", "false")}`);
  if (a.percentage !== undefined) {
    lines.push(`          ${el("ram:CalculationPercent", formatAmount(a.percentage))}`);
  }
  if (a.baseAmount !== undefined) {
    lines.push(`          ${el("ram:BasisAmount", formatAmount(a.baseAmount), { currencyID: currencyCode })}`);
  }
  lines.push(`          ${el("ram:ActualAmount", formatAmount(a.amount), { currencyID: currencyCode })}`);
  if (a.reasonCode) {
    lines.push(`          ${el("ram:ReasonCode", a.reasonCode)}`);
  }
  if (a.reason) {
    lines.push(`          ${el("ram:Reason", a.reason)}`);
  }
  lines.push("          <ram:CategoryTradeTax>");
  lines.push(`            ${el("ram:TypeCode", "VAT")}`);
  lines.push(`            ${el("ram:CategoryCode", a.vatCategoryCode)}`);
  if (a.vatRate !== undefined) {
    lines.push(`            ${el("ram:RateApplicablePercent", formatAmount(a.vatRate))}`);
  }
  lines.push("          </ram:CategoryTradeTax>");
  lines.push("        </ram:SpecifiedTradeAllowanceCharge>");
  return lines.join("\n");
}

function generateDocumentCharge(c: DocumentCharge, currencyCode: string): string {
  const lines: string[] = [];
  lines.push("        <ram:SpecifiedTradeAllowanceCharge>");
  lines.push(`          ${el("ram:ChargeIndicator", "true")}`);
  if (c.percentage !== undefined) {
    lines.push(`          ${el("ram:CalculationPercent", formatAmount(c.percentage))}`);
  }
  if (c.baseAmount !== undefined) {
    lines.push(`          ${el("ram:BasisAmount", formatAmount(c.baseAmount), { currencyID: currencyCode })}`);
  }
  lines.push(`          ${el("ram:ActualAmount", formatAmount(c.amount), { currencyID: currencyCode })}`);
  if (c.reasonCode) {
    lines.push(`          ${el("ram:ReasonCode", c.reasonCode)}`);
  }
  if (c.reason) {
    lines.push(`          ${el("ram:Reason", c.reason)}`);
  }
  lines.push("          <ram:CategoryTradeTax>");
  lines.push(`            ${el("ram:TypeCode", "VAT")}`);
  lines.push(`            ${el("ram:CategoryCode", c.vatCategoryCode)}`);
  if (c.vatRate !== undefined) {
    lines.push(`            ${el("ram:RateApplicablePercent", formatAmount(c.vatRate))}`);
  }
  lines.push("          </ram:CategoryTradeTax>");
  lines.push("        </ram:SpecifiedTradeAllowanceCharge>");
  return lines.join("\n");
}

function generateSupportingDocument(doc: SupportingDocument): string {
  const lines: string[] = [];
  lines.push("        <ram:AdditionalReferencedDocument>");
  lines.push(`          ${el("ram:IssuerAssignedID", doc.id)}`);
  lines.push(`          ${el("ram:TypeCode", "916")}`);
  if (doc.description) {
    lines.push(`          ${el("ram:Name", doc.description)}`);
  }
  if (doc.attachedDocument) {
    const attrs: Record<string, string> = {};
    if (doc.mimeCode) attrs.mimeCode = doc.mimeCode;
    if (doc.filename) attrs.filename = doc.filename;
    lines.push(`          ${el("ram:AttachmentBinaryObject", doc.attachedDocument, attrs)}`);
  }
  if (doc.externalLocation) {
    lines.push("          <ram:URIID>");
    lines.push(`            ${escapeXml(doc.externalLocation)}`);
    lines.push("          </ram:URIID>");
  }
  lines.push("        </ram:AdditionalReferencedDocument>");
  return lines.join("\n");
}

function generateDocumentTotals(invoice: ZugferdInvoice): string {
  const t = invoice.totals;
  const c = invoice.currencyCode;
  const lines: string[] = [];

  lines.push("        <ram:SpecifiedTradeSettlementHeaderMonetarySummation>");
  lines.push(`          ${el("ram:LineTotalAmount", formatAmount(t.lineTotalAmount), { currencyID: c })}`);

  if (t.chargeTotalAmount !== undefined) {
    lines.push(`          ${el("ram:ChargeTotalAmount", formatAmount(t.chargeTotalAmount), { currencyID: c })}`);
  }
  if (t.allowanceTotalAmount !== undefined) {
    lines.push(`          ${el("ram:AllowanceTotalAmount", formatAmount(t.allowanceTotalAmount), { currencyID: c })}`);
  }

  lines.push(`          ${el("ram:TaxBasisTotalAmount", formatAmount(t.taxExclusiveAmount), { currencyID: c })}`);

  if (t.taxAmount !== undefined) {
    lines.push(`          ${el("ram:TaxTotalAmount", formatAmount(t.taxAmount), { currencyID: c })}`);
  }
  if (t.taxAmountInAccountingCurrency !== undefined && invoice.vatAccountingCurrencyCode) {
    lines.push(`          ${el("ram:TaxTotalAmount", formatAmount(t.taxAmountInAccountingCurrency), { currencyID: invoice.vatAccountingCurrencyCode })}`);
  }

  if (t.roundingAmount !== undefined) {
    lines.push(`          ${el("ram:RoundingAmount", formatAmount(t.roundingAmount), { currencyID: c })}`);
  }

  lines.push(`          ${el("ram:GrandTotalAmount", formatAmount(t.taxInclusiveAmount), { currencyID: c })}`);

  if (t.paidAmount !== undefined) {
    lines.push(`          ${el("ram:TotalPrepaidAmount", formatAmount(t.paidAmount), { currencyID: c })}`);
  }

  lines.push(`          ${el("ram:DuePayableAmount", formatAmount(t.duePayableAmount), { currencyID: c })}`);

  lines.push("        </ram:SpecifiedTradeSettlementHeaderMonetarySummation>");
  return lines.join("\n");
}

function generateLineAllowance(a: LineAllowance, currencyCode: string, indent: string): string {
  const lines: string[] = [];
  lines.push(`${indent}<ram:SpecifiedTradeAllowanceCharge>`);
  lines.push(`${indent}  ${el("ram:ChargeIndicator", "false")}`);
  if (a.percentage !== undefined) {
    lines.push(`${indent}  ${el("ram:CalculationPercent", formatAmount(a.percentage))}`);
  }
  if (a.baseAmount !== undefined) {
    lines.push(`${indent}  ${el("ram:BasisAmount", formatAmount(a.baseAmount), { currencyID: currencyCode })}`);
  }
  lines.push(`${indent}  ${el("ram:ActualAmount", formatAmount(a.amount), { currencyID: currencyCode })}`);
  if (a.reasonCode) {
    lines.push(`${indent}  ${el("ram:ReasonCode", a.reasonCode)}`);
  }
  if (a.reason) {
    lines.push(`${indent}  ${el("ram:Reason", a.reason)}`);
  }
  lines.push(`${indent}</ram:SpecifiedTradeAllowanceCharge>`);
  return lines.join("\n");
}

function generateLineCharge(c: LineCharge, currencyCode: string, indent: string): string {
  const lines: string[] = [];
  lines.push(`${indent}<ram:SpecifiedTradeAllowanceCharge>`);
  lines.push(`${indent}  ${el("ram:ChargeIndicator", "true")}`);
  if (c.percentage !== undefined) {
    lines.push(`${indent}  ${el("ram:CalculationPercent", formatAmount(c.percentage))}`);
  }
  if (c.baseAmount !== undefined) {
    lines.push(`${indent}  ${el("ram:BasisAmount", formatAmount(c.baseAmount), { currencyID: currencyCode })}`);
  }
  lines.push(`${indent}  ${el("ram:ActualAmount", formatAmount(c.amount), { currencyID: currencyCode })}`);
  if (c.reasonCode) {
    lines.push(`${indent}  ${el("ram:ReasonCode", c.reasonCode)}`);
  }
  if (c.reason) {
    lines.push(`${indent}  ${el("ram:Reason", c.reason)}`);
  }
  lines.push(`${indent}</ram:SpecifiedTradeAllowanceCharge>`);
  return lines.join("\n");
}

function generateInvoiceLine(line: InvoiceLine, invoice: ZugferdInvoice): string {
  const c = invoice.currencyCode;
  const lines: string[] = [];

  lines.push("    <ram:IncludedSupplyChainTradeLineItem>");

  // Line document
  lines.push("      <ram:AssociatedDocumentLineDocument>");
  lines.push(`        ${el("ram:LineID", line.id)}`);
  if (line.note) {
    lines.push("        <ram:IncludedNote>");
    lines.push(`          ${el("ram:Content", line.note)}`);
    lines.push("        </ram:IncludedNote>");
  }
  lines.push("      </ram:AssociatedDocumentLineDocument>");

  // Trade product
  lines.push("      <ram:SpecifiedTradeProduct>");
  if (line.item.standardId) {
    const attrs: Record<string, string> = {};
    if (line.item.standardIdScheme) attrs.schemeID = line.item.standardIdScheme;
    lines.push(`        ${el("ram:GlobalID", line.item.standardId, attrs)}`);
  }
  if (line.item.sellersId) {
    lines.push(`        ${el("ram:SellerAssignedID", line.item.sellersId)}`);
  }
  if (line.item.buyersId) {
    lines.push(`        ${el("ram:BuyerAssignedID", line.item.buyersId)}`);
  }
  lines.push(`        ${el("ram:Name", line.item.name)}`);
  if (line.item.description) {
    lines.push(`        ${el("ram:Description", line.item.description)}`);
  }
  // Item attributes
  if (line.item.attributes && profileAtLeast(invoice.profile, "EN16931")) {
    for (const attr of line.item.attributes) {
      lines.push("        <ram:ApplicableProductCharacteristic>");
      lines.push(`          ${el("ram:Description", attr.name)}`);
      lines.push(`          ${el("ram:Value", attr.value)}`);
      lines.push("        </ram:ApplicableProductCharacteristic>");
    }
  }
  // Classification
  if (line.item.classificationIds && profileAtLeast(invoice.profile, "EN16931")) {
    for (const cls of line.item.classificationIds) {
      lines.push("        <ram:DesignatedProductClassification>");
      const attrs: Record<string, string> = { listID: cls.schemeId };
      if (cls.schemeVersion) attrs.listVersionID = cls.schemeVersion;
      lines.push(`          ${el("ram:ClassCode", cls.id, attrs)}`);
      lines.push("        </ram:DesignatedProductClassification>");
    }
  }
  if (line.item.countryOfOrigin) {
    lines.push("        <ram:OriginTradeCountry>");
    lines.push(`          ${el("ram:ID", line.item.countryOfOrigin)}`);
    lines.push("        </ram:OriginTradeCountry>");
  }
  lines.push("      </ram:SpecifiedTradeProduct>");

  // Line trade agreement (price)
  lines.push("      <ram:SpecifiedLineTradeAgreement>");
  if (line.orderLineReference && profileAtLeast(invoice.profile, "EN16931")) {
    lines.push("        <ram:BuyerOrderReferencedDocument>");
    lines.push(`          ${el("ram:LineID", line.orderLineReference)}`);
    lines.push("        </ram:BuyerOrderReferencedDocument>");
  }
  lines.push("        <ram:GrossPriceProductTradePrice>");
  if (line.priceDetails.grossPrice !== undefined) {
    lines.push(`          ${el("ram:ChargeAmount", formatPrice(line.priceDetails.grossPrice), { currencyID: c })}`);
  } else {
    lines.push(`          ${el("ram:ChargeAmount", formatPrice(line.priceDetails.netPrice), { currencyID: c })}`);
  }
  if (line.priceDetails.baseQuantity !== undefined) {
    const uCode = line.priceDetails.baseQuantityUnitCode ?? line.unitCode;
    lines.push(`          ${el("ram:BasisQuantity", formatQuantity(line.priceDetails.baseQuantity), { unitCode: uCode })}`);
  }
  if (line.priceDetails.priceDiscount !== undefined) {
    lines.push("          <ram:AppliedTradeAllowanceCharge>");
    lines.push(`            ${el("ram:ChargeIndicator", "false")}`);
    lines.push(`            ${el("ram:ActualAmount", formatPrice(line.priceDetails.priceDiscount), { currencyID: c })}`);
    lines.push("          </ram:AppliedTradeAllowanceCharge>");
  }
  lines.push("        </ram:GrossPriceProductTradePrice>");

  lines.push("        <ram:NetPriceProductTradePrice>");
  lines.push(`          ${el("ram:ChargeAmount", formatPrice(line.priceDetails.netPrice), { currencyID: c })}`);
  if (line.priceDetails.baseQuantity !== undefined) {
    const uCode = line.priceDetails.baseQuantityUnitCode ?? line.unitCode;
    lines.push(`          ${el("ram:BasisQuantity", formatQuantity(line.priceDetails.baseQuantity), { unitCode: uCode })}`);
  }
  lines.push("        </ram:NetPriceProductTradePrice>");
  lines.push("      </ram:SpecifiedLineTradeAgreement>");

  // Line trade delivery
  lines.push("      <ram:SpecifiedLineTradeDelivery>");
  lines.push(`        ${el("ram:BilledQuantity", formatQuantity(line.quantity), { unitCode: line.unitCode })}`);
  lines.push("      </ram:SpecifiedLineTradeDelivery>");

  // Line trade settlement
  lines.push("      <ram:SpecifiedLineTradeSettlement>");

  // Line VAT
  lines.push("        <ram:ApplicableTradeTax>");
  lines.push(`          ${el("ram:TypeCode", "VAT")}`);
  lines.push(`          ${el("ram:CategoryCode", line.vatInfo.categoryCode)}`);
  if (line.vatInfo.rate !== undefined) {
    lines.push(`          ${el("ram:RateApplicablePercent", formatAmount(line.vatInfo.rate))}`);
  }
  lines.push("        </ram:ApplicableTradeTax>");

  // Line period
  if (line.period && profileAtLeast(invoice.profile, "EN16931")) {
    lines.push("        <ram:BillingSpecifiedPeriod>");
    if (line.period.startDate) {
      lines.push("          <ram:StartDateTime>");
      lines.push(`            ${el("udt:DateTimeString", formatDate(line.period.startDate), { format: "102" })}`);
      lines.push("          </ram:StartDateTime>");
    }
    if (line.period.endDate) {
      lines.push("          <ram:EndDateTime>");
      lines.push(`            ${el("udt:DateTimeString", formatDate(line.period.endDate), { format: "102" })}`);
      lines.push("          </ram:EndDateTime>");
    }
    lines.push("        </ram:BillingSpecifiedPeriod>");
  }

  // Line allowances
  if (line.allowances && profileAtLeast(invoice.profile, "BASIC")) {
    for (const a of line.allowances) {
      lines.push(generateLineAllowance(a, c, "        "));
    }
  }

  // Line charges
  if (line.charges && profileAtLeast(invoice.profile, "BASIC")) {
    for (const ch of line.charges) {
      lines.push(generateLineCharge(ch, c, "        "));
    }
  }

  // Line monetary summation
  lines.push("        <ram:SpecifiedTradeSettlementLineMonetarySummation>");
  lines.push(`          ${el("ram:LineTotalAmount", formatAmount(line.netAmount), { currencyID: c })}`);
  lines.push("        </ram:SpecifiedTradeSettlementLineMonetarySummation>");

  // Accounting reference
  if (line.accountingReference && profileAtLeast(invoice.profile, "EN16931")) {
    lines.push("        <ram:ReceivableSpecifiedTradeAccountingAccount>");
    lines.push(`          ${el("ram:ID", line.accountingReference)}`);
    lines.push("        </ram:ReceivableSpecifiedTradeAccountingAccount>");
  }

  lines.push("      </ram:SpecifiedLineTradeSettlement>");

  lines.push("    </ram:IncludedSupplyChainTradeLineItem>");
  return lines.join("\n");
}

function generateSupplyChainTradeTransaction(invoice: ZugferdInvoice): string {
  const lines: string[] = [];
  lines.push("<rsm:SupplyChainTradeTransaction>");

  // Invoice lines (BASIC and above)
  if (profileAtLeast(invoice.profile, "BASIC")) {
    for (const line of invoice.lines) {
      lines.push(generateInvoiceLine(line, invoice));
    }
  }

  // Header trade agreement
  lines.push("  <ram:ApplicableHeaderTradeAgreement>");

  // Buyer reference (mandatory for XRechnung)
  if (invoice.buyerReference) {
    lines.push(`      ${el("ram:BuyerReference", invoice.buyerReference)}`);
  }

  // Seller
  lines.push(generateSellerParty(invoice.seller, invoice.profile));

  // Buyer
  lines.push(generateBuyerParty(invoice.buyer, invoice.profile));

  // Seller tax representative
  if (invoice.sellerTaxRepresentative && profileAtLeast(invoice.profile, "BASIC WL")) {
    lines.push(generateTaxRepresentative(invoice.sellerTaxRepresentative));
  }

  // Order reference
  if (invoice.orderReference) {
    lines.push("        <ram:BuyerOrderReferencedDocument>");
    lines.push(`          ${el("ram:IssuerAssignedID", invoice.orderReference)}`);
    lines.push("        </ram:BuyerOrderReferencedDocument>");
  }

  // Contract reference
  if (invoice.contractReference && profileAtLeast(invoice.profile, "BASIC WL")) {
    lines.push("        <ram:ContractReferencedDocument>");
    lines.push(`          ${el("ram:IssuerAssignedID", invoice.contractReference)}`);
    lines.push("        </ram:ContractReferencedDocument>");
  }

  // Supporting documents
  if (invoice.supportingDocuments && profileAtLeast(invoice.profile, "EN16931")) {
    for (const doc of invoice.supportingDocuments) {
      lines.push(generateSupportingDocument(doc));
    }
  }

  // Project reference
  if (invoice.projectReference && profileAtLeast(invoice.profile, "EN16931")) {
    lines.push("        <ram:SpecifiedProcuringProject>");
    lines.push(`          ${el("ram:ID", invoice.projectReference)}`);
    lines.push(`          ${el("ram:Name", "Project Reference")}`);
    lines.push("        </ram:SpecifiedProcuringProject>");
  }

  lines.push("  </ram:ApplicableHeaderTradeAgreement>");

  // Header trade delivery
  lines.push("  <ram:ApplicableHeaderTradeDelivery>");
  if (invoice.delivery && profileAtLeast(invoice.profile, "BASIC WL")) {
    lines.push(generateDelivery(invoice.delivery));
  }
  if (invoice.despatchAdviceReference && profileAtLeast(invoice.profile, "EN16931")) {
    lines.push("        <ram:DespatchAdviceReferencedDocument>");
    lines.push(`          ${el("ram:IssuerAssignedID", invoice.despatchAdviceReference)}`);
    lines.push("        </ram:DespatchAdviceReferencedDocument>");
  }
  if (invoice.receivingAdviceReference && profileAtLeast(invoice.profile, "EN16931")) {
    lines.push("        <ram:ReceivingAdviceReferencedDocument>");
    lines.push(`          ${el("ram:IssuerAssignedID", invoice.receivingAdviceReference)}`);
    lines.push("        </ram:ReceivingAdviceReferencedDocument>");
  }
  lines.push("  </ram:ApplicableHeaderTradeDelivery>");

  // Header trade settlement
  lines.push("  <ram:ApplicableHeaderTradeSettlement>");

  // Payment reference / remittance info
  if (invoice.paymentInstructions?.remittanceInformation) {
    lines.push(`      ${el("ram:PaymentReference", invoice.paymentInstructions.remittanceInformation)}`);
  }

  // Invoice currency
  lines.push(`      ${el("ram:InvoiceCurrencyCode", invoice.currencyCode)}`);

  // Tax currency
  if (invoice.vatAccountingCurrencyCode) {
    lines.push(`      ${el("ram:TaxCurrencyCode", invoice.vatAccountingCurrencyCode)}`);
  }

  // Payee
  if (invoice.payee && profileAtLeast(invoice.profile, "BASIC WL")) {
    lines.push(generatePayeeParty(invoice.payee));
  }

  // Payment instructions
  if (invoice.paymentInstructions && profileAtLeast(invoice.profile, "BASIC WL")) {
    lines.push(generatePaymentInstructions(invoice.paymentInstructions));
  }

  // VAT breakdown
  for (const vb of invoice.vatBreakdown) {
    lines.push(generateVatBreakdown(vb));
  }

  // Document allowances
  if (invoice.allowances && profileAtLeast(invoice.profile, "BASIC WL")) {
    for (const a of invoice.allowances) {
      lines.push(generateDocumentAllowance(a, invoice.currencyCode));
    }
  }

  // Document charges
  if (invoice.charges && profileAtLeast(invoice.profile, "BASIC WL")) {
    for (const c of invoice.charges) {
      lines.push(generateDocumentCharge(c, invoice.currencyCode));
    }
  }

  // Payment terms
  if (invoice.paymentTerms && profileAtLeast(invoice.profile, "BASIC WL")) {
    lines.push("        <ram:SpecifiedTradePaymentTerms>");
    lines.push(`          ${el("ram:Description", invoice.paymentTerms)}`);
    if (invoice.dueDate) {
      lines.push("          <ram:DueDateDateTime>");
      lines.push(`            ${el("udt:DateTimeString", formatDate(invoice.dueDate), { format: "102" })}`);
      lines.push("          </ram:DueDateDateTime>");
    }
    lines.push("        </ram:SpecifiedTradePaymentTerms>");
  } else if (invoice.dueDate && profileAtLeast(invoice.profile, "BASIC WL")) {
    lines.push("        <ram:SpecifiedTradePaymentTerms>");
    lines.push("          <ram:DueDateDateTime>");
    lines.push(`            ${el("udt:DateTimeString", formatDate(invoice.dueDate), { format: "102" })}`);
    lines.push("          </ram:DueDateDateTime>");
    lines.push("        </ram:SpecifiedTradePaymentTerms>");
  }

  // Preceding invoice reference
  if (invoice.precedingInvoiceReference && profileAtLeast(invoice.profile, "BASIC WL")) {
    lines.push("        <ram:InvoiceReferencedDocument>");
    lines.push(`          ${el("ram:IssuerAssignedID", invoice.precedingInvoiceReference)}`);
    if (invoice.precedingInvoiceIssueDate) {
      lines.push("          <ram:FormattedIssueDateTime>");
      lines.push(`            ${el("qdt:DateTimeString", formatDate(invoice.precedingInvoiceIssueDate), { format: "102" })}`);
      lines.push("          </ram:FormattedIssueDateTime>");
    }
    lines.push("        </ram:InvoiceReferencedDocument>");
  }

  // Buyer accounting reference
  if (invoice.buyerAccountingReference && profileAtLeast(invoice.profile, "EN16931")) {
    lines.push("        <ram:ReceivableSpecifiedTradeAccountingAccount>");
    lines.push(`          ${el("ram:ID", invoice.buyerAccountingReference)}`);
    lines.push("        </ram:ReceivableSpecifiedTradeAccountingAccount>");
  }

  // Document totals
  lines.push(generateDocumentTotals(invoice));

  lines.push("  </ram:ApplicableHeaderTradeSettlement>");

  lines.push("</rsm:SupplyChainTradeTransaction>");
  return lines.join("\n");
}

// ==================== Public API ====================

export interface GenerateOptions {
  /** Include XML declaration (default: true) */
  xmlDeclaration?: boolean;
  /** Pretty-print with indentation (default: true) */
  prettyPrint?: boolean;
}

/**
 * Generate ZUGFeRD / XRechnung CII XML from typed invoice data.
 *
 * The generated XML conforms to UN/CEFACT Cross-Industry Invoice (CII) D16B
 * and can be embedded in a PDF/A-3 for ZUGFeRD or sent standalone for XRechnung.
 */
export function generateZugferdXml(
  invoice: ZugferdInvoice,
  options: GenerateOptions = {},
): string {
  const { xmlDeclaration = true, prettyPrint = true } = options;

  const parts: string[] = [];

  if (xmlDeclaration) {
    parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  }

  // Root element with CII namespaces
  parts.push(
    `<rsm:CrossIndustryInvoice` +
    ` xmlns:rsm="${CII_NAMESPACES.RSM}"` +
    ` xmlns:ram="${CII_NAMESPACES.RAM}"` +
    ` xmlns:qdt="${CII_NAMESPACES.QDT}"` +
    ` xmlns:udt="${CII_NAMESPACES.UDT}"` +
    ` xmlns:xsi="${CII_NAMESPACES.XSI}">`
  );

  parts.push(generateExchangedDocumentContext(invoice));
  parts.push(generateExchangedDocument(invoice));
  parts.push(generateSupplyChainTradeTransaction(invoice));

  parts.push("</rsm:CrossIndustryInvoice>");

  const xml = parts.join("\n");

  if (!prettyPrint) {
    // Collapse whitespace for compact output
    return xml.replace(/>\s+</g, "><");
  }

  return xml;
}

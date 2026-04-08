import type {
  ZugferdInvoice,
  ZugferdProfile,
  SellerParty,
  BuyerParty,
  InvoiceLine,
  VatBreakdown,
  PaymentInstructions,
  DocumentTypeCode,
  CurrencyCode,
  CountryCode,
  VatCategoryCode,
  PaymentMeansCode,
} from "./types.js";

/**
 * Simple XML tag extraction (no external dependency).
 * Returns first match content for a given tag path.
 */
function extractTag(xml: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "s");
  const match = xml.match(regex);
  return match?.[1]?.trim();
}

function extractTagBlock(xml: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "s");
  const match = xml.match(regex);
  return match?.[1];
}

function extractAllTagBlocks(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gs");
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function extractAttribute(xml: string, tag: string, attr: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "s");
  return xml.match(regex)?.[1];
}

function parseSellerParty(block: string): SellerParty {
  const address = extractTagBlock(block, "ram:PostalTradeAddress") ?? "";
  const contact = extractTagBlock(block, "ram:DefinedTradeContact");

  const taxRegs = extractAllTagBlocks(block, "ram:SpecifiedTaxRegistration");
  let vatId: string | undefined;
  let taxRegistrationId: string | undefined;
  for (const reg of taxRegs) {
    const scheme = extractAttribute(reg, "ram:ID", "schemeID");
    const id = extractTag(reg, "ram:ID");
    if (scheme === "VA") vatId = id;
    if (scheme === "FC") taxRegistrationId = id;
  }

  return {
    name: extractTag(block, "ram:Name") ?? "",
    tradingName: extractTag(block, "ram:Description"),
    vatId,
    taxRegistrationId,
    legalRegistrationId: extractTag(block, "ram:ID"),
    address: {
      streetName: extractTag(address, "ram:LineOne"),
      additionalStreetName: extractTag(address, "ram:LineTwo"),
      city: extractTag(address, "ram:CityName"),
      postCode: extractTag(address, "ram:PostcodeCode"),
      countryCode: (extractTag(address, "ram:CountryID") ?? "DE") as CountryCode,
    },
    contact: contact ? {
      name: extractTag(contact, "ram:PersonName"),
      telephone: extractTag(contact, "ram:CompleteNumber"),
      email: extractTag(contact, "ram:URIID"),
    } : undefined,
  };
}

function parseBuyerParty(block: string): BuyerParty {
  const address = extractTagBlock(block, "ram:PostalTradeAddress") ?? "";
  const contact = extractTagBlock(block, "ram:DefinedTradeContact");

  const taxRegs = extractAllTagBlocks(block, "ram:SpecifiedTaxRegistration");
  let vatId: string | undefined;
  for (const reg of taxRegs) {
    const scheme = extractAttribute(reg, "ram:ID", "schemeID");
    const id = extractTag(reg, "ram:ID");
    if (scheme === "VA") vatId = id;
  }

  return {
    name: extractTag(block, "ram:Name") ?? "",
    tradingName: extractTag(block, "ram:Description"),
    vatId,
    legalRegistrationId: extractTag(block, "ram:ID"),
    address: {
      streetName: extractTag(address, "ram:LineOne"),
      additionalStreetName: extractTag(address, "ram:LineTwo"),
      city: extractTag(address, "ram:CityName"),
      postCode: extractTag(address, "ram:PostcodeCode"),
      countryCode: (extractTag(address, "ram:CountryID") ?? "DE") as CountryCode,
    },
    contact: contact ? {
      name: extractTag(contact, "ram:PersonName"),
      telephone: extractTag(contact, "ram:CompleteNumber"),
      email: extractTag(contact, "ram:URIID"),
    } : undefined,
  };
}

function parseLineItem(block: string): InvoiceLine {
  const product = extractTagBlock(block, "ram:SpecifiedTradeProduct") ?? "";
  const agreement = extractTagBlock(block, "ram:SpecifiedLineTradeAgreement") ?? "";
  const delivery = extractTagBlock(block, "ram:SpecifiedLineTradeDelivery") ?? "";
  const settlement = extractTagBlock(block, "ram:SpecifiedLineTradeSettlement") ?? "";
  const tax = extractTagBlock(settlement, "ram:ApplicableTradeTax") ?? "";

  const unitPrice = parseFloat(extractTag(agreement, "ram:ChargeAmount") ?? "0");

  return {
    id: extractTag(block, "ram:LineID") ?? "",
    quantity: parseFloat(extractTag(delivery, "ram:BilledQuantity") ?? "0"),
    unitCode: extractAttribute(delivery, "ram:BilledQuantity", "unitCode") ?? "C62",
    netAmount: parseFloat(extractTag(settlement, "ram:LineTotalAmount") ?? "0"),
    priceDetails: {
      netPrice: unitPrice,
    },
    vatInfo: {
      categoryCode: (extractTag(tax, "ram:CategoryCode") ?? "S") as VatCategoryCode,
      rate: parseFloat(extractTag(tax, "ram:RateApplicablePercent") ?? "0") || undefined,
    },
    item: {
      name: extractTag(product, "ram:Name") ?? "",
      description: extractTag(product, "ram:Description"),
      standardId: extractTag(product, "ram:GlobalID"),
      sellersId: extractTag(product, "ram:SellerAssignedID"),
    },
  };
}

function parseTaxBreakdown(block: string): VatBreakdown {
  return {
    taxableAmount: parseFloat(extractTag(block, "ram:BasisAmount") ?? "0"),
    taxAmount: parseFloat(extractTag(block, "ram:CalculatedAmount") ?? "0"),
    categoryCode: (extractTag(block, "ram:CategoryCode") ?? "S") as VatCategoryCode,
    rate: parseFloat(extractTag(block, "ram:RateApplicablePercent") ?? "0") || undefined,
    exemptionReasonText: extractTag(block, "ram:ExemptionReason"),
  };
}

function detectProfile(xml: string): ZugferdProfile {
  const profileId = extractTag(xml, "ram:ID") ?? "";
  if (profileId.includes("minimum")) return "MINIMUM";
  if (profileId.includes("basicwl")) return "BASIC WL";
  if (profileId.includes("basic")) return "BASIC";
  if (profileId.includes("extended")) return "EXTENDED";
  return "EN16931";
}

/**
 * Parse a ZUGFeRD/Factur-X/XRechnung CII XML document into typed invoice data.
 */
export function parseZugferdXml(xml: string): ZugferdInvoice {
  const profile = detectProfile(xml);

  const header = extractTagBlock(xml, "rsm:ExchangedDocument") ?? "";
  const transaction = extractTagBlock(xml, "rsm:SupplyChainTradeTransaction") ?? "";
  const agreement = extractTagBlock(transaction, "ram:ApplicableHeaderTradeAgreement") ?? "";
  const settlement = extractTagBlock(transaction, "ram:ApplicableHeaderTradeSettlement") ?? "";
  const summation = extractTagBlock(settlement, "ram:SpecifiedTradeSettlementHeaderMonetarySummation") ?? "";

  const sellerBlock = extractTagBlock(agreement, "ram:SellerTradeParty") ?? "";
  const buyerBlock = extractTagBlock(agreement, "ram:BuyerTradeParty") ?? "";

  const lineItemBlocks = extractAllTagBlocks(transaction, "ram:IncludedSupplyChainTradeLineItem");
  const taxBlocks = extractAllTagBlocks(settlement, "ram:ApplicableTradeTax");

  const paymentTermsBlock = extractTagBlock(settlement, "ram:SpecifiedTradePaymentTerms") ?? "";
  const paymentMeansBlock = extractTagBlock(settlement, "ram:SpecifiedTradeSettlementPaymentMeans") ?? "";

  const paymentInstructions: PaymentInstructions = {
    paymentMeansCode: (extractTag(paymentMeansBlock, "ram:TypeCode") ?? "30") as PaymentMeansCode,
    remittanceInformation: extractTag(paymentTermsBlock, "ram:Description"),
    creditTransfer: (() => {
      const iban = extractTag(paymentMeansBlock, "ram:IBANID");
      if (!iban) return undefined;
      return [{
        iban,
        bic: extractTag(paymentMeansBlock, "ram:BICID"),
        accountName: extractTag(paymentMeansBlock, "ram:AccountName"),
      }];
    })(),
  };

  const noteBlocks = extractAllTagBlocks(header, "ram:IncludedNote");
  const notes = noteBlocks.map((n) => extractTag(n, "ram:Content") ?? "").filter(Boolean);

  return {
    profile,
    invoiceNumber: extractTag(header, "ram:ID") ?? "",
    issueDate: extractTag(header, "udt:DateTimeString") ?? "",
    typeCode: (extractTag(header, "ram:TypeCode") ?? "380") as DocumentTypeCode,
    currencyCode: (extractTag(settlement, "ram:InvoiceCurrencyCode") ?? "EUR") as CurrencyCode,
    buyerReference: extractTag(agreement, "ram:BuyerReference"),
    orderReference: extractTag(extractTagBlock(agreement, "ram:BuyerOrderReferencedDocument") ?? "", "ram:IssuerAssignedID"),
    contractReference: extractTag(extractTagBlock(agreement, "ram:ContractReferencedDocument") ?? "", "ram:IssuerAssignedID"),
    notes: notes.length > 0 ? notes.map((text) => ({ text })) : undefined,
    seller: parseSellerParty(sellerBlock),
    buyer: parseBuyerParty(buyerBlock),
    paymentTerms: extractTag(paymentTermsBlock, "ram:Description"),
    paymentInstructions,
    totals: {
      lineTotalAmount: parseFloat(extractTag(summation, "ram:LineTotalAmount") ?? "0"),
      chargeTotalAmount: parseFloat(extractTag(summation, "ram:ChargeTotalAmount") ?? "0") || undefined,
      allowanceTotalAmount: parseFloat(extractTag(summation, "ram:AllowanceTotalAmount") ?? "0") || undefined,
      taxExclusiveAmount: parseFloat(extractTag(summation, "ram:TaxBasisTotalAmount") ?? "0"),
      taxAmount: parseFloat(extractTag(summation, "ram:TaxTotalAmount") ?? "0") || undefined,
      taxInclusiveAmount: parseFloat(extractTag(summation, "ram:GrandTotalAmount") ?? "0"),
      paidAmount: parseFloat(extractTag(summation, "ram:TotalPrepaidAmount") ?? "0") || undefined,
      duePayableAmount: parseFloat(extractTag(summation, "ram:DuePayableAmount") ?? "0"),
    },
    vatBreakdown: taxBlocks.map(parseTaxBreakdown),
    lines: lineItemBlocks.map(parseLineItem),
  };
}

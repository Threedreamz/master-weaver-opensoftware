import type { ZugferdInvoice, ZugferdProfile, ValidationResult, ValidationIssue } from "./types.js";

type Rule = (invoice: ZugferdInvoice, issues: ValidationIssue[]) => void;

function err(path: string, rule: string, message: string): ValidationIssue {
  return { path, rule, message, severity: "error" };
}

function warn(path: string, rule: string, message: string): ValidationIssue {
  return { path, rule, message, severity: "warning" };
}

// Profile hierarchy: MINIMUM < BASIC WL < BASIC < EN16931 < EXTENDED
const PROFILE_LEVEL: Record<ZugferdProfile, number> = {
  MINIMUM: 0, "BASIC WL": 1, BASIC: 2, EN16931: 3, EXTENDED: 4,
};

function requiresProfile(invoice: ZugferdInvoice, minProfile: ZugferdProfile): boolean {
  return PROFILE_LEVEL[invoice.profile] >= PROFILE_LEVEL[minProfile];
}

const RULES: Rule[] = [
  // BR-01: Invoice number is mandatory
  (inv, e) => { if (!inv.invoiceNumber) e.push(err("invoiceNumber", "BR-01", "Invoice number (BT-1) is mandatory")); },

  // BR-02: Invoice date is mandatory
  (inv, e) => { if (!inv.issueDate) e.push(err("issueDate", "BR-02", "Invoice issue date (BT-2) is mandatory")); },

  // BR-03: Document type code
  (inv, e) => { if (!["380", "381", "384", "389", "751"].includes(inv.typeCode)) e.push(err("typeCode", "BR-03", "Invalid document type code (BT-3)")); },

  // BR-04: Currency code
  (inv, e) => { if (!inv.currencyCode) e.push(err("currencyCode", "BR-04", "Invoice currency code (BT-5) is mandatory")); },

  // BR-05: Seller name
  (inv, e) => { if (!inv.seller.name) e.push(err("seller.name", "BR-05", "Seller name (BT-27) is mandatory")); },

  // BR-06: Buyer name
  (inv, e) => { if (!inv.buyer.name) e.push(err("buyer.name", "BR-06", "Buyer name (BT-44) is mandatory")); },

  // BR-07: Seller postal address country
  (inv, e) => { if (!inv.seller.address.countryCode) e.push(err("seller.address.countryCode", "BR-07", "Seller country code (BT-40) is mandatory")); },

  // BR-08: Buyer postal address country
  (inv, e) => { if (!inv.buyer.address.countryCode) e.push(err("buyer.address.countryCode", "BR-08", "Buyer country code (BT-55) is mandatory")); },

  // BR-09: Seller VAT identifier (when applicable)
  (inv, e) => {
    const hasTaxableItems = inv.vatBreakdown.some((t: VatBreakdownRef) => t.categoryCode === "S" || t.categoryCode === "K" || t.categoryCode === "AE");
    if (hasTaxableItems && !inv.seller.vatId) {
      e.push(err("seller.vatId", "BR-09", "Seller VAT identifier (BT-31) is required when taxable items exist"));
    }
  },

  // BR-10: At least one line item
  (inv, e) => {
    if (requiresProfile(inv, "BASIC") && inv.lines.length === 0) {
      e.push(err("lines", "BR-10", "Invoice must have at least one line item"));
    }
  },

  // BR-12: Line items must have item name
  (inv, e) => {
    if (requiresProfile(inv, "BASIC")) {
      inv.lines.forEach((item: LineRef, i: number) => {
        if (!item.item.name) e.push(err(`lines[${i}].item.name`, "BR-12", `Line item ${item.id} must have an item name`));
      });
    }
  },

  // BR-CO-10: Sum of line net amounts = lineTotalAmount
  (inv, e) => {
    if (requiresProfile(inv, "BASIC") && inv.lines.length > 0) {
      const sum = inv.lines.reduce((s: number, l: LineRef) => s + l.netAmount, 0);
      if (Math.abs(sum - inv.totals.lineTotalAmount) > 0.01) {
        e.push(err("totals.lineTotalAmount", "BR-CO-10", `Sum of line net amounts (${sum.toFixed(2)}) does not match invoice line total (${inv.totals.lineTotalAmount.toFixed(2)})`));
      }
    }
  },

  // BR-CO-13: Tax exclusive = lineTotalAmount - allowanceTotal + chargeTotal
  (inv, e) => {
    const expected = inv.totals.lineTotalAmount - (inv.totals.allowanceTotalAmount ?? 0) + (inv.totals.chargeTotalAmount ?? 0);
    if (Math.abs(expected - inv.totals.taxExclusiveAmount) > 0.01) {
      e.push(err("totals.taxExclusiveAmount", "BR-CO-13", `Tax exclusive amount (${inv.totals.taxExclusiveAmount.toFixed(2)}) should be ${expected.toFixed(2)}`));
    }
  },

  // BR-CO-15: Tax inclusive = tax exclusive + tax total
  (inv, e) => {
    const expected = inv.totals.taxExclusiveAmount + (inv.totals.taxAmount ?? 0);
    if (Math.abs(expected - inv.totals.taxInclusiveAmount) > 0.01) {
      e.push(err("totals.taxInclusiveAmount", "BR-CO-15", `Tax inclusive amount (${inv.totals.taxInclusiveAmount.toFixed(2)}) should be ${expected.toFixed(2)}`));
    }
  },

  // BR-CO-16: Payable = tax inclusive - prepaid + rounding
  (inv, e) => {
    const expected = inv.totals.taxInclusiveAmount - (inv.totals.paidAmount ?? 0) + (inv.totals.roundingAmount ?? 0);
    if (Math.abs(expected - inv.totals.duePayableAmount) > 0.01) {
      e.push(err("totals.duePayableAmount", "BR-CO-16", `Payable amount (${inv.totals.duePayableAmount.toFixed(2)}) should be ${expected.toFixed(2)}`));
    }
  },

  // XRechnung: Buyer reference (Leitweg-ID) is mandatory for German public sector
  (inv, e) => {
    if (inv.profile === "EN16931" && inv.buyer.address.countryCode === "DE" && !inv.buyerReference) {
      e.push(warn("buyerReference", "BR-DE-15", "Buyer reference (Leitweg-ID, BT-10) is recommended for XRechnung"));
    }
  },

  // Payment instructions should be present
  (inv, e) => {
    if (inv.paymentInstructions && !inv.paymentInstructions.paymentMeansCode) {
      e.push(err("paymentInstructions.paymentMeansCode", "BR-49", "Payment means type code (BT-81) is mandatory"));
    }
  },

  // Tax breakdown must exist
  (inv, e) => {
    if (inv.vatBreakdown.length === 0) {
      e.push(err("vatBreakdown", "BR-CO-09", "At least one tax breakdown (BG-23) is required"));
    }
  },
];

// Local type aliases to keep rule closures concise
type VatBreakdownRef = ZugferdInvoice["vatBreakdown"][number];
type LineRef = ZugferdInvoice["lines"][number];

/**
 * Validate a ZUGFeRD invoice against the EN 16931 business rules.
 */
export function validateZugferdInvoice(invoice: ZugferdInvoice): ValidationResult {
  const allIssues: ValidationIssue[] = [];

  for (const rule of RULES) {
    rule(invoice, allIssues);
  }

  return {
    valid: allIssues.filter((e) => e.severity === "error").length === 0,
    profile: invoice.profile,
    issues: allIssues,
  };
}

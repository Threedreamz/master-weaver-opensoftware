/**
 * CAMT.053 (ISO 20022) XML bank statement parser.
 *
 * Parses the standard XML structure:
 *   Document > BkToCstmrStmt > Stmt > Ntry
 *
 * Each Ntry (entry) becomes a BankTransaction.
 * Supports both single and batch entries (NtryDtls > TxDtls).
 */

import type { BankTransaction, ParseResult } from "./types";

/**
 * Extract text content from the first matching tag within an XML fragment.
 * This is a lightweight approach that avoids requiring a full DOM parser
 * dependency — suitable for the well-defined CAMT.053 structure.
 */
function getTagContent(xml: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const match = xml.match(regex);
  return match?.[1]?.trim() || undefined;
}

/**
 * Extract all occurrences of a tag block (including nested content).
 */
function getAllBlocks(xml: string, tag: string): string[] {
  const blocks: string[] = [];
  const openTag = `<${tag}`;
  const closeTag = `</${tag}>`;
  let pos = 0;

  while (pos < xml.length) {
    const start = xml.indexOf(openTag, pos);
    if (start === -1) break;

    const end = xml.indexOf(closeTag, start);
    if (end === -1) break;

    blocks.push(xml.substring(start, end + closeTag.length));
    pos = end + closeTag.length;
  }

  return blocks;
}

/**
 * Parse a single Ntry (entry) block into one or more BankTransactions.
 */
function parseEntry(entryXml: string, fallbackCurrency: string): BankTransaction[] {
  const transactions: BankTransaction[] = [];

  // Determine credit/debit indicator
  const cdtDbtInd = getTagContent(entryXml, "CdtDbtInd");
  const isCredit = cdtDbtInd === "CRDT";

  // Amount from the entry level
  const amtBlock = entryXml.match(/<Amt[^>]*>([^<]*)<\/Amt>/i);
  const entryAmount = amtBlock ? parseFloat(amtBlock[1]) : 0;
  const currencyMatch = entryXml.match(/<Amt[^>]*Ccy="([^"]*)"[^>]*>/i);
  const currency = currencyMatch?.[1] || fallbackCurrency;

  // Booking date
  const bookgDt = getTagContent(entryXml, "BookgDt")
    ? getTagContent(
        entryXml.substring(
          entryXml.indexOf("<BookgDt>"),
          entryXml.indexOf("</BookgDt>") + 10
        ),
        "Dt"
      )
    : undefined;
  const valDt = getTagContent(entryXml, "ValDt")
    ? getTagContent(
        entryXml.substring(
          entryXml.indexOf("<ValDt>"),
          entryXml.indexOf("</ValDt>") + 8
        ),
        "Dt"
      )
    : undefined;
  const date = bookgDt || valDt || "";

  // Booking status
  const stsRaw = getTagContent(entryXml, "Sts");
  const bookingStatus =
    stsRaw === "PDNG" ? "PDNG" : stsRaw === "INFO" ? "INFO" : "BOOK";

  // Entry reference
  const acctSvcrRef = getTagContent(entryXml, "AcctSvcrRef");

  // Try to extract individual transaction details
  const txDtlsBlocks = getAllBlocks(entryXml, "TxDtls");

  if (txDtlsBlocks.length > 0) {
    for (const txDtls of txDtlsBlocks) {
      const tx = parseTxDtls(txDtls, {
        amount: isCredit ? entryAmount : -entryAmount,
        currency,
        date,
        bookingStatus,
        fallbackId: acctSvcrRef,
      });
      transactions.push(tx);
    }
  } else {
    // No TxDtls — create a single transaction from the entry
    const addtlNtryInf = getTagContent(entryXml, "AddtlNtryInf");
    transactions.push({
      id: acctSvcrRef || `entry-${date}-${entryAmount}`,
      date,
      amount: isCredit ? entryAmount : -entryAmount,
      currency,
      purpose: addtlNtryInf,
      bookingStatus,
    });
  }

  return transactions;
}

/**
 * Parse a TxDtls block to extract counterparty and reference details.
 */
function parseTxDtls(
  txDtls: string,
  defaults: {
    amount: number;
    currency: string;
    date: string;
    bookingStatus: "BOOK" | "PDNG" | "INFO";
    fallbackId?: string;
  }
): BankTransaction {
  // Transaction-level amount (may differ from entry in batch entries)
  const txAmtMatch = txDtls.match(/<Amt[^>]*>([^<]*)<\/Amt>/i);
  const txAmount = txAmtMatch ? parseFloat(txAmtMatch[1]) : Math.abs(defaults.amount);
  const signedAmount = defaults.amount >= 0 ? txAmount : -txAmount;

  // References
  const endToEndId = getTagContent(txDtls, "EndToEndId");
  const instrId = getTagContent(txDtls, "InstrId");
  const msgId = getTagContent(txDtls, "MsgId");

  // Creditor (who receives money)
  const cdtrBlocks = getAllBlocks(txDtls, "Cdtr");
  const creditorName = cdtrBlocks.length > 0 ? getTagContent(cdtrBlocks[0], "Nm") : undefined;

  // Debtor (who sends money)
  const dbtrBlocks = getAllBlocks(txDtls, "Dbtr");
  const debtorName = dbtrBlocks.length > 0 ? getTagContent(dbtrBlocks[0], "Nm") : undefined;

  // Counterparty IBAN
  const cdtrAcct = getAllBlocks(txDtls, "CdtrAcct");
  const dbtrAcct = getAllBlocks(txDtls, "DbtrAcct");
  const acctBlock = cdtrAcct.length > 0 ? cdtrAcct[0] : dbtrAcct.length > 0 ? dbtrAcct[0] : "";
  const iban = getTagContent(acctBlock, "IBAN");

  // BIC
  const bic = getTagContent(txDtls, "BIC") || getTagContent(txDtls, "BICFI");

  // Remittance / purpose
  const ustrd = getTagContent(txDtls, "Ustrd");

  return {
    id: endToEndId || instrId || msgId || defaults.fallbackId || `tx-${defaults.date}-${txAmount}`,
    date: defaults.date,
    amount: signedAmount,
    currency: defaults.currency,
    creditorName,
    debtorName,
    reference: endToEndId || instrId,
    iban,
    bic,
    purpose: ustrd,
    bookingStatus: defaults.bookingStatus,
  };
}

/**
 * Parse a CAMT.053 XML string into an array of BankTransactions.
 */
export function parseCamt053(xmlContent: string): ParseResult {
  const errors: string[] = [];
  const transactions: BankTransaction[] = [];

  try {
    // Validate basic structure
    if (!xmlContent.includes("BkToCstmrStmt")) {
      errors.push("Invalid CAMT.053: missing BkToCstmrStmt element");
      return { transactions: [], errors, format: "camt053" };
    }

    // Extract statement blocks
    const stmtBlocks = getAllBlocks(xmlContent, "Stmt");
    if (stmtBlocks.length === 0) {
      errors.push("No Stmt (statement) blocks found in the CAMT.053 file");
      return { transactions: [], errors, format: "camt053" };
    }

    for (const stmt of stmtBlocks) {
      // Default currency from the account
      const acctCcy = getTagContent(stmt, "Ccy") || "EUR";

      // Extract all entries
      const entryBlocks = getAllBlocks(stmt, "Ntry");

      for (let i = 0; i < entryBlocks.length; i++) {
        try {
          const parsed = parseEntry(entryBlocks[i], acctCcy);
          transactions.push(...parsed);
        } catch (err) {
          errors.push(`Failed to parse entry ${i + 1}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  } catch (err) {
    errors.push(`CAMT.053 parsing failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { transactions, errors, format: "camt053" };
}

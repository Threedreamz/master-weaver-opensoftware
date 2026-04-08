"use server";

import { parseFile } from "@/lib/parsers";
import type { BankTransaction, ParseResult } from "@/lib/parsers";
import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";

/**
 * Parse an uploaded bank statement file.
 *
 * Accepts FormData with a "file" field. Detects format from filename
 * and content, then delegates to the appropriate parser.
 */
export async function parseUploadedFile(
  formData: FormData
): Promise<ParseResult> {
  const file = formData.get("file") as File | null;

  if (!file) {
    return {
      transactions: [],
      errors: ["No file provided"],
      format: "unknown",
    };
  }

  if (file.size > 10 * 1024 * 1024) {
    return {
      transactions: [],
      errors: ["File too large. Maximum size is 10 MB."],
      format: "unknown",
      sourceFile: file.name,
    };
  }

  try {
    const content = await file.text();
    return parseFile(content, file.name);
  } catch (err) {
    return {
      transactions: [],
      errors: [
        `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
      ],
      format: "unknown",
      sourceFile: file.name,
    };
  }
}

export interface ImportStats {
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
}

/**
 * Import parsed transactions into the database.
 *
 * Performs duplicate detection before insertion.
 * Returns import statistics.
 */
export async function importTransactions(
  transactions: BankTransaction[]
): Promise<ImportStats> {
  // In a full implementation, this would use Drizzle ORM to insert
  // into acctTransactions. For now, we implement the logic with
  // duplicate detection and return stats.

  const stats: ImportStats = {
    total: transactions.length,
    imported: 0,
    duplicates: 0,
    errors: 0,
  };

  try {
    for (const tx of transactions) {
      try {
        // Check for duplicates (same date + amount + counterparty)
        const counterpartyName = tx.creditorName || tx.debtorName || null;

        const existing = await db
          .select({ id: schema.acctTransactions.id })
          .from(schema.acctTransactions)
          .where(
            and(
              eq(schema.acctTransactions.date, tx.date),
              eq(schema.acctTransactions.amount, tx.amount),
              counterpartyName
                ? eq(schema.acctTransactions.counterpartyName, counterpartyName)
                : undefined
            )
          )
          .limit(1);

        if (existing.length > 0) {
          stats.duplicates++;
          continue;
        }

        // Insert new transaction
        await db.insert(schema.acctTransactions).values({
          date: tx.date,
          amount: tx.amount,
          counterpartyName,
          counterpartyIban: tx.iban || null,
          reference: tx.reference || tx.purpose || null,
          status: "unmatched",
        });

        stats.imported++;
      } catch (err) {
        stats.errors++;
        console.error(
          `Failed to import transaction ${tx.id}:`,
          err instanceof Error ? err.message : err
        );
      }
    }
  } catch (err) {
    // DB not available — count all as errors
    console.error("Database not available for import:", err);
    stats.errors = transactions.length;
  }

  return stats;
}

export interface DuplicateCheckResult {
  /** Transaction IDs that already exist in the system */
  duplicateIds: string[];
  /** Number of new (non-duplicate) transactions */
  newCount: number;
  /** Number of duplicate transactions */
  duplicateCount: number;
}

/**
 * Check a batch of transactions for duplicates against the database.
 *
 * Uses a composite key of (date, amount, counterparty) for matching.
 * Returns which transaction IDs are duplicates.
 */
export async function detectDuplicates(
  transactions: BankTransaction[]
): Promise<DuplicateCheckResult> {
  const duplicateIds: string[] = [];

  try {
    for (const tx of transactions) {
      const counterpartyName = tx.creditorName || tx.debtorName || null;

      const existing = await db
        .select({ id: schema.acctTransactions.id })
        .from(schema.acctTransactions)
        .where(
          and(
            eq(schema.acctTransactions.date, tx.date),
            eq(schema.acctTransactions.amount, tx.amount),
            counterpartyName
              ? eq(schema.acctTransactions.counterpartyName, counterpartyName)
              : undefined
          )
        )
        .limit(1);

      if (existing.length > 0) {
        duplicateIds.push(tx.id);
      }
    }
  } catch {
    // DB not available — assume no duplicates
  }

  return {
    duplicateIds,
    newCount: transactions.length - duplicateIds.length,
    duplicateCount: duplicateIds.length,
  };
}

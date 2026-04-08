"use server";

import { db, schema } from "@/db";
import { eq, desc, sql } from "drizzle-orm";

export type MatchRow = typeof schema.acctMatches.$inferSelect;

export interface MatchWithDetails extends MatchRow {
  transactionDate?: string | null;
  transactionAmount?: number | null;
  transactionCounterparty?: string | null;
  transactionReference?: string | null;
  documentFilename?: string | null;
  documentSupplier?: string | null;
  documentAmount?: number | null;
  invoiceNumber?: string | null;
  invoiceGrossAmount?: number | null;
}

export async function getMatches(): Promise<MatchWithDetails[]> {
  try {
    const rows = await db
      .select({
        id: schema.acctMatches.id,
        transactionId: schema.acctMatches.transactionId,
        documentId: schema.acctMatches.documentId,
        invoiceId: schema.acctMatches.invoiceId,
        score: schema.acctMatches.score,
        status: schema.acctMatches.status,
        reasons: schema.acctMatches.reasons,
        confirmedBy: schema.acctMatches.confirmedBy,
        confirmedAt: schema.acctMatches.confirmedAt,
        createdAt: schema.acctMatches.createdAt,
        transactionDate: schema.acctTransactions.date,
        transactionAmount: schema.acctTransactions.amount,
        transactionCounterparty: schema.acctTransactions.counterpartyName,
        transactionReference: schema.acctTransactions.reference,
        documentFilename: schema.acctDocuments.filename,
        documentSupplier: schema.acctDocuments.supplier,
        documentAmount: schema.acctDocuments.amount,
        invoiceNumber: schema.acctInvoices.invoiceNumber,
        invoiceGrossAmount: schema.acctInvoices.grossAmount,
      })
      .from(schema.acctMatches)
      .leftJoin(
        schema.acctTransactions,
        eq(schema.acctMatches.transactionId, schema.acctTransactions.id)
      )
      .leftJoin(
        schema.acctDocuments,
        eq(schema.acctMatches.documentId, schema.acctDocuments.id)
      )
      .leftJoin(
        schema.acctInvoices,
        eq(schema.acctMatches.invoiceId, schema.acctInvoices.id)
      )
      .orderBy(desc(schema.acctMatches.createdAt));

    return rows;
  } catch {
    return [];
  }
}

export async function getPendingMatches(): Promise<MatchWithDetails[]> {
  try {
    const rows = await db
      .select({
        id: schema.acctMatches.id,
        transactionId: schema.acctMatches.transactionId,
        documentId: schema.acctMatches.documentId,
        invoiceId: schema.acctMatches.invoiceId,
        score: schema.acctMatches.score,
        status: schema.acctMatches.status,
        reasons: schema.acctMatches.reasons,
        confirmedBy: schema.acctMatches.confirmedBy,
        confirmedAt: schema.acctMatches.confirmedAt,
        createdAt: schema.acctMatches.createdAt,
        transactionDate: schema.acctTransactions.date,
        transactionAmount: schema.acctTransactions.amount,
        transactionCounterparty: schema.acctTransactions.counterpartyName,
        transactionReference: schema.acctTransactions.reference,
        documentFilename: schema.acctDocuments.filename,
        documentSupplier: schema.acctDocuments.supplier,
        documentAmount: schema.acctDocuments.amount,
        invoiceNumber: schema.acctInvoices.invoiceNumber,
        invoiceGrossAmount: schema.acctInvoices.grossAmount,
      })
      .from(schema.acctMatches)
      .leftJoin(
        schema.acctTransactions,
        eq(schema.acctMatches.transactionId, schema.acctTransactions.id)
      )
      .leftJoin(
        schema.acctDocuments,
        eq(schema.acctMatches.documentId, schema.acctDocuments.id)
      )
      .leftJoin(
        schema.acctInvoices,
        eq(schema.acctMatches.invoiceId, schema.acctInvoices.id)
      )
      .where(eq(schema.acctMatches.status, "pending"))
      .orderBy(desc(schema.acctMatches.score));

    return rows;
  } catch {
    return [];
  }
}

export async function confirmMatch(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(schema.acctMatches)
      .set({
        status: "confirmed",
        confirmedAt: new Date().toISOString(),
        confirmedBy: "user",
      })
      .where(eq(schema.acctMatches.id, id));

    // Also update the linked transaction status to "matched"
    const match = await db
      .select({ transactionId: schema.acctMatches.transactionId })
      .from(schema.acctMatches)
      .where(eq(schema.acctMatches.id, id))
      .limit(1);

    if (match[0]?.transactionId) {
      await db
        .update(schema.acctTransactions)
        .set({ status: "matched" })
        .where(eq(schema.acctTransactions.id, match[0].transactionId));
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to confirm match",
    };
  }
}

export async function rejectMatch(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(schema.acctMatches)
      .set({
        status: "rejected",
        confirmedAt: new Date().toISOString(),
        confirmedBy: "user",
      })
      .where(eq(schema.acctMatches.id, id));
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reject match",
    };
  }
}

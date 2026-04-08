"use server";

import { db, schema } from "@/db";
import { eq, desc, sql, and, gte, lte, inArray } from "drizzle-orm";

export async function getTransactions(filters?: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const conditions = [];

    if (filters?.status && filters.status !== "all") {
      conditions.push(eq(schema.acctTransactions.status, filters.status as "unmatched" | "matched" | "ignored"));
    }
    if (filters?.dateFrom) {
      conditions.push(gte(schema.acctTransactions.date, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(schema.acctTransactions.date, filters.dateTo));
    }

    const transactions = await db
      .select()
      .from(schema.acctTransactions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.acctTransactions.date));

    return transactions;
  } catch {
    return [];
  }
}

export async function updateTransactionStatus(
  id: number,
  status: "unmatched" | "matched" | "ignored"
) {
  try {
    await db
      .update(schema.acctTransactions)
      .set({ status })
      .where(eq(schema.acctTransactions.id, id));
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function bulkIgnoreTransactions(ids: number[]) {
  try {
    if (ids.length === 0) return { success: true, count: 0 };

    await db
      .update(schema.acctTransactions)
      .set({ status: "ignored" })
      .where(inArray(schema.acctTransactions.id, ids));

    return { success: true, count: ids.length };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

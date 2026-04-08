"use server";

import { db, schema } from "@/db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export type BookingRow = typeof schema.acctBookingEntries.$inferSelect;

export async function getBookingEntries(filters?: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<BookingRow[]> {
  try {
    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(schema.acctBookingEntries.status, filters.status as "vorschlag" | "geprueft" | "exportiert"));
    }
    if (filters?.dateFrom) {
      conditions.push(gte(schema.acctBookingEntries.datum, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(schema.acctBookingEntries.datum, filters.dateTo));
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(schema.acctBookingEntries)
        .where(and(...conditions))
        .orderBy(desc(schema.acctBookingEntries.datum));
    }

    return await db
      .select()
      .from(schema.acctBookingEntries)
      .orderBy(desc(schema.acctBookingEntries.datum));
  } catch {
    return [];
  }
}

export async function createBookingEntry(data: {
  datum: string;
  betrag: number;
  sollHaben: "S" | "H";
  konto: string;
  gegenkonto: string;
  buchungstext: string;
  belegnummer?: string;
  steuerschluessel?: string;
  taxRate?: number;
  kostenstelle?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await db.insert(schema.acctBookingEntries).values({
      datum: data.datum,
      betrag: data.betrag,
      sollHaben: data.sollHaben,
      konto: data.konto,
      gegenkonto: data.gegenkonto,
      buchungstext: data.buchungstext,
      belegnummer: data.belegnummer || null,
      steuerschluessel: data.steuerschluessel || null,
      taxRate: data.taxRate ?? null,
      kostenstelle: data.kostenstelle || null,
      status: "vorschlag",
      autoCategorized: false,
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to create booking entry",
    };
  }
}

export async function updateBookingStatus(
  id: number,
  status: "vorschlag" | "geprueft" | "exportiert"
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(schema.acctBookingEntries)
      .set({
        status,
        reviewedAt: status === "geprueft" ? new Date().toISOString() : undefined,
      })
      .where(eq(schema.acctBookingEntries.id, id));
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to update booking status",
    };
  }
}

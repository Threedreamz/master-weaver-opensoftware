"use server";

import { db, schema } from "@/db";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

export async function getDashboardStats() {
  try {
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endOfMonth = lastDay.toISOString().split("T")[0];

    // Revenue this month (sum of paid invoices)
    const revenueResult = await db
      .select({ total: sql<number>`coalesce(sum(${schema.acctInvoices.grossAmount}), 0)` })
      .from(schema.acctInvoices)
      .where(
        and(
          eq(schema.acctInvoices.status, "bezahlt"),
          gte(schema.acctInvoices.paidAt, firstOfMonth),
          lte(schema.acctInvoices.paidAt, endOfMonth)
        )
      );

    // Open invoices (sent + overdue)
    const openInvoicesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.acctInvoices)
      .where(
        sql`${schema.acctInvoices.status} IN ('gesendet', 'ueberfaellig')`
      );

    // Unmatched transactions
    const unmatchedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.acctTransactions)
      .where(eq(schema.acctTransactions.status, "unmatched"));

    // Documents to process
    const docsToProcessResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.acctDocuments)
      .where(
        sql`${schema.acctDocuments.status} IN ('uploaded', 'processing')`
      );

    // Open reminders
    const openRemindersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.acctReminders)
      .where(
        sql`${schema.acctReminders.status} IN ('entwurf', 'gesendet')`
      );

    // Upcoming due dates (invoices due within 7 days)
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const today = now.toISOString().split("T")[0];

    const upcomingDueResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.acctInvoices)
      .where(
        and(
          sql`${schema.acctInvoices.status} IN ('gesendet', 'ueberfaellig')`,
          gte(schema.acctInvoices.dueDate, today),
          lte(schema.acctInvoices.dueDate, sevenDaysLater)
        )
      );

    return {
      revenue: revenueResult[0]?.total ?? 0,
      openInvoices: openInvoicesResult[0]?.count ?? 0,
      unmatchedTransactions: unmatchedResult[0]?.count ?? 0,
      documentsToProcess: docsToProcessResult[0]?.count ?? 0,
      openReminders: openRemindersResult[0]?.count ?? 0,
      upcomingDueDates: upcomingDueResult[0]?.count ?? 0,
    };
  } catch {
    return {
      revenue: 0,
      openInvoices: 0,
      unmatchedTransactions: 0,
      documentsToProcess: 0,
      openReminders: 0,
      upcomingDueDates: 0,
    };
  }
}

export async function getRevenueChart() {
  try {
    const now = new Date();
    const months: { month: string; label: string; revenue: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0);
      const endDay = `${year}-${String(month).padStart(2, "0")}-${lastDay.getDate()}`;
      const label = d.toLocaleString("en", { month: "short" });

      const result = await db
        .select({ total: sql<number>`coalesce(sum(${schema.acctInvoices.grossAmount}), 0)` })
        .from(schema.acctInvoices)
        .where(
          and(
            eq(schema.acctInvoices.status, "bezahlt"),
            gte(schema.acctInvoices.paidAt, firstDay),
            lte(schema.acctInvoices.paidAt, endDay)
          )
        );

      months.push({
        month: `${year}-${String(month).padStart(2, "0")}`,
        label,
        revenue: result[0]?.total ?? 0,
      });
    }

    return months;
  } catch {
    return [];
  }
}

export async function getRecentBookings() {
  try {
    const entries = await db
      .select()
      .from(schema.acctBookingEntries)
      .orderBy(desc(schema.acctBookingEntries.createdAt))
      .limit(5);

    return entries;
  } catch {
    return [];
  }
}

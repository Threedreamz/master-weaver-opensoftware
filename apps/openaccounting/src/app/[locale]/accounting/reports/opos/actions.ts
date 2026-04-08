"use server";

import { db, schema } from "@/db";
import { sql } from "drizzle-orm";

export interface OpenItem {
  id: number;
  invoiceNumber: string;
  customerName: string | null;
  grossAmount: number;
  issueDate: string;
  dueDate: string;
  daysOverdue: number;
  ageBucket: "0-30" | "31-60" | "61-90" | "90+";
  status: string | null;
}

export interface OposData {
  items: OpenItem[];
  buckets: {
    "0-30": { count: number; total: number };
    "31-60": { count: number; total: number };
    "61-90": { count: number; total: number };
    "90+": { count: number; total: number };
  };
  totalOutstanding: number;
}

/**
 * Get open items (unpaid invoices) with age bucket classification.
 */
export async function getOposData(): Promise<OposData> {
  try {
    const invoices = await db
      .select()
      .from(schema.acctInvoices)
      .where(
        sql`${schema.acctInvoices.status} IN ('gesendet', 'ueberfaellig')`
      );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets = {
      "0-30": { count: 0, total: 0 },
      "31-60": { count: 0, total: 0 },
      "61-90": { count: 0, total: 0 },
      "90+": { count: 0, total: 0 },
    };

    const items: OpenItem[] = invoices.map((inv) => {
      const dueDate = new Date(inv.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const diffMs = today.getTime() - dueDate.getTime();
      const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      let ageBucket: OpenItem["ageBucket"];
      if (daysOverdue <= 30) ageBucket = "0-30";
      else if (daysOverdue <= 60) ageBucket = "31-60";
      else if (daysOverdue <= 90) ageBucket = "61-90";
      else ageBucket = "90+";

      buckets[ageBucket].count++;
      buckets[ageBucket].total += inv.grossAmount;

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        grossAmount: inv.grossAmount,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        daysOverdue,
        ageBucket,
        status: inv.status,
      };
    });

    // Sort by days overdue descending
    items.sort((a, b) => b.daysOverdue - a.daysOverdue);

    const totalOutstanding = items.reduce((sum, item) => sum + item.grossAmount, 0);

    return { items, buckets, totalOutstanding };
  } catch {
    return {
      items: [],
      buckets: {
        "0-30": { count: 0, total: 0 },
        "31-60": { count: 0, total: 0 },
        "61-90": { count: 0, total: 0 },
        "90+": { count: 0, total: 0 },
      },
      totalOutstanding: 0,
    };
  }
}

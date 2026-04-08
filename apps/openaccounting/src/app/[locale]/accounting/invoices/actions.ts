"use server";

import { db, schema } from "@/db";
import { eq, desc, sql } from "drizzle-orm";

export type InvoiceRow = typeof schema.acctInvoices.$inferSelect;

export async function getInvoices(): Promise<InvoiceRow[]> {
  try {
    return await db
      .select()
      .from(schema.acctInvoices)
      .orderBy(desc(schema.acctInvoices.createdAt));
  } catch {
    return [];
  }
}

export async function createInvoice(data: {
  customerName: string;
  customerEmail?: string;
  customerId?: number;
  items: Array<{
    beschreibung: string;
    menge: number;
    einheit: string;
    einzelpreis: number;
    gesamtpreis: number;
  }>;
  taxRate?: number;
  dueInDays?: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate invoice number
    const year = new Date().getFullYear();
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.acctInvoices);
    const nextNum = (countResult[0]?.count ?? 0) + 1;
    const invoiceNumber = `RE-${year}-${String(nextNum).padStart(4, "0")}`;

    const taxRate = data.taxRate ?? 19.0;
    const netAmount = data.items.reduce((sum, item) => sum + item.gesamtpreis, 0);
    const taxAmount = netAmount * (taxRate / 100);
    const grossAmount = netAmount + taxAmount;

    const today = new Date();
    const issueDate = today.toISOString().split("T")[0]!;
    const dueDate = new Date(
      today.getTime() + (data.dueInDays ?? 14) * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split("T")[0]!;

    await db.insert(schema.acctInvoices).values({
      invoiceNumber,
      customerId: data.customerId || null,
      customerName: data.customerName,
      customerEmail: data.customerEmail || null,
      items: data.items,
      netAmount,
      taxRate,
      taxAmount,
      grossAmount,
      issueDate,
      dueDate,
      status: "entwurf",
      notes: data.notes || null,
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create invoice",
    };
  }
}

export async function updateInvoiceStatus(
  id: number,
  status: "entwurf" | "gesendet" | "bezahlt" | "storniert" | "ueberfaellig"
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: Record<string, unknown> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (status === "bezahlt") {
      updates.paidAt = new Date().toISOString();
    }
    await db
      .update(schema.acctInvoices)
      .set(updates)
      .where(eq(schema.acctInvoices.id, id));
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to update invoice status",
    };
  }
}

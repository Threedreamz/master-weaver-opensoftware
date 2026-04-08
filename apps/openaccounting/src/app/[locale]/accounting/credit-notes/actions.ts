"use server";

import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";

export async function getCreditNotes() {
  try {
    const creditNotes = await db
      .select()
      .from(schema.acctCreditNotes)
      .orderBy(desc(schema.acctCreditNotes.createdAt));
    return creditNotes;
  } catch {
    return [];
  }
}

export async function createCreditNote(data: {
  invoiceId?: number;
  customerName?: string;
  items: Array<{ beschreibung: string; menge: number; einheit: string; einzelpreis: number; gesamtpreis: number }>;
  netAmount: number;
  taxRate?: number;
  taxAmount: number;
  grossAmount: number;
  reason?: string;
  notes?: string;
}) {
  try {
    const lastNote = await db
      .select({ number: schema.acctCreditNotes.number })
      .from(schema.acctCreditNotes)
      .orderBy(desc(schema.acctCreditNotes.id))
      .limit(1);

    let nextNum = 1;
    if (lastNote.length > 0) {
      const lastNum = parseInt(lastNote[0].number.replace(/\D/g, ""), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    const year = new Date().getFullYear();
    const number = `GUT-${year}-${String(nextNum).padStart(4, "0")}`;

    const result = await db
      .insert(schema.acctCreditNotes)
      .values({
        number,
        invoiceId: data.invoiceId || null,
        customerName: data.customerName || null,
        items: data.items,
        netAmount: data.netAmount,
        taxRate: data.taxRate ?? 19.0,
        taxAmount: data.taxAmount,
        grossAmount: data.grossAmount,
        reason: data.reason || null,
        notes: data.notes || null,
        status: "entwurf",
      })
      .returning();

    return { success: true, creditNote: result[0] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function updateCreditNoteStatus(
  id: number,
  status: "entwurf" | "gesendet" | "verbucht"
) {
  try {
    await db
      .update(schema.acctCreditNotes)
      .set({ status })
      .where(eq(schema.acctCreditNotes.id, id));
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getInvoicesForCreditNote() {
  try {
    const invoices = await db
      .select({
        id: schema.acctInvoices.id,
        invoiceNumber: schema.acctInvoices.invoiceNumber,
        customerName: schema.acctInvoices.customerName,
        grossAmount: schema.acctInvoices.grossAmount,
        status: schema.acctInvoices.status,
      })
      .from(schema.acctInvoices)
      .orderBy(desc(schema.acctInvoices.createdAt));
    return invoices;
  } catch {
    return [];
  }
}

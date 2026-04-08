"use server";

import { db, schema } from "@/db";
import { eq, desc, sql } from "drizzle-orm";

export async function getAngebote() {
  try {
    const angebote = await db
      .select()
      .from(schema.acctAngebote)
      .orderBy(desc(schema.acctAngebote.createdAt));
    return angebote;
  } catch {
    return [];
  }
}

export async function createAngebot(data: {
  customerName?: string;
  customerEmail?: string;
  customerCompany?: string;
  customerId?: number;
  inquiryId?: number;
  items: Array<{ beschreibung: string; menge: number; einheit: string; einzelpreis: number; gesamtpreis: number }>;
  netAmount: number;
  taxRate?: number;
  taxAmount: number;
  grossAmount: number;
  validUntil?: string;
  notes?: string;
}) {
  try {
    const lastAngebot = await db
      .select({ number: schema.acctAngebote.number })
      .from(schema.acctAngebote)
      .orderBy(desc(schema.acctAngebote.id))
      .limit(1);

    let nextNum = 1;
    if (lastAngebot.length > 0) {
      const lastNum = parseInt(lastAngebot[0].number.replace(/\D/g, ""), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    const year = new Date().getFullYear();
    const number = `ANG-${year}-${String(nextNum).padStart(4, "0")}`;

    const result = await db
      .insert(schema.acctAngebote)
      .values({
        number,
        customerId: data.customerId || null,
        inquiryId: data.inquiryId || null,
        customerName: data.customerName || null,
        customerEmail: data.customerEmail || null,
        customerCompany: data.customerCompany || null,
        items: data.items,
        netAmount: data.netAmount,
        taxRate: data.taxRate ?? 19.0,
        taxAmount: data.taxAmount,
        grossAmount: data.grossAmount,
        validUntil: data.validUntil || null,
        notes: data.notes || null,
        status: "entwurf",
      })
      .returning();

    return { success: true, angebot: result[0] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function updateAngebotStatus(
  id: number,
  status: "entwurf" | "gesendet" | "angenommen" | "abgelehnt" | "in_auftrag"
) {
  try {
    await db
      .update(schema.acctAngebote)
      .set({ status, updatedAt: sql`(datetime('now'))` })
      .where(eq(schema.acctAngebote.id, id));
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function convertToOrder(angebotId: number) {
  try {
    const angebotRows = await db
      .select()
      .from(schema.acctAngebote)
      .where(eq(schema.acctAngebote.id, angebotId))
      .limit(1);

    if (angebotRows.length === 0) {
      return { success: false, error: "Angebot not found" };
    }

    const angebot = angebotRows[0];

    // Generate order number
    const lastOrder = await db
      .select({ number: schema.acctOrders.number })
      .from(schema.acctOrders)
      .orderBy(desc(schema.acctOrders.id))
      .limit(1);

    let nextNum = 1;
    if (lastOrder.length > 0) {
      const lastNum = parseInt(lastOrder[0].number.replace(/\D/g, ""), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    const year = new Date().getFullYear();
    const orderNumber = `AUF-${year}-${String(nextNum).padStart(4, "0")}`;

    const orderResult = await db
      .insert(schema.acctOrders)
      .values({
        number: orderNumber,
        angebotId: angebot.id,
        inquiryId: angebot.inquiryId,
        customerId: angebot.customerId,
        customerName: angebot.customerName,
        customerEmail: angebot.customerEmail,
        customerCompany: angebot.customerCompany,
        items: angebot.items,
        netAmount: angebot.netAmount,
        taxRate: angebot.taxRate,
        taxAmount: angebot.taxAmount,
        grossAmount: angebot.grossAmount,
        notes: angebot.notes,
        status: "neu",
      })
      .returning();

    // Update angebot status to in_auftrag
    await db
      .update(schema.acctAngebote)
      .set({ status: "in_auftrag", updatedAt: sql`(datetime('now'))` })
      .where(eq(schema.acctAngebote.id, angebotId));

    return { success: true, order: orderResult[0] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

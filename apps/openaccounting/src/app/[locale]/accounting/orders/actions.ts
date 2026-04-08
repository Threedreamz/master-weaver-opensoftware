"use server";

import { db, schema } from "@/db";
import { eq, desc, sql } from "drizzle-orm";

export async function getOrders() {
  try {
    const orders = await db
      .select()
      .from(schema.acctOrders)
      .orderBy(desc(schema.acctOrders.createdAt));
    return orders;
  } catch {
    return [];
  }
}

export async function createOrder(data: {
  customerName?: string;
  customerEmail?: string;
  customerCompany?: string;
  customerType?: "B2B" | "B2C";
  customerId?: number;
  inquiryId?: number;
  angebotId?: number;
  items: Array<{ beschreibung: string; menge: number; einheit: string; einzelpreis: number; gesamtpreis: number }>;
  netAmount: number;
  taxRate?: number;
  taxAmount: number;
  grossAmount: number;
  notes?: string;
}) {
  try {
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
    const number = `AUF-${year}-${String(nextNum).padStart(4, "0")}`;

    const result = await db
      .insert(schema.acctOrders)
      .values({
        number,
        customerId: data.customerId || null,
        inquiryId: data.inquiryId || null,
        angebotId: data.angebotId || null,
        customerName: data.customerName || null,
        customerEmail: data.customerEmail || null,
        customerCompany: data.customerCompany || null,
        customerType: data.customerType || null,
        items: data.items,
        netAmount: data.netAmount,
        taxRate: data.taxRate ?? 19.0,
        taxAmount: data.taxAmount,
        grossAmount: data.grossAmount,
        notes: data.notes || null,
        status: "neu",
      })
      .returning();

    return { success: true, order: result[0] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function updateOrderStatus(
  id: number,
  status: "neu" | "in_bearbeitung" | "in_produktion" | "versendet" | "abgeschlossen" | "storniert"
) {
  try {
    await db
      .update(schema.acctOrders)
      .set({ status, updatedAt: sql`(datetime('now'))` })
      .where(eq(schema.acctOrders.id, id));
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getOrderDetail(id: number) {
  try {
    const orderRows = await db
      .select()
      .from(schema.acctOrders)
      .where(eq(schema.acctOrders.id, id))
      .limit(1);

    if (orderRows.length === 0) {
      return { success: false, error: "Order not found" };
    }

    const order = orderRows[0];

    // Fetch linked inquiry if present
    let inquiry = null;
    if (order.inquiryId) {
      const inquiryRows = await db
        .select()
        .from(schema.acctInquiries)
        .where(eq(schema.acctInquiries.id, order.inquiryId))
        .limit(1);
      inquiry = inquiryRows[0] || null;
    }

    // Fetch linked angebot if present
    let angebot = null;
    if (order.angebotId) {
      const angebotRows = await db
        .select()
        .from(schema.acctAngebote)
        .where(eq(schema.acctAngebote.id, order.angebotId))
        .limit(1);
      angebot = angebotRows[0] || null;
    }

    return { success: true, order, inquiry, angebot };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

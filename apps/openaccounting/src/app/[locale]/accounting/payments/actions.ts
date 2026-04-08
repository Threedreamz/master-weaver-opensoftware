"use server";

import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";

export async function getPayments() {
  try {
    const payments = await db
      .select()
      .from(schema.acctPayments)
      .orderBy(desc(schema.acctPayments.createdAt));
    return payments;
  } catch {
    return [];
  }
}

export async function recordPayment(data: {
  invoiceId?: number;
  orderId?: number;
  method?: "ueberweisung" | "sepa" | "karte" | "paypal" | "klarna" | "bar";
  amount: number;
  currency?: string;
  reference?: string;
  payerName?: string;
  payerEmail?: string;
  payerIban?: string;
  type?: "eingang" | "ausgang" | "erstattung";
  notes?: string;
  paidAt?: string;
}) {
  try {
    const result = await db
      .insert(schema.acctPayments)
      .values({
        invoiceId: data.invoiceId || null,
        orderId: data.orderId || null,
        method: data.method || null,
        amount: data.amount,
        currency: data.currency || "EUR",
        reference: data.reference || null,
        payerName: data.payerName || null,
        payerEmail: data.payerEmail || null,
        payerIban: data.payerIban || null,
        type: data.type || "eingang",
        notes: data.notes || null,
        status: "offen",
        paidAt: data.paidAt || null,
      })
      .returning();

    return { success: true, payment: result[0] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function assignPaymentToInvoice(paymentId: number, invoiceId: number) {
  try {
    await db
      .update(schema.acctPayments)
      .set({ invoiceId, status: "zugeordnet" })
      .where(eq(schema.acctPayments.id, paymentId));

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

"use server";

import { db, schema } from "@/db";
import { eq, desc, and, lt, sql } from "drizzle-orm";

export async function getReminders() {
  try {
    const reminders = await db
      .select({
        id: schema.acctReminders.id,
        invoiceId: schema.acctReminders.invoiceId,
        level: schema.acctReminders.level,
        fee: schema.acctReminders.fee,
        interestRate: schema.acctReminders.interestRate,
        interestAmount: schema.acctReminders.interestAmount,
        totalDue: schema.acctReminders.totalDue,
        dueDate: schema.acctReminders.dueDate,
        notes: schema.acctReminders.notes,
        status: schema.acctReminders.status,
        sentAt: schema.acctReminders.sentAt,
        createdAt: schema.acctReminders.createdAt,
        invoiceNumber: schema.acctInvoices.invoiceNumber,
        invoiceGrossAmount: schema.acctInvoices.grossAmount,
      })
      .from(schema.acctReminders)
      .leftJoin(schema.acctInvoices, eq(schema.acctReminders.invoiceId, schema.acctInvoices.id))
      .orderBy(desc(schema.acctReminders.createdAt));
    return reminders;
  } catch {
    return [];
  }
}

export async function createReminder(data: {
  invoiceId: number;
  level: number;
  fee?: number;
  interestRate?: number;
  interestAmount?: number;
  totalDue: number;
  dueDate: string;
  notes?: string;
}) {
  try {
    const result = await db
      .insert(schema.acctReminders)
      .values({
        invoiceId: data.invoiceId,
        level: data.level,
        fee: data.fee ?? 0,
        interestRate: data.interestRate ?? 0,
        interestAmount: data.interestAmount ?? 0,
        totalDue: data.totalDue,
        dueDate: data.dueDate,
        notes: data.notes || null,
        status: "entwurf",
      })
      .returning();

    return { success: true, reminder: result[0] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getOverdueInvoices() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const invoices = await db
      .select({
        id: schema.acctInvoices.id,
        invoiceNumber: schema.acctInvoices.invoiceNumber,
        customerName: schema.acctInvoices.customerName,
        grossAmount: schema.acctInvoices.grossAmount,
        dueDate: schema.acctInvoices.dueDate,
        status: schema.acctInvoices.status,
      })
      .from(schema.acctInvoices)
      .where(
        and(
          lt(schema.acctInvoices.dueDate, today),
          eq(schema.acctInvoices.status, "gesendet")
        )
      )
      .orderBy(schema.acctInvoices.dueDate);
    return invoices;
  } catch {
    return [];
  }
}

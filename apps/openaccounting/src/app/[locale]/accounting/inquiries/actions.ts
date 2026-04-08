"use server";

import { db, schema } from "@/db";
import { eq, desc, sql } from "drizzle-orm";

export async function getInquiries() {
  try {
    const inquiries = await db
      .select()
      .from(schema.acctInquiries)
      .orderBy(desc(schema.acctInquiries.createdAt));
    return inquiries;
  } catch {
    return [];
  }
}

export async function createInquiry(data: {
  subject: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
  customerType?: "B2B" | "B2C";
  source?: "website" | "email" | "phone" | "manual";
  customerId?: number;
  assignedTo?: string;
  notes?: string;
}) {
  try {
    const lastInquiry = await db
      .select({ number: schema.acctInquiries.number })
      .from(schema.acctInquiries)
      .orderBy(desc(schema.acctInquiries.id))
      .limit(1);

    let nextNum = 1;
    if (lastInquiry.length > 0) {
      const lastNum = parseInt(lastInquiry[0].number.replace(/\D/g, ""), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    const year = new Date().getFullYear();
    const number = `ANF-${year}-${String(nextNum).padStart(4, "0")}`;

    const result = await db
      .insert(schema.acctInquiries)
      .values({
        number,
        subject: data.subject,
        name: data.name || null,
        email: data.email || null,
        phone: data.phone || null,
        company: data.company || null,
        message: data.message || null,
        customerType: data.customerType || null,
        source: data.source || "manual",
        customerId: data.customerId || null,
        assignedTo: data.assignedTo || null,
        notes: data.notes || null,
        status: "neu",
      })
      .returning();

    return { success: true, inquiry: result[0] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function updateInquiryStatus(
  id: number,
  status: "neu" | "in_bearbeitung" | "angebot_erstellt" | "abgeschlossen" | "abgelehnt"
) {
  try {
    await db
      .update(schema.acctInquiries)
      .set({ status, updatedAt: sql`(datetime('now'))` })
      .where(eq(schema.acctInquiries.id, id));
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

"use server";

import { db, schema } from "@/db";
import { eq, desc, sql } from "drizzle-orm";

export async function getSuppliers() {
  try {
    const suppliers = await db
      .select()
      .from(schema.acctSuppliers)
      .orderBy(desc(schema.acctSuppliers.createdAt));
    return suppliers;
  } catch {
    return [];
  }
}

export async function createSupplier(data: {
  name: string;
  company?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
  paymentTermsDays?: number;
  paymentTerms?: string;
  rating?: number;
  notes?: string;
}) {
  try {
    // Generate next supplier number
    const lastSupplier = await db
      .select({ supplierNumber: schema.acctSuppliers.supplierNumber })
      .from(schema.acctSuppliers)
      .orderBy(desc(schema.acctSuppliers.id))
      .limit(1);

    let nextNum = 70001;
    if (lastSupplier.length > 0) {
      const lastNum = parseInt(lastSupplier[0].supplierNumber.replace(/\D/g, ""), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    const supplierNumber = `L-${nextNum}`;

    const result = await db
      .insert(schema.acctSuppliers)
      .values({
        supplierNumber,
        name: data.name,
        company: data.company || null,
        contactName: data.contactName || null,
        email: data.email || null,
        phone: data.phone || null,
        street: data.street || null,
        zip: data.zip || null,
        city: data.city || null,
        country: data.country || "DE",
        paymentTermsDays: data.paymentTermsDays ?? 30,
        paymentTerms: data.paymentTerms || null,
        rating: data.rating || null,
        notes: data.notes || null,
        status: "active",
      })
      .returning();

    return { success: true, supplier: result[0] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function updateSupplier(
  id: number,
  data: Partial<{
    name: string;
    company: string;
    contactName: string;
    email: string;
    phone: string;
    street: string;
    zip: string;
    city: string;
    country: string;
    paymentTermsDays: number;
    paymentTerms: string;
    rating: number;
    status: "active" | "inactive";
    notes: string;
  }>
) {
  try {
    await db
      .update(schema.acctSuppliers)
      .set(data)
      .where(eq(schema.acctSuppliers.id, id));
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function deleteSupplier(id: number) {
  try {
    await db
      .delete(schema.acctSuppliers)
      .where(eq(schema.acctSuppliers.id, id));
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

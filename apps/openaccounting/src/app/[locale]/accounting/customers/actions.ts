"use server";

import { db, schema } from "@/db";
import { eq, like, desc, sql } from "drizzle-orm";

export type CustomerRow = typeof schema.acctCustomers.$inferSelect;

export async function getCustomers(search?: string): Promise<CustomerRow[]> {
  try {
    if (search && search.trim()) {
      const pattern = `%${search.trim()}%`;
      return await db
        .select()
        .from(schema.acctCustomers)
        .where(
          sql`${schema.acctCustomers.name} LIKE ${pattern} OR ${schema.acctCustomers.company} LIKE ${pattern} OR ${schema.acctCustomers.email} LIKE ${pattern}`
        )
        .orderBy(desc(schema.acctCustomers.createdAt));
    }
    return await db
      .select()
      .from(schema.acctCustomers)
      .orderBy(desc(schema.acctCustomers.createdAt));
  } catch {
    return [];
  }
}

export async function createCustomer(data: {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  type?: "B2B" | "B2C";
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
  vatId?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate customer number
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.acctCustomers);
    const nextNum = (countResult[0]?.count ?? 0) + 1;
    const customerNumber = `KD-${String(nextNum).padStart(5, "0")}`;

    await db.insert(schema.acctCustomers).values({
      customerNumber,
      name: data.name,
      company: data.company || null,
      email: data.email || null,
      phone: data.phone || null,
      type: data.type || "B2C",
      street: data.street || null,
      zip: data.zip || null,
      city: data.city || null,
      country: data.country || "DE",
      vatId: data.vatId || null,
      notes: data.notes || null,
      status: "active",
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create customer",
    };
  }
}

export async function updateCustomer(
  id: number,
  data: {
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    type?: "B2B" | "B2C";
    status?: "active" | "inactive";
    street?: string;
    zip?: string;
    city?: string;
    country?: string;
    vatId?: string;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(schema.acctCustomers)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(schema.acctCustomers.id, id));
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update customer",
    };
  }
}

export async function deleteCustomer(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .delete(schema.acctCustomers)
      .where(eq(schema.acctCustomers.id, id));
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete customer",
    };
  }
}

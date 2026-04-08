"use server";

import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import type { NewInvLieferant } from "@opensoftware/db/openinventory";

export async function getSuppliers() {
  try {
    return await db
      .select()
      .from(schema.invLieferanten)
      .orderBy(desc(schema.invLieferanten.createdAt));
  } catch {
    return [];
  }
}

export async function createSupplier(data: {
  nummer: string;
  name: string;
  kontakt?: string;
  email?: string;
  telefon?: string;
  adresse?: string;
  zahlungsbedingungen?: string;
  bewertung?: number;
}) {
  try {
    const [supplier] = await db
      .insert(schema.invLieferanten)
      .values({
        nummer: data.nummer,
        name: data.name,
        kontakt: data.kontakt,
        email: data.email,
        telefon: data.telefon,
        adresse: data.adresse,
        zahlungsbedingungen: data.zahlungsbedingungen,
        bewertung: data.bewertung,
        status: "aktiv",
      })
      .returning();
    return { success: true, supplier };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateSupplier(id: number, data: Partial<NewInvLieferant>) {
  try {
    await db
      .update(schema.invLieferanten)
      .set(data)
      .where(eq(schema.invLieferanten.id, id));
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deleteSupplier(id: number) {
  try {
    await db.delete(schema.invLieferanten).where(eq(schema.invLieferanten.id, id));
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

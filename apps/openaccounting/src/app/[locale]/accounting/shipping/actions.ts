"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

type AcctShipment = typeof schema.acctShipments.$inferSelect;

export async function getShipments(): Promise<AcctShipment[]> {
  try {
    return await db.select().from(schema.acctShipments).orderBy(schema.acctShipments.createdAt);
  } catch {
    return [];
  }
}

export async function createShipment(data: {
  orderId?: number;
  trackingNumber?: string;
  carrier?: string;
  recipientName?: string;
  recipientCompany?: string;
  recipientStreet?: string;
  recipientZip?: string;
  recipientCity?: string;
  recipientCountry?: string;
  shippingType?: "paket" | "express" | "warenpost" | "sperrgut";
  weightKg?: number;
  items?: Array<{ beschreibung: string; menge: number }>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate shipment number
    const year = new Date().getFullYear();
    const existing = await db
      .select({ id: schema.acctShipments.id })
      .from(schema.acctShipments);
    const seq = String(existing.length + 1).padStart(4, "0");
    const number = `SHP-${year}-${seq}`;

    await db.insert(schema.acctShipments).values({
      number,
      orderId: data.orderId ?? null,
      trackingNumber: data.trackingNumber ?? null,
      carrier: data.carrier ?? "dhl",
      recipientName: data.recipientName ?? null,
      recipientCompany: data.recipientCompany ?? null,
      recipientStreet: data.recipientStreet ?? null,
      recipientZip: data.recipientZip ?? null,
      recipientCity: data.recipientCity ?? null,
      recipientCountry: data.recipientCountry ?? "DE",
      shippingType: data.shippingType ?? "paket",
      weightKg: data.weightKg ?? null,
      items: data.items ?? null,
      status: "neu",
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function updateShipmentStatus(
  id: number,
  status: "neu" | "label_erstellt" | "abgeholt" | "in_zustellung" | "zugestellt" | "problem" | "retour",
  problemReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: Record<string, unknown> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (status === "problem") {
      updates.isProblem = true;
      updates.problemReason = problemReason ?? null;
    } else {
      updates.isProblem = false;
      updates.problemReason = null;
    }

    if (status === "abgeholt" || status === "in_zustellung") {
      updates.shippedAt = new Date().toISOString();
    }

    if (status === "zugestellt") {
      updates.deliveredAt = new Date().toISOString();
    }

    await db
      .update(schema.acctShipments)
      .set(updates)
      .where(eq(schema.acctShipments.id, id));

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

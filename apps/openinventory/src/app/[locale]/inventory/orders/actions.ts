"use server";

import { db, schema } from "@/db";
import { eq, desc, sql } from "drizzle-orm";
import type { NewInvBestellung } from "@opensoftware/db/openinventory";

export async function getOrders() {
  try {
    const orders = await db
      .select({
        id: schema.invBestellungen.id,
        bestellnummer: schema.invBestellungen.bestellnummer,
        lieferantId: schema.invBestellungen.lieferantId,
        lieferantName: schema.invLieferanten.name,
        positionen: schema.invBestellungen.positionen,
        nettoBetrag: schema.invBestellungen.nettoBetrag,
        steuerBetrag: schema.invBestellungen.steuerBetrag,
        bruttoBetrag: schema.invBestellungen.bruttoBetrag,
        status: schema.invBestellungen.status,
        bestelltAm: schema.invBestellungen.bestelltAm,
        erwartetAm: schema.invBestellungen.erwartetAm,
        createdAt: schema.invBestellungen.createdAt,
      })
      .from(schema.invBestellungen)
      .leftJoin(
        schema.invLieferanten,
        eq(schema.invBestellungen.lieferantId, schema.invLieferanten.id)
      )
      .orderBy(desc(schema.invBestellungen.createdAt));

    return orders;
  } catch {
    return [];
  }
}

export async function createOrder(data: {
  bestellnummer: string;
  lieferantId: number;
  positionen: Array<{
    artikelId: number;
    artikelnummer: string;
    bezeichnung: string;
    menge: number;
    einzelpreis: number;
    gesamtpreis: number;
  }>;
  nettoBetrag: number;
  steuerBetrag: number;
  bruttoBetrag: number;
  kostenstelle?: string;
  notizen?: string;
}) {
  try {
    const [order] = await db
      .insert(schema.invBestellungen)
      .values({
        bestellnummer: data.bestellnummer,
        lieferantId: data.lieferantId,
        positionen: data.positionen,
        nettoBetrag: data.nettoBetrag,
        steuerBetrag: data.steuerBetrag,
        bruttoBetrag: data.bruttoBetrag,
        kostenstelle: data.kostenstelle,
        notizen: data.notizen,
        status: "entwurf",
      })
      .returning();
    return { success: true, order };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateOrderStatus(id: number, status: string) {
  try {
    const updateData: Record<string, unknown> = { status };
    if (status === "bestellt") {
      updateData.bestelltAm = new Date().toISOString();
    }
    await db
      .update(schema.invBestellungen)
      .set(updateData)
      .where(eq(schema.invBestellungen.id, id));
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deleteOrder(id: number) {
  try {
    await db.delete(schema.invBestellungen).where(eq(schema.invBestellungen.id, id));
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

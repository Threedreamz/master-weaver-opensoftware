"use server";

import { db, schema } from "@/db";
import { eq, desc, sql } from "drizzle-orm";

export async function getGoodsReceipts() {
  try {
    const receipts = await db
      .select({
        id: schema.invWareneingaenge.id,
        bestellungId: schema.invWareneingaenge.bestellungId,
        bestellnummer: schema.invBestellungen.bestellnummer,
        lieferantName: schema.invLieferanten.name,
        positionen: schema.invWareneingaenge.positionen,
        status: schema.invWareneingaenge.status,
        geprueftVon: schema.invWareneingaenge.geprueftVon,
        notizen: schema.invWareneingaenge.notizen,
        createdAt: schema.invWareneingaenge.createdAt,
      })
      .from(schema.invWareneingaenge)
      .leftJoin(
        schema.invBestellungen,
        eq(schema.invWareneingaenge.bestellungId, schema.invBestellungen.id)
      )
      .leftJoin(
        schema.invLieferanten,
        eq(schema.invBestellungen.lieferantId, schema.invLieferanten.id)
      )
      .orderBy(desc(schema.invWareneingaenge.createdAt));

    return receipts;
  } catch {
    return [];
  }
}

export async function createGoodsReceipt(data: {
  bestellungId: number;
  positionen: Array<{
    artikelId: number;
    menge: number;
    qualitaetOk: boolean;
    notizen?: string;
  }>;
  notizen?: string;
}) {
  try {
    const [receipt] = await db
      .insert(schema.invWareneingaenge)
      .values({
        bestellungId: data.bestellungId,
        positionen: data.positionen,
        notizen: data.notizen,
        status: "offen",
      })
      .returning();
    return { success: true, receipt };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateGoodsReceiptStatus(
  id: number,
  status: "offen" | "geprueft" | "eingelagert",
  geprueftVon?: string
) {
  try {
    const updateData: Record<string, unknown> = { status };
    if (geprueftVon) {
      updateData.geprueftVon = geprueftVon;
    }

    await db
      .update(schema.invWareneingaenge)
      .set(updateData)
      .where(eq(schema.invWareneingaenge.id, id));

    // When status becomes "eingelagert", update stock levels
    if (status === "eingelagert") {
      const receipt = await db
        .select()
        .from(schema.invWareneingaenge)
        .where(eq(schema.invWareneingaenge.id, id))
        .limit(1);

      if (receipt[0]?.positionen) {
        const positionen = receipt[0].positionen as Array<{
          artikelId: number;
          menge: number;
          qualitaetOk: boolean;
        }>;

        for (const pos of positionen) {
          if (!pos.qualitaetOk) continue;

          // Get current stock
          const [artikel] = await db
            .select({ lagerbestand: schema.invArtikel.lagerbestand })
            .from(schema.invArtikel)
            .where(eq(schema.invArtikel.id, pos.artikelId));

          const bestandVorher = artikel?.lagerbestand ?? 0;
          const bestandNachher = bestandVorher + pos.menge;

          // Update article stock
          await db
            .update(schema.invArtikel)
            .set({ lagerbestand: bestandNachher })
            .where(eq(schema.invArtikel.id, pos.artikelId));

          // Create stock movement record
          await db.insert(schema.invLagerbewegungen).values({
            artikelId: pos.artikelId,
            typ: "zugang",
            menge: pos.menge,
            bestandVorher,
            bestandNachher,
            referenzTyp: "wareneingang",
            referenzId: id,
          });
        }
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

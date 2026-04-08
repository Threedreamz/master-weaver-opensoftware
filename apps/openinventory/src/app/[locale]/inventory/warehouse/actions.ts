"use server";

import { db, schema } from "@/db";
import { eq, desc, sql } from "drizzle-orm";

export async function getStockMovements(filters?: {
  artikelId?: number;
  typ?: string;
}) {
  try {
    let query = db
      .select({
        id: schema.invLagerbewegungen.id,
        artikelId: schema.invLagerbewegungen.artikelId,
        artikelBezeichnung: schema.invArtikel.bezeichnung,
        artikelnummer: schema.invArtikel.artikelnummer,
        typ: schema.invLagerbewegungen.typ,
        menge: schema.invLagerbewegungen.menge,
        bestandVorher: schema.invLagerbewegungen.bestandVorher,
        bestandNachher: schema.invLagerbewegungen.bestandNachher,
        referenzTyp: schema.invLagerbewegungen.referenzTyp,
        referenzId: schema.invLagerbewegungen.referenzId,
        notizen: schema.invLagerbewegungen.notizen,
        createdAt: schema.invLagerbewegungen.createdAt,
      })
      .from(schema.invLagerbewegungen)
      .leftJoin(
        schema.invArtikel,
        eq(schema.invLagerbewegungen.artikelId, schema.invArtikel.id)
      )
      .orderBy(desc(schema.invLagerbewegungen.createdAt))
      .$dynamic();

    if (filters?.artikelId) {
      query = query.where(eq(schema.invLagerbewegungen.artikelId, filters.artikelId));
    }
    if (filters?.typ) {
      query = query.where(eq(schema.invLagerbewegungen.typ, filters.typ as "zugang" | "abgang" | "korrektur" | "inventur"));
    }

    return await query;
  } catch {
    return [];
  }
}

export async function createStockMovement(data: {
  artikelId: number;
  typ: "zugang" | "abgang" | "korrektur" | "inventur";
  menge: number;
  notizen?: string;
}) {
  try {
    // Get current stock
    const [artikel] = await db
      .select({ lagerbestand: schema.invArtikel.lagerbestand })
      .from(schema.invArtikel)
      .where(eq(schema.invArtikel.id, data.artikelId));

    if (!artikel) {
      return { success: false, error: "Artikel nicht gefunden" };
    }

    const bestandVorher = artikel.lagerbestand ?? 0;
    let bestandNachher: number;

    switch (data.typ) {
      case "zugang":
        bestandNachher = bestandVorher + data.menge;
        break;
      case "abgang":
        bestandNachher = bestandVorher - data.menge;
        break;
      case "korrektur":
      case "inventur":
        bestandNachher = data.menge; // Absolute value for corrections/inventory
        break;
      default:
        return { success: false, error: "Ungueltiger Typ" };
    }

    // Create movement record
    const [movement] = await db
      .insert(schema.invLagerbewegungen)
      .values({
        artikelId: data.artikelId,
        typ: data.typ,
        menge: data.menge,
        bestandVorher,
        bestandNachher,
        notizen: data.notizen,
      })
      .returning();

    // Update article stock
    await db
      .update(schema.invArtikel)
      .set({ lagerbestand: bestandNachher })
      .where(eq(schema.invArtikel.id, data.artikelId));

    return { success: true, movement };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

"use server";

import { db, schema } from "@/db";
import { eq, desc, sql } from "drizzle-orm";
import type { InvArtikel, NewInvArtikel } from "@opensoftware/db/openinventory";

export async function getArticles() {
  try {
    const articles = await db
      .select({
        id: schema.invArtikel.id,
        artikelnummer: schema.invArtikel.artikelnummer,
        bezeichnung: schema.invArtikel.bezeichnung,
        kategorie: schema.invArtikelKategorien.name,
        kategorieId: schema.invArtikel.kategorieId,
        lagerbestand: schema.invArtikel.lagerbestand,
        mindestbestand: schema.invArtikel.mindestbestand,
        einheit: schema.invArtikel.einheit,
        preisProEinheit: schema.invArtikel.preisProEinheit,
        status: schema.invArtikel.status,
        createdAt: schema.invArtikel.createdAt,
      })
      .from(schema.invArtikel)
      .leftJoin(
        schema.invArtikelKategorien,
        eq(schema.invArtikel.kategorieId, schema.invArtikelKategorien.id)
      )
      .orderBy(desc(schema.invArtikel.createdAt));

    return articles;
  } catch {
    return [];
  }
}

export async function createArticle(data: {
  artikelnummer: string;
  bezeichnung: string;
  beschreibung?: string;
  kategorieId?: number;
  einheit?: string;
  mindestbestand?: number;
  lagerbestand?: number;
  lagerort?: string;
  preisProEinheit?: number;
  lieferantId?: number;
}) {
  try {
    const [article] = await db
      .insert(schema.invArtikel)
      .values({
        artikelnummer: data.artikelnummer,
        bezeichnung: data.bezeichnung,
        beschreibung: data.beschreibung,
        kategorieId: data.kategorieId,
        einheit: data.einheit || "Stueck",
        mindestbestand: data.mindestbestand || 0,
        lagerbestand: data.lagerbestand || 0,
        lagerort: data.lagerort,
        preisProEinheit: data.preisProEinheit,
        lieferantId: data.lieferantId,
        status: "aktiv",
      })
      .returning();
    return { success: true, article };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateArticle(id: number, data: Partial<NewInvArtikel>) {
  try {
    await db
      .update(schema.invArtikel)
      .set(data)
      .where(eq(schema.invArtikel.id, id));
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deleteArticle(id: number) {
  try {
    await db.delete(schema.invArtikel).where(eq(schema.invArtikel.id, id));
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function getLowStockArticles() {
  try {
    return await db
      .select()
      .from(schema.invArtikel)
      .where(
        sql`${schema.invArtikel.lagerbestand} < ${schema.invArtikel.mindestbestand} AND ${schema.invArtikel.mindestbestand} > 0`
      );
  } catch {
    return [];
  }
}

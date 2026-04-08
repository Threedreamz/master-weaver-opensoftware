"use server";

import { db, schema } from "@/db";
import { count, lt, eq, sql } from "drizzle-orm";

export interface DashboardStats {
  totalArticles: number;
  lowStockAlerts: number;
  openOrders: number;
  pendingGoodsReceipt: number;
  stockByCategory: Array<{ category: string; value: number }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Total articles
    const [articleCount] = await db
      .select({ count: count() })
      .from(schema.invArtikel);

    // Low stock alerts (lagerbestand < mindestbestand)
    const [lowStock] = await db
      .select({ count: count() })
      .from(schema.invArtikel)
      .where(
        sql`${schema.invArtikel.lagerbestand} < ${schema.invArtikel.mindestbestand} AND ${schema.invArtikel.mindestbestand} > 0`
      );

    // Open orders (not yet delivered or cancelled)
    const [openOrderCount] = await db
      .select({ count: count() })
      .from(schema.invBestellungen)
      .where(
        sql`${schema.invBestellungen.status} NOT IN ('geliefert', 'storniert')`
      );

    // Pending goods receipts
    const [pendingReceipt] = await db
      .select({ count: count() })
      .from(schema.invWareneingaenge)
      .where(
        sql`${schema.invWareneingaenge.status} != 'eingelagert'`
      );

    // Stock value by category
    const categoryStockRaw = await db
      .select({
        category: schema.invArtikelKategorien.name,
        value: sql<number>`COALESCE(SUM(${schema.invArtikel.lagerbestand} * ${schema.invArtikel.preisProEinheit}), 0)`,
      })
      .from(schema.invArtikel)
      .leftJoin(
        schema.invArtikelKategorien,
        eq(schema.invArtikel.kategorieId, schema.invArtikelKategorien.id)
      )
      .groupBy(schema.invArtikelKategorien.name);

    const stockByCategory = categoryStockRaw.map((r) => ({
      category: r.category || "Ohne Kategorie",
      value: Number(r.value) || 0,
    }));

    return {
      totalArticles: articleCount?.count ?? 0,
      lowStockAlerts: lowStock?.count ?? 0,
      openOrders: openOrderCount?.count ?? 0,
      pendingGoodsReceipt: pendingReceipt?.count ?? 0,
      stockByCategory,
    };
  } catch {
    return {
      totalArticles: 0,
      lowStockAlerts: 0,
      openOrders: 0,
      pendingGoodsReceipt: 0,
      stockByCategory: [],
    };
  }
}

"use server";

import { db, schema } from "@/db";
import { eq, desc, count, sql } from "drizzle-orm";
import type { NewInvArtikelKategorie } from "@opensoftware/db/openinventory";

export async function getCategories() {
  try {
    const categories = await db
      .select({
        id: schema.invArtikelKategorien.id,
        name: schema.invArtikelKategorien.name,
        color: schema.invArtikelKategorien.color,
        sortOrder: schema.invArtikelKategorien.sortOrder,
        isActive: schema.invArtikelKategorien.isActive,
        isDefault: schema.invArtikelKategorien.isDefault,
        articleCount: sql<number>`(SELECT COUNT(*) FROM inv_artikel WHERE kategorie_id = ${schema.invArtikelKategorien.id})`,
        createdAt: schema.invArtikelKategorien.createdAt,
      })
      .from(schema.invArtikelKategorien)
      .orderBy(schema.invArtikelKategorien.sortOrder);

    return categories;
  } catch {
    return [];
  }
}

export async function createCategory(data: {
  name: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
  isDefault?: boolean;
}) {
  try {
    const [category] = await db
      .insert(schema.invArtikelKategorien)
      .values({
        name: data.name,
        color: data.color || "#f59e0b",
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        isDefault: data.isDefault ?? false,
      })
      .returning();
    return { success: true, category };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateCategory(id: number, data: Partial<NewInvArtikelKategorie>) {
  try {
    await db
      .update(schema.invArtikelKategorien)
      .set(data)
      .where(eq(schema.invArtikelKategorien.id, id));
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deleteCategory(id: number) {
  try {
    await db.delete(schema.invArtikelKategorien).where(eq(schema.invArtikelKategorien.id, id));
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

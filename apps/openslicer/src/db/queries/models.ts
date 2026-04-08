import { eq } from "drizzle-orm";
import { db } from "../index";
import { slicerModels } from "../schema";

export type SlicerModelRow = typeof slicerModels.$inferSelect;
export type SlicerModelInsert = typeof slicerModels.$inferInsert;

export function getAllModels(): SlicerModelRow[] {
  return db.select().from(slicerModels).all();
}

export function getModelById(id: string): SlicerModelRow | undefined {
  return db.select().from(slicerModels).where(eq(slicerModels.id, id)).get();
}

export function createModel(data: SlicerModelInsert): SlicerModelRow {
  return db.insert(slicerModels).values(data).returning().get();
}

export function updateModel(
  id: string,
  data: Partial<SlicerModelInsert>
): SlicerModelRow | undefined {
  return db
    .update(slicerModels)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(slicerModels.id, id))
    .returning()
    .get();
}

export function deleteModel(id: string): void {
  db.delete(slicerModels).where(eq(slicerModels.id, id)).run();
}

import { eq } from "drizzle-orm";
import { db } from "../index";
import { slicerPrinterProfiles } from "../schema";

export type SlicerPrinterProfileRow = typeof slicerPrinterProfiles.$inferSelect;
export type SlicerPrinterProfileInsert = typeof slicerPrinterProfiles.$inferInsert;

export function getAllPrinterProfiles(): SlicerPrinterProfileRow[] {
  return db.select().from(slicerPrinterProfiles).all();
}

export function getPrinterProfileById(id: string): SlicerPrinterProfileRow | undefined {
  return db.select().from(slicerPrinterProfiles).where(eq(slicerPrinterProfiles.id, id)).get();
}

export function createPrinterProfile(data: SlicerPrinterProfileInsert): SlicerPrinterProfileRow {
  return db.insert(slicerPrinterProfiles).values(data).returning().get();
}

export function updatePrinterProfile(
  id: string,
  data: Partial<SlicerPrinterProfileInsert>
): SlicerPrinterProfileRow | undefined {
  return db
    .update(slicerPrinterProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(slicerPrinterProfiles.id, id))
    .returning()
    .get();
}

export function deletePrinterProfile(id: string): void {
  db.delete(slicerPrinterProfiles).where(eq(slicerPrinterProfiles.id, id)).run();
}

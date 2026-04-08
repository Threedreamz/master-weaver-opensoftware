import { eq } from "drizzle-orm";
import { db } from "../index";
import { slicerFilamentProfiles } from "../schema";

export type SlicerFilamentProfileRow = typeof slicerFilamentProfiles.$inferSelect;
export type SlicerFilamentProfileInsert = typeof slicerFilamentProfiles.$inferInsert;

export function getAllFilamentProfiles(): SlicerFilamentProfileRow[] {
  return db.select().from(slicerFilamentProfiles).all();
}

export function getFilamentProfileById(id: string): SlicerFilamentProfileRow | undefined {
  return db.select().from(slicerFilamentProfiles).where(eq(slicerFilamentProfiles.id, id)).get();
}

export function createFilamentProfile(data: SlicerFilamentProfileInsert): SlicerFilamentProfileRow {
  return db.insert(slicerFilamentProfiles).values(data).returning().get();
}

export function updateFilamentProfile(
  id: string,
  data: Partial<SlicerFilamentProfileInsert>
): SlicerFilamentProfileRow | undefined {
  return db
    .update(slicerFilamentProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(slicerFilamentProfiles.id, id))
    .returning()
    .get();
}

export function deleteFilamentProfile(id: string): void {
  db.delete(slicerFilamentProfiles).where(eq(slicerFilamentProfiles.id, id)).run();
}

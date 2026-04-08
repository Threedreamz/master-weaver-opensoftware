import { eq } from "drizzle-orm";
import { db } from "../index";
import { slicerProcessProfiles } from "../schema";

export type SlicerProcessProfileRow = typeof slicerProcessProfiles.$inferSelect;
export type SlicerProcessProfileInsert = typeof slicerProcessProfiles.$inferInsert;

export function getAllProcessProfiles(): SlicerProcessProfileRow[] {
  return db.select().from(slicerProcessProfiles).all();
}

export function getProcessProfileById(id: string): SlicerProcessProfileRow | undefined {
  return db.select().from(slicerProcessProfiles).where(eq(slicerProcessProfiles.id, id)).get();
}

export function createProcessProfile(data: SlicerProcessProfileInsert): SlicerProcessProfileRow {
  return db.insert(slicerProcessProfiles).values(data).returning().get();
}

export function updateProcessProfile(
  id: string,
  data: Partial<SlicerProcessProfileInsert>
): SlicerProcessProfileRow | undefined {
  return db
    .update(slicerProcessProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(slicerProcessProfiles.id, id))
    .returning()
    .get();
}

export function deleteProcessProfile(id: string): void {
  db.delete(slicerProcessProfiles).where(eq(slicerProcessProfiles.id, id)).run();
}

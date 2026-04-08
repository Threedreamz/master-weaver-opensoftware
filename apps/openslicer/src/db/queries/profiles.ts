import { eq } from "drizzle-orm";
import { db } from "../index";
import { slicerProfiles } from "../schema";

export type SlicerProfileRow = typeof slicerProfiles.$inferSelect;
export type SlicerProfileInsert = typeof slicerProfiles.$inferInsert;

export function getAllProfiles(): SlicerProfileRow[] {
  return db.select().from(slicerProfiles).all();
}

export function getProfileById(id: string): SlicerProfileRow | undefined {
  return db.select().from(slicerProfiles).where(eq(slicerProfiles.id, id)).get();
}

export function getDefaultProfiles(): SlicerProfileRow[] {
  return db
    .select()
    .from(slicerProfiles)
    .where(eq(slicerProfiles.isDefault, true))
    .all();
}

export function createProfile(data: SlicerProfileInsert): SlicerProfileRow {
  return db.insert(slicerProfiles).values(data).returning().get();
}

export function updateProfile(
  id: string,
  data: Partial<SlicerProfileInsert>
): SlicerProfileRow | undefined {
  return db
    .update(slicerProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(slicerProfiles.id, id))
    .returning()
    .get();
}

export function deleteProfile(id: string): void {
  db.delete(slicerProfiles).where(eq(slicerProfiles.id, id)).run();
}

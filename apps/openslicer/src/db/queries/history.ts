import { eq } from "drizzle-orm";
import { db } from "../index";
import { slicerHistory, slicerGcodes, slicerModels, slicerProfiles } from "../schema";

export type SlicerHistoryRow = typeof slicerHistory.$inferSelect;
export type SlicerHistoryInsert = typeof slicerHistory.$inferInsert;

export function getAllHistory() {
  return db
    .select({
      history: slicerHistory,
      model: slicerModels,
      profile: slicerProfiles,
    })
    .from(slicerHistory)
    .leftJoin(slicerModels, eq(slicerHistory.modelId, slicerModels.id))
    .leftJoin(slicerProfiles, eq(slicerHistory.profileId, slicerProfiles.id))
    .orderBy(slicerHistory.createdAt)
    .all();
}

export function getHistoryById(id: string) {
  const row = db
    .select({
      history: slicerHistory,
      model: slicerModels,
      profile: slicerProfiles,
    })
    .from(slicerHistory)
    .leftJoin(slicerModels, eq(slicerHistory.modelId, slicerModels.id))
    .leftJoin(slicerProfiles, eq(slicerHistory.profileId, slicerProfiles.id))
    .where(eq(slicerHistory.id, id))
    .get();

  if (!row) return undefined;

  // Also fetch associated gcodes
  const gcodes = db
    .select()
    .from(slicerGcodes)
    .where(eq(slicerGcodes.historyId, id))
    .all();

  return { ...row, gcodes };
}

export function createHistory(data: SlicerHistoryInsert): SlicerHistoryRow {
  return db.insert(slicerHistory).values(data).returning().get();
}

export function updateHistoryStatus(
  id: string,
  status: "pending" | "slicing" | "completed" | "failed",
  extra?: {
    outputFilePath?: string;
    estimatedTime?: number;
    estimatedMaterial?: number;
    layerCount?: number;
    errorMessage?: string;
    startedAt?: Date;
    completedAt?: Date;
  }
): SlicerHistoryRow | undefined {
  return db
    .update(slicerHistory)
    .set({ status, ...extra })
    .where(eq(slicerHistory.id, id))
    .returning()
    .get();
}

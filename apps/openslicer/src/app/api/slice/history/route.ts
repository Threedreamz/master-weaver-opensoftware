import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { slicerHistory, slicerModels, slicerProfiles, slicerGcodes } from "../../../../db/schema";
import { resolveUser } from "../../../../lib/internal-user";

export async function GET(request: Request) {
  const u = await resolveUser(request);
  if (u instanceof NextResponse) return u;

  // Fetch all history with joined model, profile, and gcode data
  const rows = db
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

  // For each history entry, fetch associated gcodes
  const results = rows.map((row) => {
    const gcodes = db
      .select()
      .from(slicerGcodes)
      .where(eq(slicerGcodes.historyId, row.history.id))
      .all();

    return {
      ...row.history,
      model: row.model
        ? {
            id: row.model.id,
            name: row.model.name,
            filename: row.model.filename,
            fileFormat: row.model.fileFormat,
          }
        : null,
      profile: row.profile
        ? {
            id: row.profile.id,
            name: row.profile.name,
            technology: row.profile.technology,
            slicerEngine: row.profile.slicerEngine,
          }
        : null,
      gcodes: gcodes.map((g) => ({
        id: g.id,
        filePath: g.filePath,
        fileSizeBytes: g.fileSizeBytes,
        metadata: g.metadata,
        createdAt: g.createdAt,
      })),
    };
  });

  return NextResponse.json(results);
}

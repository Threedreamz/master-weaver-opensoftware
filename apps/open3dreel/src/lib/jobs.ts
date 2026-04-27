import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reelJobs, type NewReelJob, type ReelJob } from "@/db/schema";

export async function createJob(input: NewReelJob): Promise<ReelJob> {
  const [job] = await db.insert(reelJobs).values(input).returning();
  if (!job) throw new Error("createJob: insert returned no row");
  return job;
}

export async function getJob(id: string): Promise<ReelJob | null> {
  const rows = await db.select().from(reelJobs).where(eq(reelJobs.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function setJobRendering(id: string): Promise<ReelJob | null> {
  const [job] = await db
    .update(reelJobs)
    .set({ status: "rendering", startedAt: new Date(), updatedAt: new Date() })
    .where(eq(reelJobs.id, id))
    .returning();
  return job ?? null;
}

export async function completeJob(
  id: string,
  outputPath: string,
  mimeType: string,
  sizeBytes: number,
): Promise<ReelJob | null> {
  const [job] = await db
    .update(reelJobs)
    .set({
      status: "complete",
      outputPath,
      outputMimeType: mimeType,
      outputSizeBytes: sizeBytes,
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(reelJobs.id, id))
    .returning();
  return job ?? null;
}

export async function failJob(id: string, error: string): Promise<ReelJob | null> {
  const [job] = await db
    .update(reelJobs)
    .set({ status: "failed", error, finishedAt: new Date(), updatedAt: new Date() })
    .where(eq(reelJobs.id, id))
    .returning();
  return job ?? null;
}

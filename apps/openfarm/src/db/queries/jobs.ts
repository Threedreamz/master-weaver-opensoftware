import { eq, desc, sql } from "drizzle-orm";
import { db } from "../index";
import { farmPrintJobs } from "../schema";
import { notify } from "@/lib/notify";

export async function getJobs() {
  return db.query.farmPrintJobs.findMany({
    orderBy: [desc(farmPrintJobs.queuedAt)],
  });
}

export async function getJobById(id: string) {
  return db.query.farmPrintJobs.findFirst({
    where: eq(farmPrintJobs.id, id),
    with: {
      printer: true,
      model: true,
      profile: true,
      material: true,
    },
  });
}

export async function createJob(data: {
  name: string;
  modelId: string;
  printerId?: string;
  profileId?: string;
  materialId?: string;
  batchJobId?: string;
  priority?: number;
}) {
  const [job] = await db.insert(farmPrintJobs).values(data).returning();
  return job;
}

export async function updateJobStatus(
  id: string,
  status: "queued" | "slicing" | "printing" | "paused" | "completed" | "failed" | "cancelled",
  extra?: { progressPercent?: number; errorMessage?: string }
) {
  const updates: Record<string, unknown> = {
    status,
    updatedAt: sql`(unixepoch())`,
  };
  if (extra?.progressPercent !== undefined) updates.progressPercent = extra.progressPercent;
  if (extra?.errorMessage !== undefined) updates.errorMessage = extra.errorMessage;
  if (status === "completed") updates.completedAt = sql`(unixepoch())`;
  if (status === "printing") updates.printStartedAt = sql`(unixepoch())`;

  const [job] = await db
    .update(farmPrintJobs)
    .set(updates)
    .where(eq(farmPrintJobs.id, id))
    .returning();

  // Emit notifications for key status changes (fire-and-forget)
  if (status === "completed") {
    notify({
      type: "print_done",
      title: `Print complete: ${job.name}`,
      message: `${job.name} has finished printing. Remove the part.`,
      printerId: job.printerId ?? undefined,
      jobId: job.id,
      metadata: { jobName: job.name },
    });
  } else if (status === "failed") {
    notify({
      type: "error_check",
      title: `Print failed: ${job.name}`,
      message: `${job.name} failed: ${extra?.errorMessage ?? "Unknown error"}`,
      printerId: job.printerId ?? undefined,
      jobId: job.id,
      metadata: { jobName: job.name, errorMessage: extra?.errorMessage },
    });
  }

  return job;
}

import { eq, desc, sql } from "drizzle-orm";
import { db } from "../index";
import { farmPackingJobs, farmPackingItems, farmPrintJobs } from "../schema";

export async function getPackingJobs() {
  return db.query.farmPackingJobs.findMany({
    orderBy: [desc(farmPackingJobs.createdAt)],
    with: {
      printer: true,
      items: {
        with: { model: true },
      },
    },
  });
}

export async function getPackingJobById(id: string) {
  return db.query.farmPackingJobs.findFirst({
    where: eq(farmPackingJobs.id, id),
    with: {
      printer: true,
      items: {
        with: { model: true },
      },
    },
  });
}

export async function createPackingJob(data: {
  printerId: string;
  name: string;
  buildVolumeX: number;
  buildVolumeY: number;
  buildVolumeZ: number;
}) {
  const [job] = await db.insert(farmPackingJobs).values(data).returning();
  return job;
}

export async function addPackingItem(data: {
  packingJobId: string;
  modelId: string;
  quantity?: number;
}) {
  const [item] = await db.insert(farmPackingItems).values({
    packingJobId: data.packingJobId,
    modelId: data.modelId,
    quantity: data.quantity ?? 1,
  }).returning();
  return item;
}

export async function removePackingItem(itemId: string) {
  await db.delete(farmPackingItems).where(eq(farmPackingItems.id, itemId));
}

export async function updatePackingJobResult(id: string, result: {
  status: string;
  utilizationPercent: number;
  totalParts: number;
  packedParts: number;
  packingResult: unknown[];
  estimatedPrintTime?: number;
  estimatedCost?: number;
}) {
  const [job] = await db.update(farmPackingJobs).set({
    status: result.status as "draft" | "packing" | "packed" | "approved" | "printing" | "completed" | "failed",
    utilizationPercent: result.utilizationPercent,
    totalParts: result.totalParts,
    packedParts: result.packedParts,
    packingResult: result.packingResult as any,
    estimatedPrintTime: result.estimatedPrintTime,
    estimatedCost: result.estimatedCost,
    updatedAt: sql`(unixepoch())`,
  }).where(eq(farmPackingJobs.id, id)).returning();
  return job;
}

export async function approvePackingJob(id: string) {
  // Create print jobs for each packed item
  const packingJob = await getPackingJobById(id);
  if (!packingJob) throw new Error("Packing job not found");

  for (const item of packingJob.items) {
    await db.insert(farmPrintJobs).values({
      name: `SLS Pack: ${item.model?.name ?? "Part"} #${item.id.slice(0, 8)}`,
      modelId: item.modelId,
      printerId: packingJob.printerId,
      status: "queued",
    });
  }

  const [updated] = await db.update(farmPackingJobs).set({
    status: "approved" as const,
    updatedAt: sql`(unixepoch())`,
  }).where(eq(farmPackingJobs.id, id)).returning();

  return updated;
}

import { eq, desc, sql, and, count } from "drizzle-orm";
import { db } from "../index";
import { farmAssignmentRules, farmAssignmentLogs, farmPrintJobs, farmPrinters } from "../schema";

export async function getAssignmentRules() {
  return db.query.farmAssignmentRules.findMany({
    orderBy: [desc(farmAssignmentRules.priority)],
  });
}

export async function createAssignmentRule(data: {
  name: string;
  priority?: number;
  conditions: Record<string, unknown>;
  preferredPrinterIds: string[];
  enabled?: boolean;
}) {
  const [rule] = await db.insert(farmAssignmentRules).values(data).returning();
  return rule;
}

export async function updateAssignmentRule(
  id: string,
  data: Partial<{
    name: string;
    priority: number;
    conditions: Record<string, unknown>;
    preferredPrinterIds: string[];
    enabled: boolean;
  }>
) {
  const [rule] = await db
    .update(farmAssignmentRules)
    .set(data)
    .where(eq(farmAssignmentRules.id, id))
    .returning();
  return rule;
}

export async function deleteAssignmentRule(id: string) {
  await db.delete(farmAssignmentRules).where(eq(farmAssignmentRules.id, id));
}

export async function logAssignment(data: {
  jobId: string;
  printerId: string;
  score: number;
  reason: string;
  factors: Record<string, number>;
  accepted: boolean;
}) {
  const [log] = await db.insert(farmAssignmentLogs).values(data).returning();
  return log;
}

export async function getAssignmentLogs(jobId: string) {
  return db.query.farmAssignmentLogs.findMany({
    where: eq(farmAssignmentLogs.jobId, jobId),
    orderBy: [desc(farmAssignmentLogs.score)],
  });
}

export async function getPrintersForAssignment() {
  const printers = await db.query.farmPrinters.findMany();

  // Count active jobs per printer
  const jobCounts = await db
    .select({
      printerId: farmPrintJobs.printerId,
      count: count(),
    })
    .from(farmPrintJobs)
    .where(
      and(
        sql`${farmPrintJobs.status} IN ('queued', 'slicing', 'ready', 'sending', 'printing', 'paused')`
      )
    )
    .groupBy(farmPrintJobs.printerId);

  const countMap = new Map(jobCounts.map((j) => [j.printerId, j.count]));

  return printers.map((p) => ({
    id: p.id,
    name: p.name,
    technology: p.technology,
    status: p.status,
    buildVolumeX: p.buildVolumeX,
    buildVolumeY: p.buildVolumeY,
    buildVolumeZ: p.buildVolumeZ,
    currentJobCount: countMap.get(p.id) ?? 0,
    loadedMaterialId: null as string | null, // TODO: track loaded material
  }));
}

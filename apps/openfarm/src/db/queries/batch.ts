import { eq, desc } from "drizzle-orm";
import { db } from "../index";
import { farmBatchJobs } from "../schema";

export async function getBatchJobs() {
  return db.query.farmBatchJobs.findMany({
    orderBy: [desc(farmBatchJobs.createdAt)],
  });
}

export async function getBatchJobById(id: string) {
  return db.query.farmBatchJobs.findFirst({
    where: eq(farmBatchJobs.id, id),
    with: {
      printJobs: true,
    },
  });
}

export async function createBatchJob(data: {
  name: string;
  technology: "fdm" | "sla" | "sls";
  modelId: string;
  parameterMatrix: Record<string, unknown[]>;
  totalJobs?: number;
  createdBy?: string;
}) {
  const [batch] = await db.insert(farmBatchJobs).values(data).returning();
  return batch;
}

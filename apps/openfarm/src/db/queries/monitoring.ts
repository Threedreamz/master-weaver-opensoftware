import { eq, and, desc, gte, sql } from "drizzle-orm";
import { db } from "../index";
import { farmPrinters, farmPrintJobs, farmPrinterMetrics } from "../schema";

export async function getPrintersWithCurrentJobs() {
  return db.query.farmPrinters.findMany({
    with: {
      printJobs: {
        where: eq(farmPrintJobs.status, "printing"),
        limit: 1,
        orderBy: [desc(farmPrintJobs.printStartedAt)],
      },
    },
    orderBy: [desc(farmPrinters.status)],
  });
}

export async function getPrinterWithCurrentJob(printerId: string) {
  return db.query.farmPrinters.findFirst({
    where: eq(farmPrinters.id, printerId),
    with: {
      printJobs: {
        where: eq(farmPrintJobs.status, "printing"),
        limit: 1,
        with: {
          model: true,
          material: true,
          profile: true,
        },
      },
    },
  });
}

export async function recordPrinterMetric(data: {
  printerId: string;
  metricType: typeof farmPrinterMetrics.metricType.enumValues[number];
  value: number;
}) {
  const [metric] = await db.insert(farmPrinterMetrics).values(data).returning();
  return metric;
}

export async function getRecentMetrics(printerId: string, hours: number = 24) {
  const cutoff = Math.floor(Date.now() / 1000) - hours * 3600;
  return db.query.farmPrinterMetrics.findMany({
    where: and(
      eq(farmPrinterMetrics.printerId, printerId),
      gte(farmPrinterMetrics.recordedAt, new Date(cutoff * 1000))
    ),
    orderBy: [desc(farmPrinterMetrics.recordedAt)],
    limit: 500,
  });
}

export async function incrementPrinterStats(
  printerId: string,
  printTimeSeconds: number
) {
  const printTimeHours = printTimeSeconds / 3600;
  await db
    .update(farmPrinters)
    .set({
      totalPrintHours: sql`COALESCE(${farmPrinters.totalPrintHours}, 0) + ${printTimeHours}`,
      totalPrintCount: sql`COALESCE(${farmPrinters.totalPrintCount}, 0) + 1`,
      updatedAt: sql`(unixepoch())`,
    })
    .where(eq(farmPrinters.id, printerId));
}

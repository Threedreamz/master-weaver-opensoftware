import { eq, desc, sql } from "drizzle-orm";
import { db } from "../index";
import { farmPrinters } from "../schema";

export async function getPrinters() {
  return db.query.farmPrinters.findMany({
    orderBy: [desc(farmPrinters.createdAt)],
  });
}

export async function getPrinterById(id: string) {
  return db.query.farmPrinters.findFirst({
    where: eq(farmPrinters.id, id),
  });
}

export async function createPrinter(data: {
  name: string;
  technology: "fdm" | "sla" | "sls";
  protocol: "moonraker" | "octoprint" | "bambu_mqtt" | "bambu_cloud" | "formlabs_local" | "formlabs_cloud" | "sls4all" | "manual";
  ipAddress?: string;
  port?: number;
  apiKey?: string;
  make?: string;
  model?: string;
  buildVolumeX?: number;
  buildVolumeY?: number;
  buildVolumeZ?: number;
  nozzleDiameter?: number;
  hasHeatedBed?: boolean;
  hasEnclosure?: boolean;
}) {
  const [printer] = await db.insert(farmPrinters).values(data).returning();
  return printer;
}

export async function updatePrinter(
  id: string,
  data: Partial<{
    name: string;
    ipAddress: string;
    apiKey: string;
    status: "online" | "offline" | "printing" | "paused" | "error" | "maintenance";
    notes: string;
  }>
) {
  const [printer] = await db
    .update(farmPrinters)
    .set({ ...data, updatedAt: sql`(unixepoch())` })
    .where(eq(farmPrinters.id, id))
    .returning();
  return printer;
}

export async function deletePrinter(id: string) {
  await db.delete(farmPrinters).where(eq(farmPrinters.id, id));
}

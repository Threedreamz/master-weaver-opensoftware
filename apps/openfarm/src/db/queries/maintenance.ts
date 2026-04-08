import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { db } from "../index";
import { farmMaintenanceTasks, farmSpareParts, farmMaintenanceParts } from "../schema";

// ==================== Maintenance Tasks ====================

export async function getMaintenanceTasks(filters?: { printerId?: string; status?: string }) {
  const conditions = [];
  if (filters?.printerId) conditions.push(eq(farmMaintenanceTasks.printerId, filters.printerId));
  if (filters?.status) conditions.push(eq(farmMaintenanceTasks.status, filters.status as any));

  return db.query.farmMaintenanceTasks.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(farmMaintenanceTasks.dueAt)],
    with: { printer: true },
  });
}

export async function getDueTasks() {
  return db.query.farmMaintenanceTasks.findMany({
    where: inArray(farmMaintenanceTasks.status, ["due", "overdue"]),
    orderBy: [desc(farmMaintenanceTasks.dueAt)],
    with: { printer: true },
  });
}

export async function createMaintenanceTask(data: {
  printerId: string;
  name: string;
  description?: string;
  type: string;
  intervalHours?: number;
  intervalPrints?: number;
  dueAt?: Date;
}) {
  const [task] = await db.insert(farmMaintenanceTasks).values({
    ...data,
    type: data.type as any,
  }).returning();
  return task;
}

export async function updateMaintenanceTaskStatus(id: string, status: string, notes?: string) {
  const updates: Record<string, unknown> = {
    status,
    updatedAt: sql`(unixepoch())`,
  };
  if (status === "completed") {
    updates.lastCompletedAt = sql`(unixepoch())`;
    if (notes) updates.completionNotes = notes;
  }

  const [task] = await db.update(farmMaintenanceTasks)
    .set(updates)
    .where(eq(farmMaintenanceTasks.id, id))
    .returning();
  return task;
}

// ==================== Spare Parts ====================

export async function getSpareParts() {
  return db.query.farmSpareParts.findMany({
    orderBy: [desc(farmSpareParts.createdAt)],
  });
}

export async function createSparePart(data: {
  name: string;
  partNumber?: string;
  category?: string;
  compatiblePrinterIds?: string[];
  quantity?: number;
  minQuantity?: number;
  costPerUnit?: number;
  supplier?: string;
  supplierUrl?: string;
  notes?: string;
}) {
  const [part] = await db.insert(farmSpareParts).values(data).returning();
  return part;
}

export async function updateSparePartStock(id: string, quantity: number) {
  const [part] = await db.update(farmSpareParts)
    .set({ quantity, updatedAt: sql`(unixepoch())` })
    .where(eq(farmSpareParts.id, id))
    .returning();
  return part;
}

export async function getLowStockParts() {
  return db.select()
    .from(farmSpareParts)
    .where(sql`${farmSpareParts.quantity} <= ${farmSpareParts.minQuantity}`);
}

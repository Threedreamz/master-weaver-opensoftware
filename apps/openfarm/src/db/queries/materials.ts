import { eq, desc, sql } from "drizzle-orm";
import { db } from "../index";
import { farmMaterials } from "../schema";
import type { NewFarmMaterial } from "../schema";

export async function getMaterials() {
  return db.query.farmMaterials.findMany({
    orderBy: [desc(farmMaterials.createdAt)],
  });
}

export async function getMaterialById(id: string) {
  return db.query.farmMaterials.findFirst({
    where: eq(farmMaterials.id, id),
  });
}

export async function createMaterial(data: NewFarmMaterial) {
  const [material] = await db.insert(farmMaterials).values(data).returning();
  return material;
}

export async function updateMaterial(
  id: string,
  data: Partial<NewFarmMaterial>
) {
  const [material] = await db
    .update(farmMaterials)
    .set({ ...data, updatedAt: sql`(unixepoch())` })
    .where(eq(farmMaterials.id, id))
    .returning();
  return material;
}

export async function deleteMaterial(id: string) {
  await db.delete(farmMaterials).where(eq(farmMaterials.id, id));
}

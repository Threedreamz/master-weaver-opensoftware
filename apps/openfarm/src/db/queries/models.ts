import { eq, desc } from "drizzle-orm";
import { db } from "../index";
import { farmModels } from "../schema";

export async function getModels() {
  return db.query.farmModels.findMany({
    orderBy: [desc(farmModels.createdAt)],
  });
}

export async function getModelById(id: string) {
  return db.query.farmModels.findFirst({
    where: eq(farmModels.id, id),
  });
}

export async function createModel(data: {
  name: string;
  filename: string;
  filePath: string;
  fileFormat: "stl" | "3mf" | "obj" | "step";
  fileSizeBytes: number;
  description?: string;
  uploadedBy?: string;
}) {
  const [model] = await db.insert(farmModels).values(data).returning();
  return model;
}

export async function deleteModel(id: string) {
  await db.delete(farmModels).where(eq(farmModels.id, id));
}

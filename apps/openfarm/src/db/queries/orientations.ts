import { eq, and, desc } from "drizzle-orm";
import { db } from "../index";
import { farmOrientations } from "../schema";

export async function getOrientations(modelId: string, technology?: string) {
  const conditions = [eq(farmOrientations.modelId, modelId)];
  if (technology) {
    conditions.push(eq(farmOrientations.technology, technology as "fdm" | "sla" | "sls"));
  }

  return db.query.farmOrientations.findMany({
    where: and(...conditions),
    orderBy: [desc(farmOrientations.surfaceQualityScore)],
  });
}

export async function getSelectedOrientation(modelId: string, technology: string) {
  return db.query.farmOrientations.findFirst({
    where: and(
      eq(farmOrientations.modelId, modelId),
      eq(farmOrientations.technology, technology as "fdm" | "sla" | "sls"),
      eq(farmOrientations.isSelected, true)
    ),
  });
}

export async function saveOrientations(modelId: string, technology: string, orientations: Array<{
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  supportVolumeCm3?: number;
  printTimeEstimate?: number;
  surfaceQualityScore?: number;
  cosmeticSurfaces?: number[];
}>) {
  // Clear existing orientations for this model+technology
  await db.delete(farmOrientations).where(
    and(
      eq(farmOrientations.modelId, modelId),
      eq(farmOrientations.technology, technology as "fdm" | "sla" | "sls")
    )
  );

  if (orientations.length === 0) return [];

  const values = orientations.map((o, i) => ({
    modelId,
    technology: technology as "fdm" | "sla" | "sls",
    rotationX: o.rotationX,
    rotationY: o.rotationY,
    rotationZ: o.rotationZ,
    supportVolumeCm3: o.supportVolumeCm3 ?? null,
    printTimeEstimate: o.printTimeEstimate ?? null,
    surfaceQualityScore: o.surfaceQualityScore ?? null,
    isSelected: i === 0, // Auto-select best orientation
    cosmeticSurfaces: o.cosmeticSurfaces ?? null,
  }));

  return db.insert(farmOrientations).values(values).returning();
}

export async function selectOrientation(orientationId: string, modelId: string, technology: string) {
  // Deselect all for this model+technology
  await db.update(farmOrientations)
    .set({ isSelected: false })
    .where(
      and(
        eq(farmOrientations.modelId, modelId),
        eq(farmOrientations.technology, technology as "fdm" | "sla" | "sls")
      )
    );

  // Select the specified one
  const [selected] = await db.update(farmOrientations)
    .set({ isSelected: true })
    .where(eq(farmOrientations.id, orientationId))
    .returning();

  return selected;
}

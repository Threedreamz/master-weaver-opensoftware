import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../index";
import { farmFeasibilityChecks, farmModels } from "../schema";

export async function getFeasibilityChecks(modelId: string) {
  return db.query.farmFeasibilityChecks.findMany({
    where: eq(farmFeasibilityChecks.modelId, modelId),
    orderBy: [desc(farmFeasibilityChecks.overallScore)],
  });
}

export async function getFeasibilityByTechnology(modelId: string, technology: string) {
  return db.query.farmFeasibilityChecks.findFirst({
    where: and(
      eq(farmFeasibilityChecks.modelId, modelId),
      eq(farmFeasibilityChecks.technology, technology as "fdm" | "sla" | "sls")
    ),
  });
}

export async function saveFeasibilityCheck(data: {
  modelId: string;
  technology: string;
  overallScore: number;
  verdict: string;
  issues: unknown[];
  metrics: Record<string, unknown>;
  analysisVersion?: string;
}) {
  // Upsert: delete existing for same model+technology, then insert
  await db.delete(farmFeasibilityChecks).where(
    and(
      eq(farmFeasibilityChecks.modelId, data.modelId),
      eq(farmFeasibilityChecks.technology, data.technology as "fdm" | "sla" | "sls")
    )
  );

  const [check] = await db.insert(farmFeasibilityChecks).values({
    modelId: data.modelId,
    technology: data.technology as "fdm" | "sla" | "sls",
    overallScore: data.overallScore,
    verdict: data.verdict as "printable" | "printable_with_issues" | "needs_rework" | "needs_redesign",
    issues: data.issues as any,
    metrics: data.metrics,
    analysisVersion: data.analysisVersion ?? "1.0.0",
  }).returning();
  return check;
}

export async function updateModelMeshData(modelId: string, data: {
  meshAnalyzed: boolean;
  vertexCount?: number;
  isManifold?: boolean;
  surfaceAreaCm2?: number;
  volumeCm3?: number;
  triangleCount?: number;
  boundingBoxX?: number;
  boundingBoxY?: number;
  boundingBoxZ?: number;
}) {
  await db.update(farmModels).set({
    meshAnalyzed: data.meshAnalyzed,
    vertexCount: data.vertexCount,
    isManifold: data.isManifold,
    surfaceAreaCm2: data.surfaceAreaCm2,
    volumeCm3: data.volumeCm3,
    triangleCount: data.triangleCount,
    boundingBoxX: data.boundingBoxX,
    boundingBoxY: data.boundingBoxY,
    boundingBoxZ: data.boundingBoxZ,
    updatedAt: sql`(unixepoch())`,
  }).where(eq(farmModels.id, modelId));
}

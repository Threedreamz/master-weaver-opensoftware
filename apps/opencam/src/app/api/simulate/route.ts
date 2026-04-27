export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { SimulateBody } from "@/lib/api-contracts";
import { simulateRemoveVolume } from "@/lib/stock";
import type { BBox3, Polyline3 } from "@/lib/cam-kernel";

/**
 * POST /api/simulate
 *
 * M1 stock-removal stub — sums swept-cylinder volume across the requested
 * operations' cached toolpaths. Does NOT regenerate missing toolpaths; the
 * client is expected to have called /api/operations/[id]/generate first (the
 * postprocess route regenerates defensively, simulate doesn't because the
 * result of sim without a toolpath is useless — surface the warning instead).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const json = await req.json().catch(() => null);
  const parsed = SimulateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { projectId, operationIds } = parsed.data;

  // Ownership + load project.
  const [project] = await db
    .select()
    .from(schema.opencamProjects)
    .where(
      and(
        eq(schema.opencamProjects.id, projectId),
        eq(schema.opencamProjects.userId, userId),
        isNull(schema.opencamProjects.deletedAt),
      ),
    )
    .limit(1);
  if (!project) return NextResponse.json({ error: "project_not_found" }, { status: 404 });

  const stock: BBox3 = project.stockBboxJson
    ? { min: project.stockBboxJson.min, max: project.stockBboxJson.max }
    : { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };

  // Load ops scoped to project + caller's requested ids.
  const opRows = await db
    .select()
    .from(schema.opencamOperations)
    .where(
      and(
        eq(schema.opencamOperations.projectId, projectId),
        inArray(schema.opencamOperations.id, operationIds),
      ),
    );
  if (opRows.length === 0) {
    return NextResponse.json({ error: "no matching operations" }, { status: 404 });
  }

  const warnings: string[] = [];
  const toolpaths: { polylines: Polyline3[]; toolDiameterMm: number }[] = [];

  for (const op of opRows) {
    if (!op.toolpathJson) {
      warnings.push(`op ${op.id}: no cached toolpath — run /api/operations/${op.id}/generate first`);
      continue;
    }
    if (!op.toolId) {
      warnings.push(`op ${op.id}: missing toolId — skipped`);
      continue;
    }
    const [tool] = await db
      .select({ diameterMm: schema.opencamTools.diameterMm })
      .from(schema.opencamTools)
      .where(eq(schema.opencamTools.id, op.toolId))
      .limit(1);
    if (!tool) {
      warnings.push(`op ${op.id}: tool not found — skipped`);
      continue;
    }
    toolpaths.push({
      polylines: op.toolpathJson.polylines,
      toolDiameterMm: tool.diameterMm,
    });
  }

  const { removedVolumeMm3, finalBbox, frames } = simulateRemoveVolume(stock, toolpaths);

  return NextResponse.json({
    frames,
    finalBbox,
    removedVolumeMm3,
    warnings,
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { resolveUser } from "@/lib/internal-user";
import { db, schema } from "@/db";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { CreateOperationBody } from "@/lib/api-contracts";

function serializeOperation(row: typeof schema.opencamOperations.$inferSelect) {
  return {
    id: row.id,
    projectId: row.projectId,
    kind: row.kind,
    toolId: row.toolId ?? "",
    feedMmMin: row.feedMmMin,
    spindleRpm: row.spindleRpm,
    stepoverMm: row.stepoverMm ?? undefined,
    stepdownMm: row.stepdownMm ?? undefined,
    paramsJson: (row.paramsJson ?? {}) as Record<string, unknown>,
    sortOrder: row.sortOrder,
  };
}

/* GET /api/operations?projectId=... — list operations for caller-owned projects. */
export async function GET(req: NextRequest) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const userId = u.id;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") ?? undefined;

  // Join against opencamProjects to enforce ownership.
  const whereParts = [
    eq(schema.opencamProjects.userId, userId),
    isNull(schema.opencamProjects.deletedAt),
  ];
  if (projectId) whereParts.push(eq(schema.opencamOperations.projectId, projectId));

  const rows = await db
    .select({ op: schema.opencamOperations })
    .from(schema.opencamOperations)
    .innerJoin(
      schema.opencamProjects,
      eq(schema.opencamProjects.id, schema.opencamOperations.projectId),
    )
    .where(and(...whereParts))
    .orderBy(asc(schema.opencamOperations.projectId), asc(schema.opencamOperations.sortOrder));

  return NextResponse.json({ items: rows.map((r) => serializeOperation(r.op)) });
}

/* POST /api/operations — create an operation against a caller-owned project. */
export async function POST(req: NextRequest) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const userId = u.id;

  const json = await req.json().catch(() => null);
  const parsed = CreateOperationBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { projectId, operation } = parsed.data;

  // Ownership check.
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

  // Compute next sortOrder.
  const [{ maxOrder } = { maxOrder: -1 }] = await db
    .select({ maxOrder: sql<number>`COALESCE(MAX(${schema.opencamOperations.sortOrder}), -1)` })
    .from(schema.opencamOperations)
    .where(eq(schema.opencamOperations.projectId, projectId));
  const nextOrder = Number(maxOrder ?? -1) + 1;

  const [row] = await db
    .insert(schema.opencamOperations)
    .values({
      projectId,
      kind: operation.kind,
      toolId: operation.toolId,
      feedMmMin: operation.feedMmMin,
      spindleRpm: operation.spindleRpm,
      stepoverMm: operation.stepoverMm ?? null,
      stepdownMm: operation.stepdownMm ?? null,
      paramsJson: operation.paramsJson ?? {},
      sortOrder: nextOrder,
    })
    .returning();

  return NextResponse.json(serializeOperation(row), { status: 201 });
}

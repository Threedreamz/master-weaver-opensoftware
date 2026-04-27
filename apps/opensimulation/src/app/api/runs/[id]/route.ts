export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { and, eq, isNull } from "drizzle-orm";
import { requireSessionOrApiKey } from "@/lib/auth-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

/* GET /api/runs/[id] — full run detail (inputJson + resultJson expanded) */
export async function GET(req: NextRequest, ctx: RouteCtx) {
  const auth = await requireSessionOrApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  // Join against projects to enforce ownership — runs inherit user scope via
  // their project.userId. Soft-deleted projects hide their runs.
  const [row] = await db
    .select({
      id: schema.opensimulationRuns.id,
      projectId: schema.opensimulationRuns.projectId,
      domain: schema.opensimulationRuns.domain,
      status: schema.opensimulationRuns.status,
      triggeredBy: schema.opensimulationRuns.triggeredBy,
      durationMs: schema.opensimulationRuns.durationMs,
      createdAt: schema.opensimulationRuns.createdAt,
      inputJson: schema.opensimulationRuns.inputJson,
      resultJson: schema.opensimulationRuns.resultJson,
      errorMessage: schema.opensimulationRuns.errorMessage,
      ownerId: schema.opensimulationProjects.userId,
      deletedAt: schema.opensimulationProjects.deletedAt,
    })
    .from(schema.opensimulationRuns)
    .innerJoin(
      schema.opensimulationProjects,
      eq(schema.opensimulationProjects.id, schema.opensimulationRuns.projectId),
    )
    .where(
      and(
        eq(schema.opensimulationRuns.id, id),
        eq(schema.opensimulationProjects.userId, auth.userId),
        isNull(schema.opensimulationProjects.deletedAt),
      ),
    )
    .limit(1);

  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    id: row.id,
    projectId: row.projectId,
    domain: row.domain,
    status: row.status,
    triggeredBy: row.triggeredBy,
    durationMs: row.durationMs,
    createdAt: new Date(row.createdAt).toISOString(),
    inputJson: row.inputJson,
    resultJson: row.resultJson ?? null,
    errorMessage: row.errorMessage ?? null,
  });
}

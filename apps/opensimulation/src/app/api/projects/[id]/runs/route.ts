export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { requireSessionOrApiKey } from "@/lib/auth-helpers";
import { ListRunsQuery } from "@/lib/api-contracts";

type RouteCtx = { params: Promise<{ id: string }> };

/* GET /api/projects/[id]/runs — list runs for a project */
export async function GET(req: NextRequest, ctx: RouteCtx) {
  const auth = await requireSessionOrApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { id: projectId } = await ctx.params;

  // Ensure the project belongs to the caller (and is not soft-deleted) before
  // exposing its runs.
  const [owner] = await db
    .select({ id: schema.opensimulationProjects.id })
    .from(schema.opensimulationProjects)
    .where(
      and(
        eq(schema.opensimulationProjects.id, projectId),
        eq(schema.opensimulationProjects.userId, auth.userId),
        isNull(schema.opensimulationProjects.deletedAt),
      ),
    )
    .limit(1);
  if (!owner) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const parsed = ListRunsQuery.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    domain: searchParams.get("domain") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { limit, cursor, domain } = parsed.data;

  const whereParts = [eq(schema.opensimulationRuns.projectId, projectId)];
  if (domain) {
    // Accept any of the domain enum values; silently ignore junk so the list
    // comes back empty rather than 400.
    whereParts.push(
      eq(
        schema.opensimulationRuns.domain,
        domain as "kinematic-fwd" | "kinematic-ik" | "fea-static" | "thermal-steady" | "cleaning",
      ),
    );
  }
  if (cursor) {
    const cursorDate = new Date(cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      whereParts.push(
        sql`${schema.opensimulationRuns.createdAt} < ${Math.floor(cursorDate.getTime() / 1000)}`,
      );
    }
  }

  const rows = await db
    .select({
      id: schema.opensimulationRuns.id,
      projectId: schema.opensimulationRuns.projectId,
      domain: schema.opensimulationRuns.domain,
      status: schema.opensimulationRuns.status,
      triggeredBy: schema.opensimulationRuns.triggeredBy,
      durationMs: schema.opensimulationRuns.durationMs,
      createdAt: schema.opensimulationRuns.createdAt,
    })
    .from(schema.opensimulationRuns)
    .where(and(...whereParts))
    .orderBy(desc(schema.opensimulationRuns.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const items = pageRows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    domain: row.domain,
    status: row.status,
    triggeredBy: row.triggeredBy,
    durationMs: row.durationMs,
    createdAt: new Date(row.createdAt).toISOString(),
  }));

  const nextCursor = hasMore
    ? new Date(pageRows[pageRows.length - 1].createdAt).toISOString()
    : null;

  return NextResponse.json({ items, nextCursor });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import { requireSessionOrApiKey } from "@/lib/auth-helpers";
import { PatchProjectBody } from "@/lib/api-contracts";

type RouteCtx = { params: Promise<{ id: string }> };

async function loadProjectSummary(projectId: string, userId: string) {
  const [row] = await db
    .select()
    .from(schema.opensimulationProjects)
    .where(
      and(
        eq(schema.opensimulationProjects.id, projectId),
        eq(schema.opensimulationProjects.userId, userId),
        isNull(schema.opensimulationProjects.deletedAt),
      ),
    )
    .limit(1);
  if (!row) return null;

  const [{ count } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.opensimulationRuns)
    .where(eq(schema.opensimulationRuns.projectId, projectId));

  return {
    id: row.id,
    name: row.name,
    ownerId: row.userId,
    description: row.description ?? null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    runsCount: Number(count ?? 0),
  };
}

/* GET /api/projects/[id] */
export async function GET(req: NextRequest, ctx: RouteCtx) {
  const auth = await requireSessionOrApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const summary = await loadProjectSummary(id, auth.userId);
  if (!summary) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(summary);
}

/* PATCH /api/projects/[id] */
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const auth = await requireSessionOrApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const json = await req.json().catch(() => null);
  const parsed = PatchProjectBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;

  const result = await db
    .update(schema.opensimulationProjects)
    .set(patch)
    .where(
      and(
        eq(schema.opensimulationProjects.id, id),
        eq(schema.opensimulationProjects.userId, auth.userId),
        isNull(schema.opensimulationProjects.deletedAt),
      ),
    )
    .returning({ id: schema.opensimulationProjects.id });

  if (result.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const summary = await loadProjectSummary(id, auth.userId);
  if (!summary) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(summary);
}

/* DELETE /api/projects/[id] — soft delete */
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const auth = await requireSessionOrApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const result = await db
    .update(schema.opensimulationProjects)
    .set({ deletedAt: sql`(unixepoch())` as unknown as Date })
    .where(
      and(
        eq(schema.opensimulationProjects.id, id),
        eq(schema.opensimulationProjects.userId, auth.userId),
        isNull(schema.opensimulationProjects.deletedAt),
      ),
    )
    .returning({ id: schema.opensimulationProjects.id });

  if (result.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

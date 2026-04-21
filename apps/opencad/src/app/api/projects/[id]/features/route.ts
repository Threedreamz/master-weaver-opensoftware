export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { CreateFeatureBody } from "@/lib/api-contracts";
import { resolveUser } from "@/lib/internal-user";

type RouteCtx = { params: Promise<{ id: string }> };

async function assertProjectOwner(projectId: string, userId: string) {
  const [row] = await db
    .select({ id: schema.opencadProjects.id })
    .from(schema.opencadProjects)
    .where(
      and(
        eq(schema.opencadProjects.id, projectId),
        eq(schema.opencadProjects.userId, userId),
        isNull(schema.opencadProjects.deletedAt),
      ),
    )
    .limit(1);
  return !!row;
}

function serializeFeature(row: typeof schema.opencadFeatures.$inferSelect) {
  return {
    id: row.id,
    projectId: row.projectId,
    kind: row.kind,
    paramsJson: row.paramsJson ?? {},
    parentIds: row.parentIds ?? [],
    order: row.order,
    outputGeometryHash: row.outputGeometryHash ?? null,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

/* GET /api/projects/[id]/features */
export async function GET(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const { id: projectId } = await ctx.params;

  if (!(await assertProjectOwner(projectId, u.id))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(schema.opencadFeatures)
    .where(eq(schema.opencadFeatures.projectId, projectId))
    .orderBy(asc(schema.opencadFeatures.order));

  return NextResponse.json({ items: rows.map(serializeFeature) });
}

/* POST /api/projects/[id]/features */
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const { id: projectId } = await ctx.params;

  if (!(await assertProjectOwner(projectId, u.id))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = CreateFeatureBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let order = parsed.data.order;
  if (order === undefined) {
    const [{ maxOrder } = { maxOrder: null }] = await db
      .select({ maxOrder: sql<number | null>`max(${schema.opencadFeatures.order})` })
      .from(schema.opencadFeatures)
      .where(eq(schema.opencadFeatures.projectId, projectId));
    order = (maxOrder ?? -1) + 1;
  }

  const [inserted] = await db
    .insert(schema.opencadFeatures)
    .values({
      projectId,
      kind: parsed.data.kind,
      paramsJson: parsed.data.paramsJson,
      parentIds: parsed.data.parentIds,
      order,
    })
    .returning();

  await db
    .update(schema.opencadProjects)
    .set({ updatedAt: new Date() })
    .where(eq(schema.opencadProjects.id, projectId));

  return NextResponse.json(serializeFeature(inserted), { status: 201 });
}

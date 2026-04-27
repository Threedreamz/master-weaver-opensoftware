export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { and, asc, eq, isNull } from "drizzle-orm";
import { CreateSketchBody } from "@/lib/api-contracts";
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

function serializeSketch(row: typeof schema.opencadSketches.$inferSelect) {
  return {
    id: row.id,
    projectId: row.projectId,
    planeRef: row.planeRef,
    entitiesJson: row.entitiesJson ?? [],
    constraintsJson: row.constraintsJson ?? [],
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

/* GET /api/projects/[id]/sketches */
export async function GET(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const { id: projectId } = await ctx.params;

  if (!(await assertProjectOwner(projectId, u.id))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(schema.opencadSketches)
    .where(eq(schema.opencadSketches.projectId, projectId))
    .orderBy(asc(schema.opencadSketches.createdAt));

  return NextResponse.json({ items: rows.map(serializeSketch) });
}

/* POST /api/projects/[id]/sketches */
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const { id: projectId } = await ctx.params;

  if (!(await assertProjectOwner(projectId, u.id))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = CreateSketchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [inserted] = await db
    .insert(schema.opencadSketches)
    .values({
      projectId,
      planeRef: parsed.data.planeRef,
      entitiesJson: parsed.data.entitiesJson,
      constraintsJson: parsed.data.constraintsJson,
    })
    .returning();

  await db
    .update(schema.opencadProjects)
    .set({ updatedAt: new Date() })
    .where(eq(schema.opencadProjects.id, projectId));

  return NextResponse.json(serializeSketch(inserted), { status: 201 });
}

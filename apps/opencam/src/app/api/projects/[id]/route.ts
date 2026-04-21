export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import { PatchProjectBody } from "@/lib/api-contracts";

type RouteCtx = { params: Promise<{ id: string }> };

async function loadProjectDetail(projectId: string, userId: string) {
  const [row] = await db
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
  if (!row) return null;

  const [{ count } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.opencamOperations)
    .where(eq(schema.opencamOperations.projectId, projectId));

  return {
    id: row.id,
    name: row.name,
    userId: row.userId,
    stockBbox: row.stockBboxJson
      ? { min: row.stockBboxJson.min, max: row.stockBboxJson.max }
      : null,
    linkedOpencadProjectId: row.linkedOpencadProjectId ?? null,
    linkedOpencadVersionId: row.linkedOpencadVersionId ?? null,
    operationCount: Number(count ?? 0),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    description: row.description ?? null,
    material: row.stockBboxJson?.material ?? null,
  };
}

/* GET /api/projects/[id] */
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await ctx.params;

  const detail = await loadProjectDetail(id, userId);
  if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(detail);
}

/* PATCH /api/projects/[id] */
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await ctx.params;

  const json = await req.json().catch(() => null);
  const parsed = PatchProjectBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Load existing row to merge stockBbox / material into the single JSON column.
  const [existing] = await db
    .select()
    .from(schema.opencamProjects)
    .where(
      and(
        eq(schema.opencamProjects.id, id),
        eq(schema.opencamProjects.userId, userId),
        isNull(schema.opencamProjects.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;

  const nextStock =
    parsed.data.stockBbox !== undefined || parsed.data.material !== undefined
      ? (() => {
          const base = existing.stockBboxJson ?? null;
          const bbox = parsed.data.stockBbox ?? (base ? { min: base.min, max: base.max } : null);
          if (!bbox) return null;
          const material =
            parsed.data.material !== undefined ? parsed.data.material : base?.material;
          return {
            min: bbox.min,
            max: bbox.max,
            ...(material ? { material } : {}),
          };
        })()
      : undefined;
  if (nextStock !== undefined) patch.stockBboxJson = nextStock;

  await db
    .update(schema.opencamProjects)
    .set(patch)
    .where(
      and(
        eq(schema.opencamProjects.id, id),
        eq(schema.opencamProjects.userId, userId),
        isNull(schema.opencamProjects.deletedAt),
      ),
    );

  const detail = await loadProjectDetail(id, userId);
  if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(detail);
}

/* DELETE /api/projects/[id] — soft delete. */
export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await ctx.params;

  const result = await db
    .update(schema.opencamProjects)
    .set({ deletedAt: sql`(unixepoch())` as unknown as Date })
    .where(
      and(
        eq(schema.opencamProjects.id, id),
        eq(schema.opencamProjects.userId, userId),
        isNull(schema.opencamProjects.deletedAt),
      ),
    )
    .returning({ id: schema.opencamProjects.id });

  if (result.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, id });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { and, desc, eq, isNull, like, sql } from "drizzle-orm";
import {
  ListProjectsQuery,
  CreateProjectBody,
} from "@/lib/api-contracts";

/* GET /api/projects — list the caller's opencam projects (not-deleted only). */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const { searchParams } = new URL(req.url);
  const parsed = ListProjectsQuery.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { limit, cursor, search } = parsed.data;

  const whereParts = [
    eq(schema.opencamProjects.userId, userId),
    isNull(schema.opencamProjects.deletedAt),
  ];
  if (search) whereParts.push(like(schema.opencamProjects.name, `%${search}%`));
  if (cursor) {
    // Cursor = ISO timestamp of the last updatedAt seen (descending pagination).
    const cursorDate = new Date(cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      whereParts.push(
        sql`${schema.opencamProjects.updatedAt} < ${Math.floor(cursorDate.getTime() / 1000)}`,
      );
    }
  }

  const rows = await db
    .select()
    .from(schema.opencamProjects)
    .where(and(...whereParts))
    .orderBy(desc(schema.opencamProjects.updatedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const items = await Promise.all(
    pageRows.map(async (row) => {
      const [{ count } = { count: 0 }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.opencamOperations)
        .where(eq(schema.opencamOperations.projectId, row.id));
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
      };
    }),
  );

  const nextCursor = hasMore
    ? new Date(pageRows[pageRows.length - 1].updatedAt).toISOString()
    : null;

  return NextResponse.json({ items, nextCursor });
}

/* POST /api/projects — create a new opencam project owned by the caller. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const json = await req.json().catch(() => null);
  const parsed = CreateProjectBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { name, description, stockBbox, material } = parsed.data;

  const stockBboxJson = stockBbox
    ? { min: stockBbox.min, max: stockBbox.max, ...(material ? { material } : {}) }
    : null;

  const [project] = await db
    .insert(schema.opencamProjects)
    .values({
      userId,
      name,
      description: description ?? null,
      stockBboxJson,
    })
    .returning();

  return NextResponse.json(
    {
      id: project.id,
      name: project.name,
      userId: project.userId,
      stockBbox: project.stockBboxJson
        ? { min: project.stockBboxJson.min, max: project.stockBboxJson.max }
        : null,
      linkedOpencadProjectId: project.linkedOpencadProjectId ?? null,
      linkedOpencadVersionId: project.linkedOpencadVersionId ?? null,
      operationCount: 0,
      createdAt: new Date(project.createdAt).toISOString(),
      updatedAt: new Date(project.updatedAt).toISOString(),
    },
    { status: 201 },
  );
}

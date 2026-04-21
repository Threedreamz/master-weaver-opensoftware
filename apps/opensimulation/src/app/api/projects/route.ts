export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { and, desc, eq, isNull, like, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth-helpers";
import {
  ListProjectsQuery,
  CreateProjectBody,
} from "@/lib/api-contracts";

/* GET /api/projects — list current user's projects (paginated by createdAt cursor) */
export async function GET(req: NextRequest) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = s.userId;

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
    eq(schema.opensimulationProjects.userId, userId),
    isNull(schema.opensimulationProjects.deletedAt),
  ];
  if (search) whereParts.push(like(schema.opensimulationProjects.name, `%${search}%`));
  if (cursor) {
    const cursorDate = new Date(cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      whereParts.push(
        sql`${schema.opensimulationProjects.createdAt} < ${Math.floor(cursorDate.getTime() / 1000)}`,
      );
    }
  }

  const rows = await db
    .select({
      id: schema.opensimulationProjects.id,
      name: schema.opensimulationProjects.name,
      description: schema.opensimulationProjects.description,
      ownerId: schema.opensimulationProjects.userId,
      createdAt: schema.opensimulationProjects.createdAt,
      updatedAt: schema.opensimulationProjects.updatedAt,
    })
    .from(schema.opensimulationProjects)
    .where(and(...whereParts))
    .orderBy(desc(schema.opensimulationProjects.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const items = await Promise.all(
    pageRows.map(async (row) => {
      const [{ count } = { count: 0 }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.opensimulationRuns)
        .where(eq(schema.opensimulationRuns.projectId, row.id));

      return {
        id: row.id,
        name: row.name,
        ownerId: row.ownerId,
        description: row.description ?? null,
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
        runsCount: Number(count ?? 0),
      };
    }),
  );

  const nextCursor = hasMore
    ? new Date(pageRows[pageRows.length - 1].createdAt).toISOString()
    : null;

  return NextResponse.json({ items, nextCursor });
}

/* POST /api/projects — create a new simulation project */
export async function POST(req: NextRequest) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = s.userId;

  const json = await req.json().catch(() => null);
  const parsed = CreateProjectBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { name, description } = parsed.data;

  const [project] = await db
    .insert(schema.opensimulationProjects)
    .values({ userId, name, description: description ?? null })
    .returning();

  return NextResponse.json(
    {
      id: project.id,
      name: project.name,
      ownerId: project.userId,
      description: project.description ?? null,
      createdAt: new Date(project.createdAt).toISOString(),
      updatedAt: new Date(project.updatedAt).toISOString(),
      runsCount: 0,
    },
    { status: 201 },
  );
}

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

/* GET /api/projects — list user's projects (pagination + search) */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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

  // Build where-clause: userId + not-deleted + optional search + optional cursor
  const whereParts = [
    eq(schema.opencadProjects.userId, userId),
    isNull(schema.opencadProjects.deletedAt),
  ];
  if (search) whereParts.push(like(schema.opencadProjects.name, `%${search}%`));
  if (cursor) {
    // cursor = ISO timestamp of the last createdAt seen (descending pagination)
    const cursorDate = new Date(cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      whereParts.push(sql`${schema.opencadProjects.createdAt} < ${Math.floor(cursorDate.getTime() / 1000)}`);
    }
  }

  const rows = await db
    .select({
      id: schema.opencadProjects.id,
      name: schema.opencadProjects.name,
      ownerId: schema.opencadProjects.userId,
      createdAt: schema.opencadProjects.createdAt,
      updatedAt: schema.opencadProjects.updatedAt,
    })
    .from(schema.opencadProjects)
    .where(and(...whereParts))
    .orderBy(desc(schema.opencadProjects.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  // feature counts + current version per project
  const items = await Promise.all(
    pageRows.map(async (row) => {
      const [{ count } = { count: 0 }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.opencadFeatures)
        .where(eq(schema.opencadFeatures.projectId, row.id));

      const [latest] = await db
        .select({ id: schema.opencadProjectVersions.id, thumb: schema.opencadProjectVersions.thumbnailUrl })
        .from(schema.opencadProjectVersions)
        .where(eq(schema.opencadProjectVersions.projectId, row.id))
        .orderBy(desc(schema.opencadProjectVersions.version))
        .limit(1);

      return {
        id: row.id,
        name: row.name,
        ownerId: row.ownerId,
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
        thumbnailUrl: latest?.thumb ?? null,
        currentVersionId: latest?.id ?? null,
        featureCount: Number(count ?? 0),
      };
    }),
  );

  const nextCursor = hasMore
    ? new Date(pageRows[pageRows.length - 1].createdAt).toISOString()
    : null;

  return NextResponse.json({ items, nextCursor });
}

/* POST /api/projects — create new project + initial version */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
  const { name, description } = parsed.data;

  const [project] = await db
    .insert(schema.opencadProjects)
    .values({ userId, name, description: description ?? null })
    .returning();

  const [version] = await db
    .insert(schema.opencadProjectVersions)
    .values({
      projectId: project.id,
      version: 1,
      label: "Initial",
      featureTreeJson: { root: [] },
      parentVersionId: null,
    })
    .returning();

  return NextResponse.json(
    {
      id: project.id,
      name: project.name,
      ownerId: project.userId,
      createdAt: new Date(project.createdAt).toISOString(),
      updatedAt: new Date(project.updatedAt).toISOString(),
      thumbnailUrl: null,
      currentVersionId: version.id,
      featureCount: 0,
    },
    { status: 201 },
  );
}
